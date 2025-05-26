from typing import Dict
from models.session import Session


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Session] = {}

    def create_session(self, session_code: str) -> Session:
        """Create new session"""
        if session_code not in self.sessions:
            self.sessions[session_code] = Session(session_code)
        return self.sessions[session_code]

    def get_session(self, session_code: str) -> Session:
        """Get existing session"""
        return self.sessions.get(session_code)

    def remove_session(self, session_code: str):
        """Remove session"""
        if session_code in self.sessions:
            del self.sessions[session_code]
            print(f"🗑️ Session {session_code} deleted (empty)")

    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        expired = [code for code, session in self.sessions.items() if session.is_expired()]

        for session_code in expired:
            print(f"🗑️ Cleaning up expired session {session_code}")
            del self.sessions[session_code]

        if expired:
            print(f"🧹 Cleaned up {len(expired)} expired sessions")

    def log_server_stats(self):
        """Log server statistics"""
        if not self.sessions:
            return

        total_broadcasters = sum(1 for s in self.sessions.values() if s.broadcaster)
        total_viewers = sum(len(s.viewers) for s in self.sessions.values())
        webrtc_established = sum(1 for s in self.sessions.values() if s.webrtc_established)

        print(f"📊 Stats – sessions:{len(self.sessions):3d} ({webrtc_established:3d} WebRTC)  "
              f"broadcasters:{total_broadcasters:3d}  viewers:{total_viewers:3d}")

    def get_all_stats(self) -> list:
        """Get all session stats"""
        return [session.get_stats() for session in self.sessions.values()]
