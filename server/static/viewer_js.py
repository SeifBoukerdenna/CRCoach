# =============================================================================
# static/viewer_js.py - Fixed JavaScript without syntax errors
# =============================================================================

def get_viewer_js() -> str:
    """Get the viewer JavaScript - fixed syntax errors"""
    return """
        let ws, pc, sessionCode;
        let reconnectAttempts = 0;
        let maxReconnectAttempts = 2;
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
    """