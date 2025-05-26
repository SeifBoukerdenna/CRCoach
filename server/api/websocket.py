import json
from fastapi import WebSocket, WebSocketDisconnect
from core.logging import setup_logging
from core.config import settings
from core.exceptions import *
from models.connection import Connection, ConnectionRole
from models.message import WebRTCMessage, MessageType, ConnectMessage, SignalingMessage
from services.session_manager import SessionManager
from services.connection_manager import ConnectionManager
from utils.validators import validate_session_code, validate_message

logger = setup_logging(settings.debug)

class WebSocketHandler:
    """Handles WebSocket connections and message routing"""

    def __init__(self, session_manager: SessionManager, connection_manager: ConnectionManager):
        self.session_manager = session_manager
        self.connection_manager = connection_manager

    async def handle_connection(self, websocket: WebSocket, session_code: str):
        """Handle new WebSocket connection"""

        # Validate session code
        if not validate_session_code(session_code):
            await websocket.close(code=1003, reason="Invalid session code")
            return

        # Create connection object
        connection = Connection(
            role=ConnectionRole.VIEWER,  # Default, will be updated on connect message
            session_code=session_code,
            client_ip=websocket.client.host,
            user_agent=websocket.headers.get("user-agent")
        )

        try:
            # Establish WebSocket connection
            await self.connection_manager.connect(websocket, connection)

            # Handle messages
            await self._message_loop(websocket, connection)

        except WebSocketDisconnect:
            logger.info(f"🔌❌ WebSocket disconnected: {connection.id}")
        except Exception as e:
            logger.error(f"❌ WebSocket error for {connection.id}: {e}")
        finally:
            # Cleanup
            await self._cleanup_connection(connection)

    async def _message_loop(self, websocket: WebSocket, connection: Connection):
        """Main message handling loop"""

        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                raw_message = json.loads(data)

                # Validate message format
                if not validate_message(raw_message):
                    await self._send_error(websocket, "Invalid message format")
                    continue

                # Check rate limits
                if not self.connection_manager.check_rate_limit(connection):
                    await self._send_error(websocket, "Rate limit exceeded")
                    continue

                # Update connection activity
                connection.update_activity()
                connection.metrics.messages_received += 1

                # Handle message by type
                await self._handle_message(websocket, connection, raw_message)

            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await self._send_error(websocket, "Invalid JSON format")
            except Exception as e:
                logger.error(f"❌ Error handling message from {connection.id}: {e}")
                await self._send_error(websocket, "Internal server error")

    async def _handle_message(self, websocket: WebSocket, connection: Connection, raw_message: dict):
        """Handle specific message types"""

        message_type = raw_message.get('type')
        logger.info(f"📨 Received {message_type} from {connection.role} ({connection.id})")

        if message_type == 'connect':
            await self._handle_connect(websocket, connection, raw_message)

        elif message_type in ['offer', 'answer', 'ice']:
            await self._handle_signaling(connection, raw_message)

        elif message_type == 'ping':
            await self._handle_ping(websocket, connection)

        else:
            await self._send_error(websocket, f"Unknown message type: {message_type}")

    async def _handle_connect(self, websocket: WebSocket, connection: Connection, raw_message: dict):
        """Handle connection request"""

        try:
            connect_msg = ConnectMessage(**raw_message)
        except Exception as e:
            await self._send_error(websocket, f"Invalid connect message: {e}")
            return

        # Update connection role and session
        connection.role = connect_msg.role
        connection.session_code = connect_msg.session_code or connection.session_code
        connection.metadata.update(connect_msg.metadata)

        try:
            # Join session
            await self.session_manager.join_session(connection.session_code, connection)

            # Send connection confirmation
            session = self.session_manager.get_session(connection.session_code)
            response = {
                'type': 'connected',
                'sessionCode': connection.session_code,
                'role': connection.role,
                'viewerCount': len(session.viewers) if session else 0,
                'maxViewers': session.max_viewers if session else 0,
                'timestamp': connection.connected_at.isoformat(),
                'connectionId': connection.id
            }

            await websocket.send_text(json.dumps(response))
            logger.info(f"✅ {connection.role} ({connection.id}) connected to session {connection.session_code}")

        except SessionFullException:
            await self._send_error(websocket, "Session is at capacity")
        except Exception as e:
            await self._send_error(websocket, f"Failed to join session: {e}")

    async def _handle_signaling(self, connection: Connection, raw_message: dict):
        """Handle WebRTC signaling messages"""

        if not connection.session_code:
            return

        try:
            # Create signaling message
            signaling_msg = SignalingMessage(**raw_message)

            # Broadcast message (critical: immediate forwarding for WebRTC)
            await self.session_manager.broadcast_message(
                connection.session_code,
                signaling_msg,
                connection
            )

        except Exception as e:
            logger.error(f"❌ Error handling signaling message: {e}")

    async def _handle_ping(self, websocket: WebSocket, connection: Connection):
        """Handle ping message"""
        connection.metrics.last_ping = connection.last_activity

        pong_message = {
            'type': 'pong',
            'timestamp': connection.last_activity.isoformat(),
            'connectionId': connection.id
        }

        await websocket.send_text(json.dumps(pong_message))

    async def _send_error(self, websocket: WebSocket, message: str):
        """Send error message to client"""
        error_msg = {
            'type': 'error',
            'message': message,
            'timestamp': datetime.now().isoformat()
        }

        try:
            await websocket.send_text(json.dumps(error_msg))
        except:
            pass  # Connection might be closed

    async def _cleanup_connection(self, connection: Connection):
        """Cleanup connection resources"""
        try:
            # Leave session
            if connection.session_code:
                await self.session_manager.leave_session(connection.session_code, connection)

            # Disconnect from connection manager
            await self.connection_manager.disconnect(connection)

        except Exception as e:
            logger.error(f"❌ Error during connection cleanup: {e}")
