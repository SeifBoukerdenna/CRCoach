import json
import uuid
from fastapi import WebSocket, WebSocketDisconnect
from handlers.websocket_handlers import (
    handle_connect,
    handle_signaling,
    handle_ping,
    handle_disconnect,
    send_error
)
from api.routes import session_manager

async def websocket_endpoint(websocket: WebSocket, session_code: str):
    """Debug WebSocket handler with detailed logging"""
    await websocket.accept()

    connection_id = str(uuid.uuid4())[:8]
    websocket.connection_id = connection_id
    websocket.is_alive = True
    websocket.messages_sent = 0

    current_session = None
    role = None

    print(f"🔌 New WebSocket connection (ID: {connection_id}) for session {session_code}")

    try:
        async for data in websocket.iter_text():
            websocket.is_alive = True

            try:
                msg = json.loads(data)

                # Rate limiting
                if websocket.messages_sent > 1000:
                    await send_error(websocket, 'Rate limit exceeded')
                    break

                print(f"📨 Received: {msg.get('type', 'unknown')} from {role or 'unknown'} ({connection_id})")

                message_type = msg.get('type')

                if message_type == 'connect':
                    current_session, role = await handle_connect(websocket, msg, session_manager)

                elif message_type in ['offer', 'answer', 'ice']:
                    await handle_signaling(current_session, websocket, msg)
                    websocket.messages_sent += 1

                elif message_type == 'ping':
                    await handle_ping(websocket)

                else:
                    print(f"❓ Unknown message type: {message_type} from {connection_id}")

            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error from {connection_id}: {e}")
                await send_error(websocket, 'Invalid JSON format')
            except Exception as e:
                print(f"❌ Error handling message from {connection_id}: {e}")
                await send_error(websocket, 'Internal server error')

    except WebSocketDisconnect:
        print(f"🔌❌ Connection {connection_id} disconnected normally")
    except Exception as e:
        print(f"❌ WebSocket error from {connection_id}: {e}")
    finally:
        # Clean up connection (called only once)
        print(f"🧹 Starting cleanup for connection {connection_id}")
        await handle_disconnect(current_session, websocket, session_manager)
        print(f"✅ Cleanup completed for connection {connection_id}")
