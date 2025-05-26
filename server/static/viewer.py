def get_viewer_html_inline() -> str:
    """Alternative: Get viewer HTML with inline JavaScript (cleaned up)"""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>FastAPI WebRTC Viewer</title>
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
            max-height: 300px;
            overflow-y: auto;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎥 FastAPI WebRTC Viewer</h1>
            <p>Real-time streaming with comprehensive monitoring</p>
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
                <h3>📈 Statistics</h3>
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
        let maxReconnectAttempts = 5;
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
            const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
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
                    logMessage('Received offer from broadcaster', 'info');
                    handleWebRTCOffer(msg);
                    break;

                case 'ice':
                    if (pc && msg.candidate) {
                        pc.addIceCandidate(new RTCIceCandidate({
                            candidate: msg.candidate,
                            sdpMLineIndex: msg.sdpMLineIndex,
                            sdpMid: msg.sdpMid
                        })).catch(err => logMessage('ICE candidate error: ' + err.message, 'error'));
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
                    break;

                default:
                    logMessage('Unknown message type: ' + msg.type, 'info');
            }
        }

        function createWebRTCPeer() {
            const config = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };

            pc = new RTCPeerConnection(config);

            pc.onicecandidate = e => {
                if (e.candidate) {
                    ws.send(JSON.stringify({
                        type: 'ice',
                        candidate: e.candidate.candidate,
                        sdpMLineIndex: e.candidate.sdpMLineIndex,
                        sdpMid: e.candidate.sdpMid,
                        sessionCode: sessionCode
                    }));
                }
            };

            pc.ontrack = e => {
                logMessage('Received remote video track', 'success');
                video.srcObject = e.streams[0];
                setConnectionStatus('Streaming video', 'connected');
            };

            pc.onconnectionstatechange = () => {
                logMessage('Connection state: ' + pc.connectionState, 'info');
                if (pc.connectionState === 'failed') {
                    handleConnectionError();
                }
            };

            logMessage('WebRTC peer connection created', 'info');
        }

        async function handleWebRTCOffer(msg) {
            try {
                await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                ws.send(JSON.stringify({
                    type: 'answer',
                    sdp: answer.sdp,
                    sessionCode: sessionCode
                }));

                logMessage('Answer sent to broadcaster', 'success');
            } catch (error) {
                logMessage('Error handling offer: ' + error.message, 'error');
            }
        }

        function startStatsMonitoring() {
            if (statsInterval) clearInterval(statsInterval);

            statsInterval = setInterval(async () => {
                if (!pc) return;

                try {
                    const stats = await pc.getStats();
                    let statsText = 'Connection State: ' + pc.connectionState + '\\n';
                    statsText += 'ICE State: ' + pc.iceConnectionState + '\\n\\n';

                    stats.forEach(report => {
                        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                            statsText += 'Video Stats:\\n';
                            statsText += '  Packets: ' + (report.packetsReceived || 0) + '\\n';
                            statsText += '  Bytes: ' + (report.bytesReceived || 0) + '\\n';
                            if (report.framesPerSecond) {
                                statsText += '  FPS: ' + report.framesPerSecond.toFixed(1) + '\\n';
                            }
                        }
                    });

                    if (connectionStartTime) {
                        const uptime = Math.floor((Date.now() - connectionStartTime) / 1000);
                        statsText += '\\nUptime: ' + Math.floor(uptime / 60) + ':' + (uptime % 60).toString().padStart(2, '0') + '\\n';
                    }

                    statsEl.textContent = statsText;
                } catch (error) {
                    statsEl.textContent = 'Error collecting stats: ' + error.message;
                }
            }, 2000);
        }

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
            logMessage('FastAPI WebRTC Viewer initialized', 'success');
        });
    </script>
</body>
</html>"""
