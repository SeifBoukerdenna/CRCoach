import asyncio
import json
from typing import Dict, List, Optional
from core.logging import setup_logging
from core.config import settings
from core.exceptions import SessionNotFoundException, SessionFullException
from models.session import WebRTCSession, SessionStats
from models.connection import Connection, ConnectionRole
from models.message import WebRTCMessage, MessageType
from services.connection_manager import ConnectionManager

logger = setup_logging(settings.debug)

class SessionManager:
    """Manages WebRTC sessions and message routing"""

    def __init__(self, connection_manager: ConnectionManager):
        self.sessions: Dict[str, WebRTCSession] = {}
        self.connection_manager = connection_manager

    def create_session(self, session_code: str) -> WebRTCSession:
        """Create new WebRTC session"""
        if session_code in self.sessions:
            return self.sessions[session_code]

        session = WebRTCSession(
            session_code=session_code,
            max_viewers=settings.max_viewers_per_session
        )

        self.sessions[session_code] = session
        logger.info(f"🆕 Created session {session_code}")
        return session

    def get_session(self, session_code: str) -> Optional[WebRTCSession]:
        """Get existing session"""
        return self.sessions.get(session_code)

    async def join_session(self, session_code: str, connection: Connection) -> bool:
        """Add connection to session"""
        session = self.sessions.get(session_code)
        if not session:
            session = self.create_session(session_code)

        session.connection_attempts += 1

        # Add connection based on role
        if connection.role == ConnectionRole.BROADCASTER:
            if session.broadcaster:
                # Disconnect existing broadcaster
                await self._disconnect_broadcaster(session)

            success = session.add_broadcaster(connection)
            if success:
                logger.info(f"📡✅ Broadcaster {connection.id} joined session {session_code}")

        elif connection.role == ConnectionRole.VIEWER:
            success = session.add_viewer(connection)
            if not success:
                raise SessionFullException(f"Session {session_code} is at capacity")

            logger.info(f"👁️✅ Viewer {connection.id} joined session {session_code} ({len(session.viewers)}/{session.max_viewers})")

        return success

    async def leave_session(self, session_code: str, connection: Connection):
        """Remove connection from session"""
        session = self.sessions.get(session_code)
        if not session:
            return

        if connection.role == ConnectionRole.BROADCASTER and session.broadcaster and session.broadcaster.id == connection.id:
            await self._disconnect_broadcaster(session)
        elif connection.role == ConnectionRole.VIEWER:
            session.remove_viewer(connection.id)
            logger.info(f"👁️❌ Viewer {connection.id} left session {session_code}")

        # Clean up empty sessions
        if session.is_empty():
            self._remove_session(session_code)

    async def broadcast_message(self, session_code: str, message: WebRTCMessage, sender_connection: Connection):
        """Broadcast message within session"""
        session = self.sessions.get(session_code)
        if not session:
            return

        # Add session metadata
        message.session_code = session_code
        message.connection_id = sender_connection.id

        session.message_count += 1
        session.update_activity()

        # Track WebRTC establishment
        if message.type in [MessageType.OFFER, MessageType.ANSWER]:
            logger.info(f"🔄 WebRTC negotiation: {message.type} in session {session_code}")
            if message.type == MessageType.ANSWER:
                session.webrtc_established = True
                logger.info(f"✅ WebRTC established in session {session_code}")

        # Route message based on sender role
        if sender_connection.role == ConnectionRole.BROADCASTER:
            await self._broadcast_to_viewers(session, message)
        else:
            await self._send_to_broadcaster(session, message)

    async def _broadcast_to_viewers(self, session: WebRTCSession, message: WebRTCMessage):
        """Send message to all viewers in session"""
        if not session.viewers:
            return

        message_dict = message.dict()
        success_count = 0
        failed_viewers = []

        for viewer_id, viewer in session.viewers.items():
            success = await self.connection_manager.send_message(viewer_id, message_dict)
            if success:
                viewer.metrics.messages_sent += 1
                success_count += 1
            else:
                failed_viewers.append(viewer_id)

        # Clean up failed connections
        for viewer_id in failed_viewers:
            session.remove_viewer(viewer_id)

        if session.viewers:
            logger.info(f"📤 Forwarded {message.type} to {success_count}/{len(session.viewers)} viewers in session {session.session_code}")

    async def _send_to_broadcaster(self, session: WebRTCSession, message: WebRTCMessage):
        """Send message to broadcaster in session"""
        if not session.broadcaster:
            return

        message_dict = message.dict()
        success = await self.connection_manager.send_message(session.broadcaster.id, message_dict)

        if success:
            session.broadcaster.metrics.messages_sent += 1
            logger.info(f"📤 Forwarded {message.type} to broadcaster in session {session.session_code}")
        else:
            # Broadcaster connection failed, remove it
            await self._disconnect_broadcaster(session)

    async def _disconnect_broadcaster(self, session: WebRTCSession):
        """Disconnect broadcaster and notify viewers"""
        if not session.broadcaster:
            return

        broadcaster = session.remove_broadcaster()
        if broadcaster:
            await self.connection_manager.disconnect(broadcaster)

        # Notify all viewers
        disconnect_msg = WebRTCMessage(
            type=MessageType.BROADCASTER_DISCONNECTED,
            session_code=session.session_code
        )

        await self._broadcast_to_viewers(session, disconnect_msg)
        logger.info(f"📡❌ Broadcaster disconnected from session {session.session_code}")

    def _remove_session(self, session_code: str):
        """Remove empty session"""
        if session_code in self.sessions:
            del self.sessions[session_code]
            logger.info(f"🗑️ Session {session_code} removed (empty)")

    def cleanup_expired_sessions(self):
        """Remove expired sessions"""
        expired_sessions = [
            code for code, session in self.sessions.items()
            if session.is_expired(settings.session_timeout_minutes)
        ]

        for session_code in expired_sessions:
            self._remove_session(session_code)

        if expired_sessions:
            logger.info(f"🧹 Cleaned up {len(expired_sessions)} expired sessions")

    def get_all_stats(self) -> List[SessionStats]:
        """Get statistics for all sessions"""
        return [session.get_stats() for session in self.sessions.values()]

    def get_global_stats(self) -> dict:
        """Get global server statistics"""
        total_broadcasters = sum(1 for s in self.sessions.values() if s.broadcaster)
        total_viewers = sum(len(s.viewers) for s in self.sessions.values())
        webrtc_established = sum(1 for s in self.sessions.values() if s.webrtc_established)

        return {
            'total_sessions': len(self.sessions),
            'active_sessions': len([s for s in self.sessions.values() if not s.is_empty()]),
            'total_broadcasters': total_broadcasters,
            'total_viewers': total_viewers,
            'webrtc_established': webrtc_established,
            'total_connections': len(self.connection_manager.active_connections)
        }