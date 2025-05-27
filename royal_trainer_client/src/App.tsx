import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Wifi, WifiOff, Clock, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import ConnectionSection from './components/ConnectionSection';
import VideoStream from './components/VideoStream';
import StatusBadge from './components/StatusBadge';
import { useWebRTC } from './hooks/useWebRTC';
import type { ConnectionState } from './types';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  const {
    videoRef,
    connect,
    disconnect,
    isConnected,
    connectionError,
    streamStats
  } = useWebRTC();

  // Update connection state based on WebRTC status
  useEffect(() => {
    if (isConnecting) {
      setConnectionState('connecting');
    } else if (isConnected) {
      setConnectionState('live');
      if (!startTime) {
        setStartTime(new Date());
        // Celebration confetti when connected!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ffd700', '#ff0000', '#b154ff']
        });
      }
    } else {
      setConnectionState('offline');
      setStartTime(null);
    }
  }, [isConnecting, isConnected, startTime]);

  // Update elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && connectionState === 'live') {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = now.getTime() - startTime.getTime();
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, connectionState]);

  const handleConnect = async () => {
    if (sessionCode.length !== 4) return;

    setIsConnecting(true);
    try {
      await connect(sessionCode);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setStartTime(null);
    setElapsedTime('00:00:00');
  };

  const handleSessionCodeChange = (code: string) => {
    setSessionCode(code);
  };

  return (
    <div className="min-h-screen bg-cr-gradient relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-32 h-32 bg-cr-gold rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-32 right-16 w-48 h-48 bg-cr-purple rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-cr-orange rounded-full blur-2xl animate-bounce-slow"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="text-6xl mb-4 animate-float"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            👑
          </motion.div>
          <h1 className="text-5xl font-bold bg-gold-gradient bg-clip-text text-transparent mb-2">
            Royal Trainer
          </h1>
          <p className="text-xl text-white/90">Live Clash Royale Streaming</p>
        </motion.div>

        {/* Status Bar */}
        <motion.div
          className="flex flex-wrap justify-center gap-4 mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <StatusBadge
            icon={connectionState === 'live' ? Wifi : WifiOff}
            text={connectionState}
            variant={connectionState}
          />

          {connectionState === 'live' && (
            <>
              <StatusBadge
                icon={Clock}
                text={elapsedTime}
                variant="info"
              />

              {streamStats && (
                <StatusBadge
                  icon={Zap}
                  text={`${streamStats.fps || 0} FPS`}
                  variant="info"
                />
              )}
            </>
          )}
        </motion.div>

        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8">
          {/* Left Column - Connection */}
          <motion.div
            className="lg:w-1/3"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <ConnectionSection
              sessionCode={sessionCode}
              onSessionCodeChange={handleSessionCodeChange}
              connectionState={connectionState}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              isConnecting={isConnecting}
              connectionError={connectionError}
            />
          </motion.div>

          {/* Right Column - Video Stream */}
          <motion.div
            className="lg:w-2/3"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <AnimatePresence mode="wait">
              {connectionState === 'live' ? (
                <motion.div
                  key="video"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                >
                  <VideoStream
                    videoRef={videoRef}
                    sessionCode={sessionCode}
                    streamStats={streamStats}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-cr-navy/80 border-4 border-cr-gold rounded-2xl p-12 text-center backdrop-blur-sm"
                >
                  <div className="text-6xl mb-4 opacity-50">📱</div>
                  <h3 className="text-2xl font-bold text-cr-gold mb-2">
                    Ready to Connect
                  </h3>
                  <p className="text-white/70">
                    Enter your 4-digit session code to start streaming
                  </p>

                  {/* Getting Started Guide */}
                  <div className="mt-8 text-left max-w-md mx-auto">
                    <h4 className="text-lg font-bold text-cr-purple mb-4 flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      Getting Started
                    </h4>
                    <div className="space-y-3 text-sm text-white/70">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-cr-gold text-cr-brown rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                        <div>Open the Royal Trainer iOS app on your device</div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-cr-gold text-cr-brown rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                        <div>Start screen recording your Clash Royale gameplay</div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-cr-gold text-cr-brown rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                        <div>Note the 4-digit code displayed on your screen</div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-cr-gold text-cr-brown rounded-full flex items-center justify-center text-xs font-bold mt-0.5">4</div>
                        <div>Enter the code above and click Connect</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Footer Info */}
        <motion.div
          className="mt-12 text-center text-white/50 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <div className="flex items-center justify-center gap-4 mb-2">
            <span>🏆 Royal Trainer</span>
            <span>•</span>
            <span>📱 Live Streaming</span>
            <span>•</span>
            <span>⚡ Real-time</span>
          </div>
          <div className="text-xs text-white/30">
            Professional Clash Royale streaming platform
          </div>
        </motion.div>
      </div>

      {/* Connection Status Indicator */}
      {connectionState === 'connecting' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-4 right-4 bg-cr-orange/90 backdrop-blur-xl border-2 border-cr-orange rounded-xl p-3 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-white font-medium text-sm">Connecting to stream...</span>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      {connectionError && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 bg-red-600/90 backdrop-blur-xl border-2 border-red-500 rounded-xl p-4 shadow-xl max-w-sm"
        >
          <div className="text-white">
            <div className="font-bold">Connection Error</div>
            <div className="text-sm">{connectionError.message}</div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default App;