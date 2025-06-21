"""
server/services/user_session_manager.py - User Session Management
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Set
from dataclasses import dataclass

from models.auth_models import AuthenticatedUser, DiscordUser

logger = logging.getLogger(__name__)


@dataclass
class UserSession:
    """User session data"""
    user: AuthenticatedUser
    jwt_access_token: str
    jwt_refresh_token: str
    created_at: datetime
    last_active: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    def is_expired(self, timeout_minutes: int = 60) -> bool:
        """Check if session is expired due to inactivity"""
        return datetime.utcnow() - self.last_active > timedelta(minutes=timeout_minutes)

    def refresh_activity(self):
        """Update last activity timestamp"""
        self.last_active = datetime.utcnow()

    def to_dict(self) -> Dict:
        """Convert session to dictionary for API responses"""
        return {
            "user_id": self.user.discord_user.id,
            "username": self.user.discord_user.get_display_name(),
            "avatar_url": self.user.discord_user.get_avatar_url(),
            "is_in_required_guild": self.user.is_in_required_guild,
            "created_at": self.created_at.isoformat(),
            "last_active": self.last_active.isoformat(),
            "session_duration_minutes": int((datetime.utcnow() - self.created_at).total_seconds() / 60)
        }


class UserSessionManager:
    """Manages user authentication sessions"""

    def __init__(self):
        self.sessions: Dict[str, UserSession] = {}  # user_id -> session
        self.session_timeout_minutes = 60  # Session timeout
        self.cleanup_interval_minutes = 10  # Cleanup interval
        self._cleanup_task: Optional[asyncio.Task] = None

    def start_cleanup_task(self):
        """Start background cleanup task"""
        if not self._cleanup_task or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
            logger.info("🧹 Started user session cleanup task")

    def stop_cleanup_task(self):
        """Stop background cleanup task"""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            logger.info("🛑 Stopped user session cleanup task")

    async def _periodic_cleanup(self):
        """Periodic cleanup of expired sessions"""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval_minutes * 60)
                expired_count = self.cleanup_expired_sessions()
                if expired_count > 0:
                    logger.info(f"🧹 Cleaned up {expired_count} expired user sessions")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Error in session cleanup task: {e}")

    def create_session(
        self,
        auth_user: AuthenticatedUser,
        jwt_access_token: str,
        jwt_refresh_token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> UserSession:
        """Create a new user session"""
        session = UserSession(
            user=auth_user,
            jwt_access_token=jwt_access_token,
            jwt_refresh_token=jwt_refresh_token,
            created_at=datetime.utcnow(),
            last_active=datetime.utcnow(),
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Store session
        user_id = auth_user.discord_user.id
        if user_id in self.sessions:
            logger.info(f"🔄 Replacing existing session for user {auth_user.discord_user.get_display_name()}")

        self.sessions[user_id] = session

        logger.info(f"✅ Created session for user {auth_user.discord_user.get_display_name()}")
        return session

    def get_session(self, user_id: str) -> Optional[UserSession]:
        """Get user session by user ID"""
        session = self.sessions.get(user_id)

        if session and session.is_expired(self.session_timeout_minutes):
            logger.info(f"🕐 Session expired for user {session.user.discord_user.get_display_name()}")
            self.remove_session(user_id)
            return None

        return session

    def get_session_by_user(self, user: DiscordUser) -> Optional[UserSession]:
        """Get session by Discord user"""
        return self.get_session(user.id)

    def update_session_activity(self, user_id: str) -> bool:
        """Update session activity timestamp"""
        session = self.sessions.get(user_id)
        if session:
            session.refresh_activity()
            return True
        return False

    def remove_session(self, user_id: str) -> bool:
        """Remove user session"""
        if user_id in self.sessions:
            session = self.sessions.pop(user_id)
            logger.info(f"🗑️ Removed session for user {session.user.discord_user.get_display_name()}")
            return True
        return False

    def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions"""
        expired_user_ids = []

        for user_id, session in self.sessions.items():
            if session.is_expired(self.session_timeout_minutes):
                expired_user_ids.append(user_id)

        for user_id in expired_user_ids:
            self.remove_session(user_id)

        return len(expired_user_ids)

    def get_active_sessions_count(self) -> int:
        """Get count of active sessions"""
        return len(self.sessions)

    def get_session_stats(self) -> Dict:
        """Get session statistics"""
        now = datetime.utcnow()
        active_sessions = list(self.sessions.values())

        if not active_sessions:
            return {
                "total_sessions": 0,
                "average_session_duration_minutes": 0,
                "newest_session_age_minutes": 0,
                "oldest_session_age_minutes": 0
            }

        session_durations = []
        session_ages = []

        for session in active_sessions:
            duration = (now - session.created_at).total_seconds() / 60
            age = (now - session.last_active).total_seconds() / 60
            session_durations.append(duration)
            session_ages.append(age)

        return {
            "total_sessions": len(active_sessions),
            "average_session_duration_minutes": round(sum(session_durations) / len(session_durations), 2),
            "newest_session_age_minutes": round(min(session_ages), 2),
            "oldest_session_age_minutes": round(max(session_ages), 2),
            "users": [session.user.discord_user.get_display_name() for session in active_sessions]
        }

    def is_user_authenticated(self, user_id: str) -> bool:
        """Check if user has active session"""
        session = self.get_session(user_id)
        return session is not None


# Global user session manager instance
user_session_manager = UserSessionManager()