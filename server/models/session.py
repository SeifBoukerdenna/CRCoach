"""
server/models/session.py - Enhanced for single viewer enforcement
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Set
from fastapi import WebSocket


class Session:
    def __init__(self, session_code: str, max_viewers: int = 1):  # Changed default to 1
        self.session_code = session_code
        self.max_viewers = max_viewers  # Enforce single viewer limit
        self.created_at = datetime.now()
        self.last_activity = datetime.now()

        # Connection tracking
        self.broadcaster: Optional[WebSocket] = None
        self.viewers: List[WebSocket] = []
        self.viewer_ids: Set[str] = set()

        # Statistics
        self.total_viewers_ever = 0
        self.connection_attempts = 0
        self.webrtc_established = False

        # Enhanced tracking
        self.viewer_join_times = {}
        self.viewer_connection_ids = {}

        print(f"🆕 Created session {session_code} (SINGLE VIEWER LIMIT: {max_viewers})")

    async def add_broadcaster(self, websocket: WebSocket) -> bool:
        """Add broadcaster to session"""
        if self.broadcaster is not None:
            print(f"❌ Session {self.session_code} already has a broadcaster")
            return False

        self.broadcaster = websocket
        self.last_activity = datetime.now()
        self.webrtc_established = True

        connection_id = getattr(websocket, 'connection_id', 'unknown')
        self.viewer_connection_ids[websocket] = connection_id

        print(f"🎥 Broadcaster {connection_id} added to session {self.session_code}")
        return True

    async def add_viewer(self, websocket: WebSocket) -> bool:
        """Add viewer to session - ENFORCES SINGLE VIEWER LIMIT"""
        # STRICT SINGLE VIEWER ENFORCEMENT
        if len(self.viewers) >= 1:
            print(f"❌ Session {self.session_code} REJECTED: Already has {len(self.viewers)} viewer(s) - SINGLE VIEWER LIMIT")
            return False

        connection_id = getattr(websocket, 'connection_id', 'unknown')

        # Check for duplicate connection IDs
        if connection_id in self.viewer_ids:
            print(f"❌ Viewer {connection_id} already exists in session {self.session_code}")
            return False

        # Check for duplicate websocket objects
        if websocket in self.viewers:
            print(f"❌ WebSocket already exists in viewers list for session {self.session_code}")
            return False

        # Add the single viewer
        self.viewers.append(websocket)
        self.viewer_ids.add(connection_id)
        self.viewer_connection_ids[websocket] = connection_id
        self.viewer_join_times[connection_id] = datetime.now()

        self.total_viewers_ever += 1
        self.last_activity = datetime.now()

        print(f"👥 Viewer {connection_id} added to session {self.session_code} (SINGLE VIEWER SESSION)")
        print(f"📊 Session {self.session_code} now has {len(self.viewers)}/1 viewers (MAX REACHED)")

        return True

    async def remove_broadcaster(self):
        """Remove broadcaster from session"""
        if self.broadcaster:
            connection_id = self.viewer_connection_ids.get(self.broadcaster, 'unknown')

            if self.broadcaster in self.viewer_connection_ids:
                del self.viewer_connection_ids[self.broadcaster]

            self.broadcaster = None
            self.webrtc_established = False
            self.last_activity = datetime.now()

            print(f"🎥❌ Broadcaster {connection_id} removed from session {self.session_code}")

            # Notify the single viewer
            if self.viewers:
                disconnect_msg = {
                    'type': 'broadcaster_disconnected',
                    'sessionCode': self.session_code,
                    'timestamp': datetime.now().isoformat()
                }
                await self.broadcast_to_viewers(disconnect_msg)

    async def remove_viewer(self, websocket: WebSocket):
        """Remove viewer from session"""
        if websocket not in self.viewers:
            print(f"⚠️ Attempted to remove viewer that doesn't exist in session {self.session_code}")
            return

        connection_id = self.viewer_connection_ids.get(websocket, 'unknown')

        # Remove from all tracking structures
        self.viewers.remove(websocket)

        if connection_id in self.viewer_ids:
            self.viewer_ids.remove(connection_id)

        if websocket in self.viewer_connection_ids:
            del self.viewer_connection_ids[websocket]

        if connection_id in self.viewer_join_times:
            join_time = self.viewer_join_times[connection_id]
            session_duration = datetime.now() - join_time
            print(f"📊 Viewer {connection_id} was connected for {session_duration.total_seconds():.1f}s")
            del self.viewer_join_times[connection_id]

        self.last_activity = datetime.now()

        print(f"👥❌ Viewer {connection_id} removed from session {self.session_code}")
        print(f"📊 Session {self.session_code} now has {len(self.viewers)}/1 viewers (AVAILABLE FOR NEW VIEWER)")

    def is_available_for_viewer(self) -> bool:
        """Check if session can accept a new viewer (single viewer limit)"""
        return len(self.viewers) == 0

    def is_full(self) -> bool:
        """Check if session is at capacity"""
        return len(self.viewers) >= self.max_viewers

    async def broadcast_message(self, message: dict, sender: WebSocket = None, exclude_sender: bool = False):
        """Broadcast message - optimized for single viewer"""
        sender_role = getattr(sender, 'role', 'unknown') if sender else 'server'
        sender_id = getattr(sender, 'connection_id', 'unknown') if sender else 'server'

        successful_sends = 0
        failed_sends = 0

        if sender_role == 'broadcaster' or sender is None:
            # Send to the single viewer
            if self.viewers:
                viewer = self.viewers[0]  # Only one viewer possible
                if exclude_sender and viewer == sender:
                    return successful_sends, failed_sends

                try:
                    await viewer.send_text(json.dumps(message))
                    successful_sends += 1
                    print(f"📤 Message sent to single viewer by {sender_role} {sender_id}")
                except Exception as e:
                    viewer_id = self.viewer_connection_ids.get(viewer, 'unknown')
                    print(f"❌ Failed to send message to viewer {viewer_id}: {e}")
                    await self.remove_viewer(viewer)
                    failed_sends += 1

        elif sender_role == 'viewer':
            # Send to broadcaster
            message['from_viewer_id'] = sender_id

            if self.broadcaster:
                try:
                    await self.broadcaster.send_text(json.dumps(message))
                    successful_sends += 1
                    print(f"📤 Message sent from single viewer {sender_id} to broadcaster")
                except Exception as e:
                    print(f"❌ Failed to send message to broadcaster: {e}")
                    await self.remove_broadcaster()
                    failed_sends += 1
            else:
                print(f"❌ No broadcaster to receive message from viewer {sender_id}")
                failed_sends += 1

        return successful_sends, failed_sends

    async def broadcast_to_viewers(self, message: dict):
        """Broadcast message to the single viewer"""
        if not self.viewers:
            return 0

        viewer = self.viewers[0]  # Only one viewer
        try:
            await viewer.send_text(json.dumps(message))
            return 1
        except Exception as e:
            viewer_id = self.viewer_connection_ids.get(viewer, 'unknown')
            print(f"❌ Failed to broadcast to viewer {viewer_id}: {e}")
            await self.remove_viewer(viewer)
            return 0

    async def broadcast_to_broadcaster(self, message: dict):
        """Send message to broadcaster"""
        if not self.broadcaster:
            return False

        try:
            await self.broadcaster.send_text(json.dumps(message))
            return True
        except Exception as e:
            broadcaster_id = self.viewer_connection_ids.get(self.broadcaster, 'unknown')
            print(f"❌ Failed to send to broadcaster {broadcaster_id}: {e}")
            await self.remove_broadcaster()
            return False

    def is_empty(self) -> bool:
        """Check if session has no active connections"""
        return self.broadcaster is None and len(self.viewers) == 0

    def is_expired(self) -> bool:
        """Check if session has expired"""
        expiry_time = timedelta(minutes=30)
        return datetime.now() - self.last_activity > expiry_time

    def get_viewer_by_id(self, connection_id: str) -> Optional[WebSocket]:
        """Get viewer WebSocket by connection ID"""
        for websocket, stored_id in self.viewer_connection_ids.items():
            if stored_id == connection_id and websocket in self.viewers:
                return websocket
        return None

    def get_connection_id(self, websocket: WebSocket) -> str:
        """Get connection ID for a WebSocket"""
        return self.viewer_connection_ids.get(websocket, 'unknown')

    def get_stats(self) -> dict:
        """Get detailed session statistics"""
        now = datetime.now()

        # Calculate viewer session durations
        viewer_durations = []
        for connection_id, join_time in self.viewer_join_times.items():
            duration = (now - join_time).total_seconds()
            viewer_durations.append(duration)

        avg_viewer_duration = sum(viewer_durations) / len(viewer_durations) if viewer_durations else 0

        return {
            'session_code': self.session_code,
            'created_at': self.created_at.isoformat(),
            'last_activity': self.last_activity.isoformat(),
            'uptime_seconds': (now - self.created_at).total_seconds(),
            'inactive_seconds': (now - self.last_activity).total_seconds(),

            # Connection stats
            'has_broadcaster': self.broadcaster is not None,
            'current_viewers': len(self.viewers),
            'max_viewers': 1,  # Always 1 for single viewer sessions
            'total_viewers_ever': self.total_viewers_ever,
            'connection_attempts': self.connection_attempts,
            'webrtc_established': self.webrtc_established,

            # Single viewer specific stats
            'is_single_viewer_session': True,
            'available_for_viewer': self.is_available_for_viewer(),
            'viewer_slots_available': 1 - len(self.viewers),
            'capacity_utilization': len(self.viewers) * 100,  # 0% or 100% for single viewer
            'is_full': self.is_full(),
            'is_empty': self.is_empty(),
            'is_expired': self.is_expired(),

            # Viewer analytics
            'viewer_connection_ids': list(self.viewer_ids),
            'avg_viewer_session_duration': avg_viewer_duration,
            'current_viewer_durations': viewer_durations,

            # Health metrics
            'active_connections': (1 if self.broadcaster else 0) + len(self.viewers),
            'connection_health': 'healthy' if not self.is_expired() else 'expired'
        }

    def __str__(self):
        return f"Session({self.session_code}: {len(self.viewers)}/1 viewers, broadcaster={'✅' if self.broadcaster else '❌'})"

    def __repr__(self):
        return self.__str__()