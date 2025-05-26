import asyncio
import json
from datetime import datetime
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket

class Session:
    def __init__(self, session_code: str):
        self.session_code = session_code
        self.broadcaster: Optional[WebSocket] = None
        self.viewers: Set[WebSocket] = set()
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
        self.message_count = 0
        self.connection_attempts = 0
        self.max_viewers = 10
        self.webrtc_established = False

        print(f"🆕 Created session {session_code}")

    async def add_broadcaster(self, ws: WebSocket):
        if self.broadcaster:
            print(f"📡⚠️ Replacing existing broadcaster in session {self.session_code}")
            try:
                await self.broadcaster.close(code=1000, reason="New broadcaster connected")
            except:
                pass

        self.broadcaster = ws
        ws.role = 'broadcaster'
        ws.session_code = self.session_code
        ws.connected_at = datetime.now()
        ws.is_alive = True
        ws.messages_sent = 0

        self.update_activity()
        print(f"📡✅ Broadcaster connected to session {self.session_code}")

    async def add_viewer(self, ws: WebSocket) -> bool:
        if len(self.viewers) >= self.max_viewers:
            print(f"👁️❌ Session {self.session_code} at viewer limit ({self.max_viewers})")
            await ws.close(code=1013, reason="Session at capacity")
            return False

        self.viewers.add(ws)
        ws.role = 'viewer'
        ws.session_code = self.session_code
        ws.connected_at = datetime.now()
        ws.is_alive = True
        ws.messages_sent = 0

        self.update_activity()
        print(f"👁️✅ Viewer connected to session {self.session_code}. Total: {len(self.viewers)}/{self.max_viewers}")
        return True

    async def remove_broadcaster(self):
        if self.broadcaster:
            print(f"📡🚫 Removing broadcaster from session {self.session_code}")
            self.broadcaster = None
            self.webrtc_established = False

            # Notify all viewers
            disconnect_msg = {
                'type': 'broadcaster_disconnected',
                'timestamp': datetime.now().isoformat(),
                'session_code': self.session_code
            }

            viewer_count = 0
            for viewer in self.viewers.copy():
                try:
                    await viewer.send_text(json.dumps(disconnect_msg))
                    viewer_count += 1
                except:
                    self.viewers.discard(viewer)

            print(f"📡❌ Broadcaster disconnected from session {self.session_code}, notified {viewer_count} viewers")

    async def remove_viewer(self, ws: WebSocket):
        if ws in self.viewers:
            self.viewers.discard(ws)
            self.update_activity()
            print(f"👁️❌ Viewer disconnected from session {self.session_code}. Total: {len(self.viewers)}/{self.max_viewers}")

    async def broadcast_message(self, msg: dict, sender: WebSocket):
        original_msg = msg.copy()  # Keep original for logging

        # Add session metadata
        msg['session_code'] = self.session_code
        msg['timestamp'] = datetime.now().isoformat()

        self.message_count += 1
        self.update_activity()

        sender_role = getattr(sender, 'role', 'unknown')
        msg_type = msg.get('type', 'unknown')

        print(f"📨 Broadcasting {msg_type} from {sender_role} in session {self.session_code}")

        # Track WebRTC establishment
        if msg_type in ['offer', 'answer']:
            print(f"🔄 WebRTC negotiation: {msg_type} in session {self.session_code}")
            if msg_type == 'offer':
                print(f"📤 SDP Offer: {original_msg.get('sdp', 'NO SDP')[:100]}...")
            elif msg_type == 'answer':
                print(f"📤 SDP Answer: {original_msg.get('sdp', 'NO SDP')[:100]}...")
                self.webrtc_established = True
                print(f"✅ WebRTC negotiation completed for session {self.session_code}")

        if msg_type == 'ice':
            candidate = original_msg.get('candidate', 'NO CANDIDATE')
            print(f"🧊 ICE Candidate: {candidate[:50]}...")

        if sender == self.broadcaster:
            # Broadcaster → Viewers (immediate forwarding)
            success_count = 0
            failed_viewers = set()

            print(f"📡➡️👁️ Forwarding {msg_type} from broadcaster to {len(self.viewers)} viewers")

            for viewer in self.viewers.copy():
                try:
                    await viewer.send_text(json.dumps(msg))
                    viewer.messages_sent = getattr(viewer, 'messages_sent', 0) + 1
                    success_count += 1
                except Exception as e:
                    print(f"❌ Failed to send {msg_type} to viewer: {e}")
                    failed_viewers.add(viewer)

            # Clean up failed viewers
            for viewer in failed_viewers:
                self.viewers.discard(viewer)

            print(f"📤 Forwarded {msg_type} to {success_count}/{len(self.viewers) + len(failed_viewers)} viewers in session {self.session_code}")

        else:
            # Viewer → Broadcaster (immediate forwarding)
            print(f"👁️➡️📡 Forwarding {msg_type} from viewer to broadcaster")

            if self.broadcaster:
                try:
                    await self.broadcaster.send_text(json.dumps(msg))
                    self.broadcaster.messages_sent = getattr(self.broadcaster, 'messages_sent', 0) + 1
                    print(f"📤 Forwarded {msg_type} to broadcaster in session {self.session_code}")
                except Exception as e:
                    print(f"❌ Failed to send {msg_type} to broadcaster: {e}")
                    await self.remove_broadcaster()
            else:
                print(f"⚠️ No broadcaster to forward {msg_type} to in session {self.session_code}")

    def update_activity(self):
        self.last_activity = datetime.now()

    def is_empty(self) -> bool:
        return not self.broadcaster and len(self.viewers) == 0

    def is_expired(self) -> bool:
        inactive_time = (datetime.now() - self.last_activity).total_seconds()
        return inactive_time > 300  # 5 minutes

    def get_stats(self) -> dict:
        now = datetime.now()
        return {
            'session_code': self.session_code,
            'has_broadcaster': bool(self.broadcaster),
            'viewer_count': len(self.viewers),
            'max_viewers': self.max_viewers,
            'created_at': self.created_at.isoformat(),
            'last_activity': self.last_activity.isoformat(),
            'age_minutes': (now - self.created_at).total_seconds() / 60,
            'inactive_minutes': (now - self.last_activity).total_seconds() / 60,
            'message_count': self.message_count,
            'webrtc_established': self.webrtc_established,
            'connection_attempts': self.connection_attempts
        }
