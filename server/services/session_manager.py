"""
server/services/session_manager.py - Enhanced for multiple viewers
"""

from typing import Dict
from models.session import Session


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Session] = {}

    def create_session(self, session_code: str, max_viewers: int = 50) -> Session:
        """Create new session or return existing one"""
        if session_code not in self.sessions:
            self.sessions[session_code] = Session(session_code, max_viewers)
            print(f"🆕 Created new session {session_code} (max viewers: {max_viewers})")
        else:
            print(f"♻️ Returning existing session {session_code}")
        return self.sessions[session_code]

    def get_session(self, session_code: str) -> Session:
        """Get existing session"""
        return self.sessions.get(session_code)

    def remove_session(self, session_code: str):
        """Remove session"""
        if session_code in self.sessions:
            session = self.sessions[session_code]
            print(f"🗑️ Removing session {session_code} - had {len(session.viewers)} viewers, broadcaster: {session.broadcaster is not None}")
            del self.sessions[session_code]

    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        expired = []

        for code, session in self.sessions.items():
            if session.is_expired():
                expired.append(code)
            elif session.is_empty():
                # Also clean up empty sessions that have been empty for a while
                from datetime import datetime, timedelta
                if datetime.now() - session.last_activity > timedelta(minutes=2):
                    expired.append(code)

        for session_code in expired:
            session = self.sessions.get(session_code)
            if session:
                print(f"🗑️ Cleaning up expired/empty session {session_code} - viewers: {len(session.viewers)}, broadcaster: {session.broadcaster is not None}")
            del self.sessions[session_code]

        if expired:
            print(f"🧹 Cleaned up {len(expired)} expired/empty sessions")

    def log_server_stats(self):
        """Log server statistics with enhanced viewer info"""
        if not self.sessions:
            return

        total_broadcasters = sum(1 for s in self.sessions.values() if s.broadcaster)
        total_viewers = sum(len(s.viewers) for s in self.sessions.values())
        webrtc_established = sum(1 for s in self.sessions.values() if s.webrtc_established)

        # Calculate session distribution
        viewer_distribution = {}
        for session in self.sessions.values():
            viewer_count = len(session.viewers)
            viewer_distribution[viewer_count] = viewer_distribution.get(viewer_count, 0) + 1

        print(f"📊 Stats – sessions:{len(self.sessions):3d} ({webrtc_established:3d} WebRTC)  "
              f"broadcasters:{total_broadcasters:3d}  viewers:{total_viewers:3d}")

        # Log detailed session info occasionally
        if hasattr(self, '_last_detailed_log_time'):
            import time
            if time.time() - self._last_detailed_log_time > 60:  # Every minute
                self._log_detailed_stats()
                self._last_detailed_log_time = time.time()
        else:
            import time
            self._last_detailed_log_time = time.time()

    def _log_detailed_stats(self):
        """Log detailed session statistics"""
        if not self.sessions:
            return

        print("📊 Detailed Session Stats:")
        for code, session in self.sessions.items():
            print(f"  📺 Session {code}: {len(session.viewers)} viewers, "
                  f"broadcaster: {'✅' if session.broadcaster else '❌'}, "
                  f"total_ever: {session.total_viewers_ever}, "
                  f"uptime: {(session.last_activity - session.created_at).total_seconds():.0f}s")

    def get_all_stats(self) -> list:
        """Get all session stats with enhanced viewer information"""
        stats = []

        for session in self.sessions.values():
            session_stats = session.get_stats()

            # Add enhanced statistics
            session_stats.update({
                'viewers_online': len(session.viewers),
                'viewers_max_capacity': session.max_viewers,
                'capacity_usage_percent': (len(session.viewers) / session.max_viewers) * 100,
                'has_active_broadcast': session.broadcaster is not None and session.webrtc_established,
                'inference_enabled': session.session_code in getattr(self, '_inference_states', {}),
            })

            stats.append(session_stats)

        return stats

    def get_session_by_viewer_count(self, min_viewers: int = 0, max_viewers: int = None) -> list:
        """Get sessions filtered by viewer count"""
        filtered_sessions = []

        for session in self.sessions.values():
            viewer_count = len(session.viewers)
            if viewer_count >= min_viewers:
                if max_viewers is None or viewer_count <= max_viewers:
                    filtered_sessions.append({
                        'session_code': session.session_code,
                        'viewer_count': viewer_count,
                        'max_viewers': session.max_viewers,
                        'has_broadcaster': session.broadcaster is not None,
                        'webrtc_established': session.webrtc_established,
                        'created_at': session.created_at.isoformat(),
                        'last_activity': session.last_activity.isoformat()
                    })

        # Sort by viewer count descending
        return sorted(filtered_sessions, key=lambda x: x['viewer_count'], reverse=True)

    def get_server_capacity_info(self) -> dict:
        """Get server capacity information"""
        total_viewers = sum(len(s.viewers) for s in self.sessions.values())
        total_capacity = sum(s.max_viewers for s in self.sessions.values())
        active_sessions = len([s for s in self.sessions.values() if s.broadcaster is not None])

        return {
            'total_sessions': len(self.sessions),
            'active_sessions': active_sessions,
            'total_viewers': total_viewers,
            'total_capacity': total_capacity,
            'capacity_utilization_percent': (total_viewers / total_capacity * 100) if total_capacity > 0 else 0,
            'average_viewers_per_session': total_viewers / len(self.sessions) if self.sessions else 0,
            'sessions_at_capacity': len([s for s in self.sessions.values() if len(s.viewers) >= s.max_viewers])
        }