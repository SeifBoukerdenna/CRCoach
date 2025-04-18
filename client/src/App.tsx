import React, { useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { Controls } from './components/Controls';
import { VideoPlayer } from './components/VideoPlayer';
import { Metrics } from './components/Metrics';
import './App.css';

export const App: React.FC = () => {
  const { status, resolution, rtt, connect, videoElement } = useWebRTC();
  const [connecting, setConnecting] = useState(false);
  const [fps] = useState('— FPS');

  const handleConnect = async () => {
    setConnecting(true);
    await connect();
    setConnecting(false);
  };

  return (
    <main className="layout">
      {/* left – live feed */}
      <VideoPlayer videoRef={videoElement} />

      {/* right – title + controls + metrics */}
      <aside className="sidebar">
        {/* ⬇️ NEW  header now lives here  */}
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
      </aside>
    </main>
  );
};
