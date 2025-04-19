import React, { useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { Controls } from './components/Controls';
import { VideoPlayer } from './components/VideoPlayer';
import { Metrics } from './components/Metrics';
import './App.css';

export const App: React.FC = () => {
  const { status, resolution, rtt, fps, connect, videoElement, debugInfo } = useWebRTC();
  const [connecting, setConnecting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <main className="layout">
      {/* left – live feed */}
      <VideoPlayer videoRef={videoElement} />

      {/* right – title + controls + metrics */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Clash Royale AI Coach <span>🚀</span></h1>
          <p className="tagline">Live strategy feedback from your mobile gameplay</p>
        </div>

        <Controls
          status={status}
          onConnect={handleConnect}
          connecting={connecting}
        />
        <Metrics resolution={resolution} fps={fps} rtt={rtt} />

        {/* Debug section - can be toggled */}
        <div className="debug-controls">
          <button
            className="debug-toggle"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? "Hide Debug Info" : "Show Debug Info"}
          </button>

          {showDebug && (
            <div className="debug-panel">
              <h3>WebRTC Debug Log</h3>
              <pre>{debugInfo || "No debug info yet"}</pre>
            </div>
          )}
        </div>
      </aside>
    </main>
  );
};