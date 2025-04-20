import React, { useEffect, useState } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { Controls } from "./components/Controls";
import { VideoPlayer } from "./components/VideoPlayer";
import { Metrics } from "./components/Metrics";
import { MLDetection } from "./components/ml/MlDetection";
import { DebugPanel } from "./components/Debug";
import "./App.css";
import FrameCapture from "./components/FrameCapture";

export const App: React.FC = () => {
  const {
    status,
    resolution,
    rtt,
    fps,
    connect,
    reset,
    videoElement,
    disconnect,
  } = useWebRTC();

  const [code, setCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const codeReady = code.length === 4;
  const [prevStatus, setPrevStatus] = useState(status);

  // Reset input if user stops connection
  useEffect(() => {
    if (prevStatus === "connected" && status === "disconnected") {
      setCode("");
    }
    setPrevStatus(status);
  }, [prevStatus, status]);

  // Add keyboard shortcut to toggle debug panel (Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setShowDebug(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInput = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 4);
    if (status === "invalid") reset();
    setCode(cleaned);
  };

  const handleConnect = async () => {
    if (status === "connected") {
      disconnect();     // ← will trigger input reset below
      return;
    }

    if (!codeReady) return;

    setConnecting(true);
    try {
      await connect(code);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <main className="layout">
      <VideoPlayer videoRef={videoElement} />

      <aside className="sidebar">

        <div className="pills">
          <span
            className={`pill ${status === "connected" ? "pill-live" : "pill-off"
              }`}
          >
            {status === "connected" ? "LIVE" : "OFFLINE"}
          </span>
          <span className="pill pill-timer">
            <Controls.Timer status={status} />
          </span>

          {/* Debug toggle */}
          <span
            className={`pill pill-debug ${showDebug ? 'active' : ''}`}
            onClick={() => setShowDebug(!showDebug)}
            title="Toggle Debug Panel (Ctrl+D)"
          >
            DEBUG
          </span>
        </div>

        <label className="code-label" htmlFor="code">
          Session Code
        </label>
        <input
          id="code"
          className="code-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="1234"
          value={code}
          disabled={status === "connected"}
          onChange={(e) => handleInput(e.target.value)}
        />

        <Controls
          status={status}
          onConnect={handleConnect}
          connecting={connecting}
          codeReady={codeReady}
        />

        {/* Add Frame Capture component */}
        <FrameCapture
          sessionCode={code}
          isConnected={status === "connected"}
          videoRef={videoElement}
        />

        <Metrics resolution={resolution} fps={fps} rtt={rtt} />


        {/* Supercell Logo Detection Component */}
        <MLDetection
          sessionCode={code}
          connected={status === "connected"}
        />
      </aside>

      {/* Debug Panel */}
      {showDebug && (
        <DebugPanel
          sessionCode={code}
          connected={status === "connected"}
          onClose={() => setShowDebug(false)}
        />
      )}
    </main>
  );
};