"""
server/models/session.py - Enhanced for multiple viewers support
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Set
from fastapi import WebSocket


class Session:
    def __init__(self, session_code: str, max_viewers: int = 100):
        self.session_code = session_code
        self.max_viewers = max_viewers
        self.created_at = datetime.now()
        self.last_activity = datetime.now()

        # Connection tracking
        self.broadcaster: Optional[WebSocket] = None
        self.viewers: List[WebSocket] = []
        self.viewer_ids: Set[str] = set()  # Track viewer connection IDs

        # Statistics
        self.total_viewers_ever = 0
        self.connection_attempts = 0
        self.webrtc_established = False

        # Enhanced tracking
        self.viewer_join_times = {}  # connection_id -> join_time
        self.viewer_connection_ids = {}  # websocket -> connection_id mapping

        print(f"🆕 Created session {session_code} with max {max_viewers} viewers")

    async def add_broadcaster(self, websocket: WebSocket) -> bool:
        """Add broadcaster to session"""
        if self.broadcaster is not None:
            print(f"❌ Session {self.session_code} already has a broadcaster")
            return False

        self.broadcaster = websocket
        self.last_activity = datetime.now()
        self.webrtc_established = True

        # Store connection info
        connection_id = getattr(websocket, 'connection_id', 'unknown')
        self.viewer_connection_ids[websocket] = connection_id

        print(f"🎥 Broadcaster {connection_id} added to session {self.session_code}")
        print(f"📊 Session {self.session_code} now has broadcaster + {len(self.viewers)} viewers")

        return True

    async def add_viewer(self, websocket: WebSocket) -> bool:
        """Add viewer to session with proper duplicate checking"""
        if len(self.viewers) >= self.max_viewers:
            print(f"❌ Session {self.session_code} at max capacity ({self.max_viewers})")
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

        # Add viewer
        self.viewers.append(websocket)
        self.viewer_ids.add(connection_id)
        self.viewer_connection_ids[websocket] = connection_id
        self.viewer_join_times[connection_id] = datetime.now()

        self.total_viewers_ever += 1
        self.last_activity = datetime.now()

        print(f"👥 Viewer {connection_id} added to session {self.session_code}")
        print(f"📊 Session {self.session_code} now has {len(self.viewers)}/{self.max_viewers} viewers")

        return True

    async def remove_broadcaster(self):
        """Remove broadcaster from session"""
        if self.broadcaster:
            connection_id = self.viewer_connection_ids.get(self.broadcaster, 'unknown')

            # Clean up mapping
            if self.broadcaster in self.viewer_connection_ids:
                del self.viewer_connection_ids[self.broadcaster]

            self.broadcaster = None
            self.webrtc_established = False
            self.last_activity = datetime.now()

            print(f"🎥❌ Broadcaster {connection_id} removed from session {self.session_code}")

            # Notify all viewers
            if self.viewers:
                disconnect_msg = {
                    'type': 'broadcaster_disconnected',
                    'sessionCode': self.session_code,
                    'timestamp': datetime.now().isoformat()
                }

                await self.broadcast_to_viewers(disconnect_msg)

    async def remove_viewer(self, websocket: WebSocket):
        """Remove viewer from session with proper cleanup"""
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
        print(f"📊 Session {self.session_code} now has {len(self.viewers)}/{self.max_viewers} viewers")

    async def broadcast_message(self, message: dict, sender: WebSocket = None, exclude_sender: bool = False):
        """Broadcast message to appropriate recipients based on sender role"""
        sender_role = getattr(sender, 'role', 'unknown') if sender else 'server'
        sender_id = getattr(sender, 'connection_id', 'unknown') if sender else 'server'

        successful_sends = 0
        failed_sends = 0

        if sender_role == 'broadcaster' or sender is None:
            # Broadcaster message or server message - send to all viewers
            viewers_to_remove = []

            for viewer in self.viewers:
                if exclude_sender and viewer == sender:
                    continue

                try:
                    await viewer.send_text(json.dumps(message))
                    successful_sends += 1
                except Exception as e:
                    viewer_id = self.viewer_connection_ids.get(viewer, 'unknown')
                    print(f"❌ Failed to send message to viewer {viewer_id}: {e}")
                    viewers_to_remove.append(viewer)
                    failed_sends += 1

            # Clean up failed connections
            for viewer in viewers_to_remove:
                await self.remove_viewer(viewer)

            if successful_sends > 0:
                print(f"📤 Message broadcast to {successful_sends} viewers by {sender_role} {sender_id}")

        elif sender_role == 'viewer':
            # Viewer message - send to broadcaster
            if self.broadcaster:
                try:
                    await self.broadcaster.send_text(json.dumps(message))
                    successful_sends += 1
                    print(f"📤 Message sent from viewer {sender_id} to broadcaster")
                except Exception as e:
                    broadcaster_id = self.viewer_connection_ids.get(self.broadcaster, 'unknown')
                    print(f"❌ Failed to send message to broadcaster {broadcaster_id}: {e}")
                    await self.remove_broadcaster()
                    failed_sends += 1
            else:
                print(f"❌ No broadcaster to receive message from viewer {sender_id}")
                failed_sends += 1

        return successful_sends, failed_sends

    async def broadcast_to_viewers(self, message: dict):
        """Broadcast message specifically to all viewers"""
        successful_sends = 0
        viewers_to_remove = []

        for viewer in self.viewers:
            try:
                await viewer.send_text(json.dumps(message))
                successful_sends += 1
            except Exception as e:
                viewer_id = self.viewer_connection_ids.get(viewer, 'unknown')
                print(f"❌ Failed to broadcast to viewer {viewer_id}: {e}")
                viewers_to_remove.append(viewer)

        # Clean up failed connections
        for viewer in viewers_to_remove:
            await self.remove_viewer(viewer)

        return successful_sends

    async def broadcast_to_broadcaster(self, message: dict):
        """Send message specifically to broadcaster"""
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
        expiry_time = timedelta(minutes=30)  # Increased from 5 to 30 minutes
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
            'max_viewers': self.max_viewers,
            'total_viewers_ever': self.total_viewers_ever,
            'connection_attempts': self.connection_attempts,
            'webrtc_established': self.webrtc_established,

            # Capacity and performance
            'capacity_utilization': (len(self.viewers) / self.max_viewers) * 100,
            'is_full': len(self.viewers) >= self.max_viewers,
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
        return f"Session({self.session_code}: {len(self.viewers)} viewers, broadcaster={'✅' if self.broadcaster else '❌'})"

    def __repr__(self):
        return self.__str__()