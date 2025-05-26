# =============================================================================
# Debug FastAPI WebRTC Server - Detailed logging to find the issue
# =============================================================================

import asyncio
import json
import time
import uuid
import uvicorn
from datetime import datetime
from typing import Dict, Set, Optional, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

# =============================================================================
# Enhanced Session Model with detailed logging
# =============================================================================

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

# =============================================================================
# Global state
# =============================================================================

sessions: Dict[str, Session] = {}
background_tasks = []

# =============================================================================
# Helper functions with enhanced logging
# =============================================================================

def cleanup_expired_sessions():
    """Clean up expired sessions"""
    expired = [code for code, session in sessions.items() if session.is_expired()]

    for session_code in expired:
        print(f"🗑️ Cleaning up expired session {session_code}")
        del sessions[session_code]

    if expired:
        print(f"🧹 Cleaned up {len(expired)} expired sessions")

def log_server_stats():
    """Log server statistics"""
    if not sessions:
        return

    total_broadcasters = sum(1 for s in sessions.values() if s.broadcaster)
    total_viewers = sum(len(s.viewers) for s in sessions.values())
    webrtc_established = sum(1 for s in sessions.values() if s.webrtc_established)

    print(f"📊 Stats – sessions:{len(sessions):3d} ({webrtc_established:3d} WebRTC)  "
          f"broadcasters:{total_broadcasters:3d}  viewers:{total_viewers:3d}")

async def send_error(ws: WebSocket, message: str):
    """Send error message to client"""
    try:
        error_msg = {
            'type': 'error',
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
        await ws.send_text(json.dumps(error_msg))
        print(f"❌ Sent error to client: {message}")
    except Exception as e:
        print(f"❌ Failed to send error message: {e}")

# =============================================================================
# WebSocket handlers with enhanced logging
# =============================================================================

async def handle_connect(ws: WebSocket, msg: dict):
    """Handle connection request"""
    session_code = msg.get('sessionCode')
    role = msg.get('role')

    print(f"🔌 Connection request: session={session_code}, role={role}")

    if not session_code or not role:
        await send_error(ws, 'Missing sessionCode or role')
        return None, None

    if not session_code.isdigit() or len(session_code) != 4:
        await send_error(ws, 'Session code must be 4 digits')
        return None, None

    if role not in ['broadcaster', 'viewer']:
        await send_error(ws, 'Role must be broadcaster or viewer')
        return None, None

    # Create session if it doesn't exist
    if session_code not in sessions:
        sessions[session_code] = Session(session_code)

    current_session = sessions[session_code]
    current_session.connection_attempts += 1

    success = False
    if role == 'broadcaster':
        await current_session.add_broadcaster(ws)
        success = True
    elif role == 'viewer':
        success = await current_session.add_viewer(ws)

    if success:
        response = {
            'type': 'connected',
            'sessionCode': session_code,
            'role': role,
            'viewerCount': len(current_session.viewers),
            'maxViewers': current_session.max_viewers,
            'timestamp': datetime.now().isoformat(),
            'connectionId': getattr(ws, 'connection_id', 'unknown')
        }

        await ws.send_text(json.dumps(response))
        print(f"✅ {role} connected to session {session_code} - sent response: {response}")

    return current_session, role

async def handle_signaling(current_session: Session, ws: WebSocket, msg: dict):
    """Handle WebRTC signaling messages"""
    if not current_session:
        await send_error(ws, 'Not in a session')
        return

    msg_type = msg.get('type', 'unknown')
    role = getattr(ws, 'role', 'unknown')

    print(f"🔄 Handling {msg_type} from {role} in session {current_session.session_code}")

    # Log detailed message info
    if msg_type == 'offer':
        sdp = msg.get('sdp', '')
        print(f"📤 Offer SDP length: {len(sdp)} chars")
        if 'video' in sdp.lower():
            print("✅ SDP contains video")
        if 'audio' in sdp.lower():
            print("✅ SDP contains audio")
    elif msg_type == 'answer':
        sdp = msg.get('sdp', '')
        print(f"📤 Answer SDP length: {len(sdp)} chars")
    elif msg_type == 'ice':
        candidate = msg.get('candidate', '')
        print(f"🧊 ICE candidate: {candidate[:50]}...")

    # Forward immediately
    await current_session.broadcast_message(msg, ws)

async def handle_ping(ws: WebSocket):
    """Handle ping message"""
    connection_id = getattr(ws, 'connection_id', 'unknown')
    pong_msg = {
        'type': 'pong',
        'timestamp': datetime.now().isoformat(),
        'connectionId': connection_id
    }
    await ws.send_text(json.dumps(pong_msg))
    print(f"🏓 Pong sent to {connection_id}")

async def handle_disconnect(current_session: Session, ws: WebSocket):
    """Handle connection cleanup"""
    if not current_session:
        return

    role = getattr(ws, 'role', 'unknown')
    connection_id = getattr(ws, 'connection_id', 'unknown')

    print(f"🧹 Cleaning up {role} connection {connection_id} from session {current_session.session_code}")

    # Only clean up once
    if role == 'broadcaster' and current_session.broadcaster == ws:
        await current_session.remove_broadcaster()
    elif role == 'viewer' and ws in current_session.viewers:
        await current_session.remove_viewer(ws)

    # Clean up empty sessions
    if current_session.is_empty():
        if current_session.session_code in sessions:
            del sessions[current_session.session_code]
            print(f"🗑️ Session {current_session.session_code} deleted (empty)")

# =============================================================================
# Background tasks
# =============================================================================

async def background_cleanup():
    """Background cleanup task"""
    while True:
        try:
            cleanup_expired_sessions()
            await asyncio.sleep(120)  # Every 2 minutes
        except Exception as e:
            print(f"❌ Cleanup error: {e}")
            await asyncio.sleep(60)

async def background_stats():
    """Background stats logging"""
    while True:
        try:
            log_server_stats()
            await asyncio.sleep(30)  # Every 30 seconds
        except Exception as e:
            print(f"❌ Stats error: {e}")
            await asyncio.sleep(30)

# =============================================================================
# FastAPI app setup
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan"""
    print("🚀 FastAPI WebRTC Debug Server starting...")

    # Start background tasks
    cleanup_task = asyncio.create_task(background_cleanup())
    stats_task = asyncio.create_task(background_stats())
    background_tasks.extend([cleanup_task, stats_task])

    print("✅ Server startup complete")

    yield

    # Cleanup
    print("🛑 Server shutting down...")
    for task in background_tasks:
        task.cancel()

    # Close all connections
    for session in sessions.values():
        if session.broadcaster:
            try:
                await session.broadcaster.close(code=1000, reason="Server shutting down")
            except:
                pass
        for viewer in session.viewers.copy():
            try:
                await viewer.close(code=1000, reason="Server shutting down")
            except:
                pass

    sessions.clear()
    print("✅ Server shutdown complete")

app = FastAPI(
    title="FastAPI WebRTC Debug Server",
    version="1.0.0-debug",
    lifespan=lifespan
)

# =============================================================================
# Routes
# =============================================================================

@app.get("/", response_class=HTMLResponse)
async def serve_viewer():
    """Serve the debug viewer page"""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>FastAPI WebRTC Debug Viewer</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
            overflow-x: hidden;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            color: white;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        input, button {
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        input {
            flex: 1;
            min-width: 120px;
        }
        button {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            cursor: pointer;
            font-weight: 600;
            min-width: 120px;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        button:disabled {
            background: #95a5a6;
            cursor: not-allowed;
            transform: none;
        }
        .status {
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
            font-weight: 600;
            text-align: center;
        }
        .status.connected { background: #00b894; color: white; }
        .status.connecting { background: #fdcb6e; color: white; }
        .status.disconnected { background: #e17055; color: white; }
        .status.error { background: #d63031; color: white; }
        video {
            width: 100%;
            max-height: 500px;
            background: #000;
            border-radius: 10px;
            margin: 15px 0;
        }
        .card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .stats, .log {
            background: #2d3436;
            color: #ddd;
            border-radius: 10px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.4;
            white-space: pre-line;
            max-height: 400px;
            overflow-y: auto;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 FastAPI WebRTC Debug Viewer</h1>
            <p>Enhanced logging to diagnose video stream issues</p>
        </div>

        <div class="card">
            <div class="controls">
                <input type="text" id="sessionCode" placeholder="4-digit session code" maxlength="4" />
                <button onclick="connectToSession()" id="connectBtn">Connect</button>
                <button onclick="disconnectFromSession()" id="disconnectBtn" disabled>Disconnect</button>
                <button onclick="clearConnectionLog()">Clear Log</button>
            </div>

            <div id="status" class="status disconnected">Ready to connect</div>
            <video id="remoteVideo" autoplay playsinline muted controls></video>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="card">
                <h3>📈 Statistics & Debug Info</h3>
                <div class="stats" id="stats">No connection statistics available</div>
            </div>

            <div class="card">
                <h3>📝 Connection Log</h3>
                <div class="log" id="log">Waiting for connection...\\n</div>
            </div>
        </div>
    </div>

    <script>
        let ws, pc, sessionCode;
        let reconnectAttempts = 0;
        let maxReconnectAttempts = 2; // Reduced for debugging
        let connectionStartTime = null;
        let autoReconnectEnabled = true;
        let statsInterval = null;

        const statusEl = document.getElementById('status');
        const video = document.getElementById('remoteVideo');
        const statsEl = document.getElementById('stats');
        const logEl = document.getElementById('log');
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');

        const logMessage = (message, type) => {
            const timestamp = new Date().toLocaleTimeString();
            const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'debug' ? '🔍' : 'ℹ️';
            logEl.textContent += '[' + timestamp + '] ' + emoji + ' ' + message + '\\n';
            logEl.scrollTop = logEl.scrollHeight;
            console.log('[' + type + '] ' + message);
        };

        const setConnectionStatus = (msg, cls) => {
            statusEl.textContent = msg;
            statusEl.className = 'status ' + cls;
        };

        const clearConnectionLog = () => {
            logEl.textContent = 'Log cleared...\\n';
        };

        function connectToSession() {
            sessionCode = document.getElementById('sessionCode').value.trim();
            if (!/^\\d{4}$/.test(sessionCode)) {
                alert('Please enter a 4-digit session code');
                return;
            }

            if (ws && ws.readyState !== WebSocket.CLOSED) {
                logMessage('Already connecting or connected', 'error');
                return;
            }

            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            reconnectAttempts++;

            setConnectionStatus('Connecting... (attempt ' + reconnectAttempts + ')', 'connecting');
            logMessage('Attempting connection to session ' + sessionCode, 'info');

            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + location.host + '/ws/' + sessionCode);

            ws.onopen = () => {
                logMessage('WebSocket connected, requesting session join', 'info');
                ws.send(JSON.stringify({
                    type: 'connect',
                    sessionCode: sessionCode,
                    role: 'viewer',
                    timestamp: Date.now()
                }));
            };

            ws.onmessage = e => handleWebSocketMessage(JSON.parse(e.data));
            ws.onclose = () => {
                logMessage('WebSocket connection closed', 'info');
                handleConnectionLoss();
            };
            ws.onerror = () => {
                logMessage('WebSocket connection error', 'error');
                handleConnectionError();
            };
        }

        function disconnectFromSession() {
            logMessage('Manual disconnect requested', 'info');
            autoReconnectEnabled = false;
            if (ws) ws.close(1000, 'Manual disconnect');
            if (pc) pc.close();
            cleanupConnection();
        }

        function cleanupConnection() {
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
            video.srcObject = null;
            connectionStartTime = null;
            setConnectionStatus('Disconnected', 'disconnected');
            if (statsInterval) {
                clearInterval(statsInterval);
                statsInterval = null;
            }
            statsEl.textContent = 'No connection statistics available';
        }

        function handleConnectionError() {
            logMessage('Connection attempt ' + reconnectAttempts + ' failed', 'error');
            if (autoReconnectEnabled && reconnectAttempts < maxReconnectAttempts) {
                setTimeout(() => {
                    if (autoReconnectEnabled) connectToSession();
                }, 3000);
            } else {
                setConnectionStatus('Connection failed', 'error');
                cleanupConnection();
                reconnectAttempts = 0;
            }
        }

        function handleConnectionLoss() {
            if (pc) {
                pc.close();
                pc = null;
            }
            if (autoReconnectEnabled && reconnectAttempts < maxReconnectAttempts) {
                setTimeout(() => {
                    if (autoReconnectEnabled) connectToSession();
                }, 3000);
            } else {
                cleanupConnection();
                reconnectAttempts = 0;
            }
        }

        function handleWebSocketMessage(msg) {
            logMessage('Received: ' + msg.type, 'info');

            switch (msg.type) {
                case 'connected':
                    setConnectionStatus('Connected to ' + msg.sessionCode, 'connected');
                    logMessage('Successfully connected to session ' + msg.sessionCode, 'success');
                    reconnectAttempts = 0;
                    connectionStartTime = Date.now();
                    createWebRTCPeer();
                    startStatsMonitoring();
                    break;

                case 'offer':
                    logMessage('Received offer from broadcaster - SDP length: ' + (msg.sdp ? msg.sdp.length : 0), 'debug');
                    if (msg.sdp && msg.sdp.includes('video')) {
                        logMessage('✅ Offer contains video track', 'success');
                    }
                    if (msg.sdp && msg.sdp.includes('audio')) {
                        logMessage('✅ Offer contains audio track', 'success');
                    }
                    handleWebRTCOffer(msg);
                    break;

                case 'ice':
                    logMessage('Received ICE candidate: ' + (msg.candidate ? msg.candidate.substring(0, 50) + '...' : 'null'), 'debug');
                    if (pc && msg.candidate) {
                        pc.addIceCandidate(new RTCIceCandidate({
                            candidate: msg.candidate,
                            sdpMLineIndex: msg.sdpMLineIndex,
                            sdpMid: msg.sdpMid
                        })).then(() => {
                            logMessage('ICE candidate added successfully', 'success');
                        }).catch(err => {
                            logMessage('ICE candidate error: ' + err.message, 'error');
                        });
                    }
                    break;

                case 'broadcaster_disconnected':
                    setConnectionStatus('Broadcaster left session', 'disconnected');
                    logMessage('Broadcaster disconnected', 'info');
                    video.srcObject = null;
                    break;

                case 'error':
                    setConnectionStatus('Error: ' + msg.message, 'error');
                    logMessage('Server error: ' + msg.message, 'error');
                    break;

                case 'pong':
                    logMessage('Received pong from server', 'debug');
                    break;

                default:
                    logMessage('Unknown message type: ' + msg.type, 'info');
            }
        }

        function createWebRTCPeer() {
            logMessage('Creating WebRTC peer connection...', 'debug');

            const config = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };

            pc = new RTCPeerConnection(config);

            pc.onicecandidate = e => {
                if (e.candidate) {
                    logMessage('Sending ICE candidate: ' + e.candidate.candidate.substring(0, 50) + '...', 'debug');
                    ws.send(JSON.stringify({
                        type: 'ice',
                        candidate: e.candidate.candidate,
                        sdpMLineIndex: e.candidate.sdpMLineIndex,
                        sdpMid: e.candidate.sdpMid,
                        sessionCode: sessionCode
                    }));
                } else {
                    logMessage('ICE gathering complete', 'debug');
                }
            };

            pc.ontrack = e => {
                logMessage('🎥 Received remote video track!', 'success');
                logMessage('Stream tracks: ' + e.streams[0].getTracks().length, 'debug');
                e.streams[0].getTracks().forEach(track => {
                    logMessage('Track: ' + track.kind + ' - ' + track.label, 'debug');
                });

                video.srcObject = e.streams[0];
                setConnectionStatus('Streaming video', 'connected');

                // Check if video is actually playing
                video.onloadedmetadata = () => {
                    logMessage('Video metadata loaded - ' + video.videoWidth + 'x' + video.videoHeight, 'success');
                };

                video.onplay = () => {
                    logMessage('Video started playing!', 'success');
                };

                video.onerror = (err) => {
                    logMessage('Video error: ' + err.message, 'error');
                };
            };

            pc.onconnectionstatechange = () => {
                logMessage('WebRTC connection state: ' + pc.connectionState, 'debug');
                if (pc.connectionState === 'connected') {
                    logMessage('🎉 WebRTC connection established!', 'success');
                } else if (pc.connectionState === 'failed') {
                    logMessage('WebRTC connection failed!', 'error');
                    handleConnectionError();
                }
            };

            pc.oniceconnectionstatechange = () => {
                logMessage('ICE connection state: ' + pc.iceConnectionState, 'debug');
                if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                    logMessage('🎉 ICE connection established!', 'success');
                } else if (pc.iceConnectionState === 'failed') {
                    logMessage('ICE connection failed!', 'error');
                }
            };

            pc.onsignalingstatechange = () => {
                logMessage('Signaling state: ' + pc.signalingState, 'debug');
            };

            logMessage('WebRTC peer connection created successfully', 'success');
        }

        async function handleWebRTCOffer(msg) {
            try {
                logMessage('Processing offer from broadcaster...', 'debug');
                logMessage('Setting remote description...', 'debug');

                await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
                logMessage('Remote description set successfully', 'success');

                logMessage('Creating answer...', 'debug');
                const answer = await pc.createAnswer();
                logMessage('Answer created - SDP length: ' + answer.sdp.length, 'debug');

                logMessage('Setting local description...', 'debug');
                await pc.setLocalDescription(answer);
                logMessage('Local description set successfully', 'success');

                logMessage('Sending answer to broadcaster...', 'debug');
                ws.send(JSON.stringify({
                    type: 'answer',
                    sdp: answer.sdp,
                    sessionCode: sessionCode
                }));

                logMessage('Answer sent to broadcaster successfully!', 'success');
            } catch (error) {
                logMessage('Error handling offer: ' + error.message, 'error');
                logMessage('Error stack: ' + error.stack, 'error');
            }
        }

        function startStatsMonitoring() {
            if (statsInterval) clearInterval(statsInterval);

            statsInterval = setInterval(async () => {
                if (!pc) return;

                try {
                    const stats = await pc.getStats();
                    let statsText = '🔍 WebRTC Debug Information\\n';
                    statsText += '═══════════════════════════\\n';
                    statsText += 'Connection State: ' + pc.connectionState + '\\n';
                    statsText += 'ICE State: ' + pc.iceConnectionState + '\\n';
                    statsText += 'Signaling State: ' + pc.signalingState + '\\n\\n';

                    let hasInboundVideo = false;
                    let hasOutboundData = false;

                    stats.forEach(report => {
                        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                            hasInboundVideo = true;
                            statsText += '📹 Video Reception:\\n';
                            statsText += '  Packets Received: ' + (report.packetsReceived || 0) + '\\n';
                            statsText += '  Packets Lost: ' + (report.packetsLost || 0) + '\\n';
                            statsText += '  Bytes Received: ' + (report.bytesReceived || 0) + '\\n';
                            if (report.framesReceived) {
                                statsText += '  Frames Received: ' + report.framesReceived + '\\n';
                            }
                            if (report.framesDecoded) {
                                statsText += '  Frames Decoded: ' + report.framesDecoded + '\\n';
                            }
                            if (report.framesDropped) {
                                statsText += '  Frames Dropped: ' + report.framesDropped + '\\n';
                            }
                            if (report.frameWidth && report.frameHeight) {
                                statsText += '  Resolution: ' + report.frameWidth + 'x' + report.frameHeight + '\\n';
                            }
                            if (report.framesPerSecond) {
                                statsText += '  FPS: ' + report.framesPerSecond.toFixed(1) + '\\n';
                            }
                            statsText += '\\n';
                        }

                        if (report.type === 'outbound-rtp') {
                            hasOutboundData = true;
                        }

                        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                            statsText += '🌐 Network Connection:\\n';
                            if (report.currentRoundTripTime) {
                                statsText += '  RTT: ' + (report.currentRoundTripTime * 1000).toFixed(0) + 'ms\\n';
                            }
                            statsText += '  Bytes Sent: ' + (report.bytesSent || 0) + '\\n';
                            statsText += '  Bytes Received: ' + (report.bytesReceived || 0) + '\\n';
                            statsText += '\\n';
                        }
                    });

                    if (!hasInboundVideo) {
                        statsText += '⚠️ No inbound video data detected\\n';
                    }

                    if (connectionStartTime) {
                        const uptime = Math.floor((Date.now() - connectionStartTime) / 1000);
                        statsText += '⏱️ Session Duration: ' + Math.floor(uptime / 60) + ':' + (uptime % 60).toString().padStart(2, '0') + '\\n';
                    }

                    // Video element status
                    if (video.srcObject) {
                        statsText += '\\n📺 Video Element Status:\\n';
                        statsText += '  Has Stream: ✅\\n';
                        statsText += '  Video Tracks: ' + video.srcObject.getVideoTracks().length + '\\n';
                        statsText += '  Audio Tracks: ' + video.srcObject.getAudioTracks().length + '\\n';
                        statsText += '  Video Size: ' + video.videoWidth + 'x' + video.videoHeight + '\\n';
                        statsText += '  Paused: ' + (video.paused ? '❌' : '✅') + '\\n';
                        statsText += '  Muted: ' + (video.muted ? '🔇' : '🔊') + '\\n';
                    } else {
                        statsText += '\\n📺 Video Element: No stream assigned\\n';
                    }

                    statsEl.textContent = statsText;
                } catch (error) {
                    statsEl.textContent = 'Error collecting stats: ' + error.message;
                }
            }, 2000);
        }

        // Send ping every 25 seconds
        setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
        }, 25000);

        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('sessionCode').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') connectToSession();
            });

            window.addEventListener('beforeunload', () => {
                if (ws) ws.close();
                if (pc) pc.close();
            });

            document.getElementById('sessionCode').focus();
            logMessage('FastAPI WebRTC Debug Viewer initialized', 'success');
        });
    </script>
</body>
</html>"""

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    total_broadcasters = sum(1 for s in sessions.values() if s.broadcaster)
    total_viewers = sum(len(s.viewers) for s in sessions.values())

    return {
        "status": "healthy",
        "active_sessions": len(sessions),
        "total_broadcasters": total_broadcasters,
        "total_viewers": total_viewers,
        "uptime": time.time(),
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0-debug"
    }

@app.get("/api/sessions")
async def get_sessions():
    """Get all sessions"""
    return {
        "total_sessions": len(sessions),
        "sessions": [session.get_stats() for session in sessions.values()],
        "timestamp": datetime.now().isoformat()
    }

# =============================================================================
# WebSocket endpoint with detailed logging
# =============================================================================

@app.websocket("/ws/{session_code}")
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
                    current_session, role = await handle_connect(websocket, msg)

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
        await handle_disconnect(current_session, websocket)
        print(f"✅ Cleanup completed for connection {connection_id}")

# =============================================================================
# Development server runner
# =============================================================================

if __name__ == "__main__":
    print("🔧 Starting FastAPI WebRTC Debug Server...")
    print("🔍 This version has detailed logging to help diagnose video streaming issues")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=False,
        log_level="warning",
        access_log=False
    )