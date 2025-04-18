import React, { useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { Controls } from './components/Controls';
import { VideoPlayer } from './components/VideoPlayer';
import { Metrics } from './components/Metrics';
import './App.css';

export const App: React.FC = () => {
  const { status, resolution, rtt, connect, videoElement } = useWebRTC();
  const [connecting, setConnecting] = useState(false);
  const [fps,] = useState('— FPS');

  const handleConnect = async () => {
    setConnecting(true);
    await connect();
    setConnecting(false);
  };

  return (
    <div className="app">
      <h1>📱 iOS Live (WebRTC)</h1>

      <Controls status={status} onConnect={handleConnect} connecting={connecting} />
      <VideoPlayer videoRef={videoElement} />
      <Metrics resolution={resolution} fps={fps} rtt={rtt} />
    </div>
  );
};