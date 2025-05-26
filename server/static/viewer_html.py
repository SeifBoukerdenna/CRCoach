def get_viewer_html() -> str:
    """Get the debug viewer HTML"""
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

    <script src="/static/viewer.js"></script>
</body>
</html>"""