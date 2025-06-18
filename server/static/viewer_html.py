# server/static/viewer_html.py - Updated with Discord authentication
def get_viewer_html() -> str:
    """Get the viewer HTML with Discord authentication integration"""
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRCoach Viewer - Real-time Screen Streaming</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .header {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 1rem 2rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .title {
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(45deg, #4f46e5, #7c3aed);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .main-container {
            display: flex;
            flex: 1;
            gap: 1rem;
            padding: 1rem;
        }

        .video-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .connection-panel {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .input-group {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        #sessionCode {
            flex: 1;
            padding: 0.75rem;
            border: 2px solid rgba(255, 255, 255, 0.3);
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border-radius: 8px;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.3s;
        }

        #sessionCode:focus {
            border-color: #4f46e5;
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 0.9rem;
        }

        .btn-primary {
            background: linear-gradient(45deg, #4f46e5, #7c3aed);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        }

        .btn-danger {
            background: linear-gradient(45deg, #ef4444, #dc2626);
            color: white;
        }

        .btn-danger:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .video-container {
            flex: 1;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 12px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            min-height: 400px;
        }

        #remoteVideo {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .status {
            text-align: center;
            padding: 1rem;
            border-radius: 8px;
            font-weight: 600;
            margin-bottom: 1rem;
        }

        .status.connecting {
            background: rgba(251, 191, 36, 0.2);
            color: #fbbf24;
            border: 1px solid #fbbf24;
        }

        .status.connected {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
            border: 1px solid #22c55e;
        }

        .status.error {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid #ef4444;
        }

        .status.disconnected {
            background: rgba(107, 114, 128, 0.2);
            color: #9ca3af;
            border: 1px solid #9ca3af;
        }

        .sidebar {
            width: 350px;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .stats-panel, .log-panel {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .panel-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #e5e7eb;
        }

        #stats {
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            line-height: 1.4;
            color: #d1d5db;
        }

        .log-panel {
            flex: 1;
            min-height: 300px;
        }

        #log {
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 1rem;
            height: 250px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
            line-height: 1.4;
            color: #d1d5db;
            resize: vertical;
        }

        #log::-webkit-scrollbar {
            width: 6px;
        }

        #log::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }

        #log::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
        }

        .clear-log-btn {
            margin-top: 0.5rem;
            padding: 0.5rem 1rem;
            font-size: 0.8rem;
        }

        .placeholder {
            color: #9ca3af;
            font-size: 1.1rem;
            text-align: center;
        }

        @media (max-width: 768px) {
            .main-container {
                flex-direction: column;
            }

            .sidebar {
                width: 100%;
            }
        }

        /* NEW: Discord auth styles are in discord_auth.js */

    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">🎮 CRCoach Viewer</h1>
    </div>

    <div class="main-container">
        <div class="video-section">
            <!-- Connection Panel -->
            <div class="connection-panel">
                <div id="status" class="status disconnected">Disconnected</div>

                <div class="input-group">
                    <input
                        type="text"
                        id="sessionCode"
                        placeholder="Enter 4-digit session code"
                        maxlength="4"
                        pattern="\\d{4}"
                    >
                    <button id="connectBtn" class="btn btn-primary">Connect</button>
                    <button id="disconnectBtn" class="btn btn-danger" disabled>Disconnect</button>
                </div>
            </div>

            <!-- Video Container -->
            <div class="video-container">
                <video id="remoteVideo" autoplay playsinline muted></video>
                <div id="videoPlaceholder" class="placeholder">
                    Waiting for connection...
                </div>
            </div>
        </div>

        <div class="sidebar">
            <!-- Stats Panel -->
            <div class="stats-panel">
                <h3 class="panel-title">📊 Connection Stats</h3>
                <div id="stats">No connection data</div>
            </div>

            <!-- Log Panel -->
            <div class="log-panel">
                <h3 class="panel-title">📝 Connection Log</h3>
                <div id="log">Ready to connect...\n</div>
                <button onclick="clearConnectionLog()" class="btn btn-primary clear-log-btn">Clear Log</button>
            </div>
        </div>
    </div>

    <!-- Discord Authentication Script -->
    <script src="/static/discord_auth.js"></script>

    <!-- Main Viewer Script -->
    <script src="/static/viewer.js"></script>
</body>
</html>
    """