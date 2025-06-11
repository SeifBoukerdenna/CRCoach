"""
server/services/session_manager.py - Enhanced for single viewer enforcement
"""

from typing import Dict
from models.session import Session


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Session] = {}

    def create_session(self, session_code: str, max_viewers: int = 1) -> Session:
        """Create new session or return existing one - ENFORCES SINGLE VIEWER LIMIT"""
        if session_code not in self.sessions:
            # Force single viewer limit
            max_viewers = 1
            self.sessions[session_code] = Session(session_code, max_viewers)
            print(f"🆕 Created new SINGLE VIEWER session {session_code}")
        else:
            print(f"♻️ Returning existing single viewer session {session_code}")
        return self.sessions[session_code]

    def get_session(self, session_code: str) -> Session:
        """Get existing session"""
        return self.sessions.get(session_code)

    def remove_session(self, session_code: str):
        """Remove session"""
        if session_code in self.sessions:
            session = self.sessions[session_code]
            print(f"🗑️ Removing single viewer session {session_code} - had {len(session.viewers)}/1 viewer, broadcaster: {session.broadcaster is not None}")
            del self.sessions[session_code]

    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        expired = []

        for code, session in self.sessions.items():
            if session.is_expired():
                expired.append(code)
            elif session.is_empty():
                # Clean up empty sessions faster for single viewer sessions
                from datetime import datetime, timedelta
                if datetime.now() - session.last_activity > timedelta(minutes=1):  # Reduced from 2 to 1 minute
                    expired.append(code)

        for session_code in expired:
            session = self.sessions.get(session_code)
            if session:
                print(f"🗑️ Cleaning up expired/empty single viewer session {session_code} - viewers: {len(session.viewers)}/1, broadcaster: {session.broadcaster is not None}")
            del self.sessions[session_code]

        if expired:
            print(f"🧹 Cleaned up {len(expired)} expired/empty single viewer sessions")

    def log_server_stats(self):
        """Log server statistics optimized for single viewer sessions"""
        if not self.sessions:
            return

        total_broadcasters = sum(1 for s in self.sessions.values() if s.broadcaster)
        total_viewers = sum(len(s.viewers) for s in self.sessions.values())
        webrtc_established = sum(1 for s in self.sessions.values() if s.webrtc_established)

        # Single viewer specific stats
        full_sessions = sum(1 for s in self.sessions.values() if s.is_full())
        available_sessions = sum(1 for s in self.sessions.values() if s.is_available_for_viewer())

        print(f"📊 Single Viewer Stats – sessions:{len(self.sessions):3d} ({webrtc_established:3d} WebRTC)  "
              f"broadcasters:{total_broadcasters:3d}  viewers:{total_viewers:3d}  "
              f"full:{full_sessions:3d}  available:{available_sessions:3d}")

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
        """Log detailed session statistics for single viewer sessions"""
        if not self.sessions:
            return

        print("📊 Detailed Single Viewer Session Stats:")
        for code, session in self.sessions.items():
            availability = "🟢 AVAILABLE" if session.is_available_for_viewer() else "🔴 FULL"
            print(f"  📺 Session {code}: {len(session.viewers)}/1 viewers {availability}, "
                  f"broadcaster: {'✅' if session.broadcaster else '❌'}, "
                  f"total_ever: {session.total_viewers_ever}, "
                  f"uptime: {(session.last_activity - session.created_at).total_seconds():.0f}s")

    def get_all_stats(self) -> list:
        """Get all session stats with single viewer information"""
        stats = []

        for session in self.sessions.values():
            session_stats = session.get_stats()

            # Add single viewer specific statistics
            session_stats.update({
                'viewers_online': len(session.viewers),
                'viewers_max_capacity': 1,  # Always 1 for single viewer sessions
                'capacity_usage_percent': len(session.viewers) * 100,  # 0% or 100%
                'has_active_broadcast': session.broadcaster is not None and session.webrtc_established,
                'inference_enabled': session.session_code in getattr(self, '_inference_states', {}),
                'is_single_viewer_session': True,
                'available_for_new_viewer': session.is_available_for_viewer(),
                'session_full': session.is_full(),
            })

            stats.append(session_stats)

        return stats

    def get_session_by_viewer_count(self, min_viewers: int = 0, max_viewers: int = None) -> list:
        """Get sessions filtered by viewer count (adapted for single viewer)"""
        filtered_sessions = []

        for session in self.sessions.values():
            viewer_count = len(session.viewers)
            if viewer_count >= min_viewers:
                if max_viewers is None or viewer_count <= max_viewers:
                    filtered_sessions.append({
                        'session_code': session.session_code,
                        'viewer_count': viewer_count,
                        'max_viewers': 1,  # Always 1
                        'has_broadcaster': session.broadcaster is not None,
                        'webrtc_established': session.webrtc_established,
                        'created_at': session.created_at.isoformat(),
                        'last_activity': session.last_activity.isoformat(),
                        'is_single_viewer_session': True,
                        'available_for_viewer': session.is_available_for_viewer(),
                        'session_full': session.is_full()
                    })

        # Sort by availability first, then by viewer count
        return sorted(filtered_sessions,
                     key=lambda x: (not x['available_for_viewer'], -x['viewer_count']))

    def get_server_capacity_info(self) -> dict:
        """Get server capacity information for single viewer sessions"""
        total_viewers = sum(len(s.viewers) for s in self.sessions.values())
        total_capacity = len(self.sessions)  # Each session can have max 1 viewer
        active_sessions = len([s for s in self.sessions.values() if s.broadcaster is not None])
        full_sessions = len([s for s in self.sessions.values() if s.is_full()])
        available_sessions = len([s for s in self.sessions.values() if s.is_available_for_viewer()])

        return {
            'total_sessions': len(self.sessions),
            'active_sessions': active_sessions,
            'total_viewers': total_viewers,
            'total_capacity': total_capacity,  # Max possible viewers (1 per session)
            'capacity_utilization_percent': (total_viewers / total_capacity * 100) if total_capacity > 0 else 0,
            'average_viewers_per_session': total_viewers / len(self.sessions) if self.sessions else 0,
            'sessions_at_capacity': full_sessions,
            'sessions_available_for_viewers': available_sessions,
            'single_viewer_enforcement': True,
            'max_viewers_per_session': 1
        }

    def get_available_sessions(self) -> list:
        """Get sessions available for new viewers"""
        available_sessions = []

        for session_code, session in self.sessions.items():
            if session.is_available_for_viewer():
                available_sessions.append({
                    'session_code': session_code,
                    'has_broadcaster': session.broadcaster is not None,
                    'webrtc_established': session.webrtc_established,
                    'created_at': session.created_at.isoformat(),
                    'last_activity': session.last_activity.isoformat(),
                    'uptime_seconds': (session.last_activity - session.created_at).total_seconds()
                })

        # Sort by presence of broadcaster and uptime
        return sorted(available_sessions,
                     key=lambda x: (not x['has_broadcaster'], -x['uptime_seconds']))

    def get_full_sessions(self) -> list:
        """Get sessions that are at capacity (1 viewer)"""
        full_sessions = []

        for session_code, session in self.sessions.items():
            if session.is_full():
                full_sessions.append({
                    'session_code': session_code,
                    'viewer_count': len(session.viewers),
                    'has_broadcaster': session.broadcaster is not None,
                    'webrtc_established': session.webrtc_established,
                    'created_at': session.created_at.isoformat(),
                    'last_activity': session.last_activity.isoformat(),
                    'total_viewers_ever': session.total_viewers_ever
                })

        return sorted(full_sessions,
                     key=lambda x: x['total_viewers_ever'], reverse=True)

    def validate_session_availability(self, session_code: str) -> dict:
        """Validate if a session is available for a new viewer"""
        session = self.get_session(session_code)

        if not session:
            return {
                'available': True,
                'session_exists': False,
                'reason': 'Session does not exist - can be created',
                'has_broadcaster': False,
                'viewer_count': 0
            }

        if session.is_available_for_viewer():
            return {
                'available': True,
                'session_exists': True,
                'reason': 'Session available for viewer',
                'has_broadcaster': session.broadcaster is not None,
                'viewer_count': len(session.viewers)
            }
        else:
            return {
                'available': False,
                'session_exists': True,
                'reason': 'Session already has a viewer (single viewer limit)',
                'has_broadcaster': session.broadcaster is not None,
                'viewer_count': len(session.viewers)
            }