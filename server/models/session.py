"""
server/models/session.py - Fixed to properly support multiple viewers
"""

import time
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import WebSocket


class Session:
    def __init__(self, session_code: str, max_viewers: int = 50):
        self.session_code = session_code
        self.broadcaster: Optional[WebSocket] = None
        self.viewers: List[WebSocket] = []
        self.max_viewers = max_viewers
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
        self.connection_attempts = 0
        self.webrtc_established = False
        self.latency_data: List[Dict[str, Any]] = []

        # Enhanced viewer tracking
        self.viewer_info: Dict[WebSocket, Dict[str, Any]] = {}
        self.total_viewers_ever = 0

        print(f"✅ Session {session_code} created (max viewers: {max_viewers})")

    async def add_broadcaster(self, ws: WebSocket) -> bool:
        """Add broadcaster to session"""
        if self.broadcaster is not None:
            print(f"❌ Session {self.session_code} already has a broadcaster")
            return False

        self.broadcaster = ws
        ws.role = 'broadcaster'
        self.last_activity = datetime.now()
        self.webrtc_established = True

        print(f"🎥 Broadcaster connected to session {self.session_code}")

        # Notify all existing viewers that broadcaster is now available
        if self.viewers:
            await self.broadcast_to_viewers({
                'type': 'broadcaster_connected',
                'sessionCode': self.session_code,
                'timestamp': datetime.now().isoformat(),
                'viewerCount': len(self.viewers)
            })

        return True

    async def add_viewer(self, ws: WebSocket) -> bool:
        """Add viewer to session"""
        if len(self.viewers) >= self.max_viewers:
            print(f"❌ Session {self.session_code} at max viewer capacity ({self.max_viewers})")
            return False

        if ws in self.viewers:
            print(f"⚠️ Viewer already in session {self.session_code}")
            return True

        self.viewers.append(ws)
        ws.role = 'viewer'
        self.last_activity = datetime.now()
        self.total_viewers_ever += 1

        # Store viewer info
        connection_id = getattr(ws, 'connection_id', f'viewer_{len(self.viewers)}')
        self.viewer_info[ws] = {
            'connection_id': connection_id,
            'connected_at': datetime.now(),
            'connection_attempts': getattr(ws, 'connection_attempts', 0)
        }

        print(f"👥 Viewer {connection_id} connected to session {self.session_code} ({len(self.viewers)}/{self.max_viewers} viewers)")

        # Notify broadcaster about new viewer
        if self.broadcaster:
            try:
                await self.broadcaster.send_text(json.dumps({
                    'type': 'viewer_joined',
                    'sessionCode': self.session_code,
                    'viewerCount': len(self.viewers),
                    'viewerId': connection_id,
                    'timestamp': datetime.now().isoformat()
                }))
            except Exception as e:
                print(f"⚠️ Failed to notify broadcaster of new viewer: {e}")

        # Notify other viewers about the new viewer count
        await self.broadcast_to_viewers({
            'type': 'viewer_count_update',
            'sessionCode': self.session_code,
            'viewerCount': len(self.viewers),
            'timestamp': datetime.now().isoformat()
        }, exclude=ws)

        return True

    async def remove_viewer(self, ws: WebSocket):
        """Remove viewer from session"""
        if ws not in self.viewers:
            return

        connection_id = self.viewer_info.get(ws, {}).get('connection_id', 'unknown')
        self.viewers.remove(ws)

        if ws in self.viewer_info:
            del self.viewer_info[ws]

        print(f"👥❌ Viewer {connection_id} disconnected from session {self.session_code} ({len(self.viewers)} remaining)")

        # Notify broadcaster about viewer leaving
        if self.broadcaster:
            try:
                await self.broadcaster.send_text(json.dumps({
                    'type': 'viewer_left',
                    'sessionCode': self.session_code,
                    'viewerCount': len(self.viewers),
                    'viewerId': connection_id,
                    'timestamp': datetime.now().isoformat()
                }))
            except Exception as e:
                print(f"⚠️ Failed to notify broadcaster of viewer leaving: {e}")

        # Notify remaining viewers about updated count
        await self.broadcast_to_viewers({
            'type': 'viewer_count_update',
            'sessionCode': self.session_code,
            'viewerCount': len(self.viewers),
            'timestamp': datetime.now().isoformat()
        })

    async def remove_broadcaster(self):
        """Remove broadcaster from session"""
        if self.broadcaster is None:
            return

        print(f"🎥❌ Broadcaster disconnected from session {self.session_code}")

        # Notify all viewers that broadcaster left
        await self.broadcast_to_viewers({
            'type': 'broadcaster_disconnected',
            'sessionCode': self.session_code,
            'timestamp': datetime.now().isoformat(),
            'message': 'The broadcaster has ended the stream'
        })

        self.broadcaster = None
        self.webrtc_established = False

    async def broadcast_message(self, message: dict, sender: WebSocket, exclude_sender: bool = False):
        """Broadcast message to appropriate recipients based on sender role"""
        import json

        self.last_activity = datetime.now()
        message_json = json.dumps(message)
        sender_role = getattr(sender, 'role', 'unknown')

        print(f"📢 Broadcasting {message.get('type', 'unknown')} from {sender_role} in session {self.session_code}")

        # If broadcaster sends a message, send to all viewers
        if sender_role == 'broadcaster':
            failed_viewers = []
            successful_sends = 0

            for viewer in self.viewers:
                if exclude_sender and viewer == sender:
                    continue
                try:
                    await viewer.send_text(message_json)
                    successful_sends += 1
                except Exception as e:
                    print(f"❌ Failed to send to viewer: {e}")
                    failed_viewers.append(viewer)

            # Clean up failed viewers
            for failed_viewer in failed_viewers:
                await self.remove_viewer(failed_viewer)

            if successful_sends > 0:
                print(f"✅ Message sent to {successful_sends} viewers")

        # If viewer sends a message, send to broadcaster
        elif sender_role == 'viewer' and self.broadcaster:
            if not exclude_sender or sender != self.broadcaster:
                try:
                    await self.broadcaster.send_text(message_json)
                    print(f"✅ Message sent to broadcaster")
                except Exception as e:
                    print(f"❌ Failed to send to broadcaster: {e}")
                    await self.remove_broadcaster()

    async def broadcast_to_viewers(self, message: dict, exclude: Optional[WebSocket] = None):
        """Broadcast message to all viewers"""
        import json

        if not self.viewers:
            return

        message_json = json.dumps(message)
        failed_viewers = []
        successful_sends = 0

        for viewer in self.viewers:
            if exclude and viewer == exclude:
                continue
            try:
                await viewer.send_text(message_json)
                successful_sends += 1
            except Exception as e:
                print(f"❌ Failed to send to viewer: {e}")
                failed_viewers.append(viewer)

        # Clean up failed viewers
        for failed_viewer in failed_viewers:
            await self.remove_viewer(failed_viewer)

        if successful_sends > 0:
            print(f"✅ Broadcast sent to {successful_sends} viewers")

    def is_empty(self) -> bool:
        """Check if session is empty"""
        return self.broadcaster is None and len(self.viewers) == 0

    def is_expired(self) -> bool:
        """Check if session has expired"""
        from core.config import Config
        expiry_time = timedelta(seconds=Config.get_session_timeout_seconds())
        return datetime.now() - self.last_activity > expiry_time

    def get_stats(self) -> dict:
        """Get session statistics"""
        uptime = (datetime.now() - self.created_at).total_seconds()

        return {
            'session_code': self.session_code,
            'created_at': self.created_at.isoformat(),
            'uptime_seconds': uptime,
            'last_activity': self.last_activity.isoformat(),
            'has_broadcaster': self.broadcaster is not None,
            'current_viewers': len(self.viewers),
            'max_viewers': self.max_viewers,
            'total_viewers_ever': self.total_viewers_ever,
            'connection_attempts': self.connection_attempts,
            'webrtc_established': self.webrtc_established,
            'viewer_info': {
                self.viewer_info[ws]['connection_id']: {
                    'connected_at': self.viewer_info[ws]['connected_at'].isoformat(),
                    'connection_attempts': self.viewer_info[ws]['connection_attempts']
                }
                for ws in self.viewer_info.keys() if ws in self.viewers
            }
        }