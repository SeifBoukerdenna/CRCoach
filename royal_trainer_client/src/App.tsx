import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Wifi, WifiOff, Clock, Zap, Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import ConnectionSection from './components/ConnectionSection';
import VideoStream from './components/VideoStream';
import StatusBadge from './components/StatusBadge';
import InferencePanel from './components/InferencePanel';
import InferenceControlPanel from './components/inference/InferenceControlPanel';
import { useWebRTC } from './hooks/useWebRTC';
import { useInference } from './hooks/useInference';
import type { ConnectionState } from './types';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [, setIsInferenceEnabled] = useState(false);
  const [showConnectionLoader, setShowConnectionLoader] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  const {
    videoRef,
    connect,
    disconnect,
    isConnected,
    connectionError,
    streamStats
  } = useWebRTC();

  const {
    inferenceData,
    isInferenceActive,
    inferenceStats
  } = useInference(sessionCode, isConnected);

  // Update connection state based on WebRTC status
  useEffect(() => {
    if (isConnecting) {
      setConnectionState('connecting');
    } else if (isConnected) {
      setConnectionState('live');
      // Hide loading screen when connected
      setShowConnectionLoader(false);
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }
      if (!startTime) {
        setStartTime(new Date());
        // Celebration confetti when connected!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ffd700', '#ff0000', '#b154ff', '#00ff00']
        });
      }
    } else {
      setConnectionState('offline');
      setStartTime(null);
      // Hide loading screen when offline
      setShowConnectionLoader(false);
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }
    }
  }, [isConnecting, isConnected, startTime, connectionTimeout]);

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
    setShowConnectionLoader(true);

    // Set timeout to reset after 6 seconds if no connection
    const timeout = setTimeout(() => {
      console.log('Connection timeout - resetting to offline state');
      setIsConnecting(false);
      setShowConnectionLoader(false);
      setConnectionState('offline');
      // Could also show an error message here
    }, 6000);

    setConnectionTimeout(timeout);

    try {
      await connect(sessionCode);
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnecting(false);
      setShowConnectionLoader(false);
      if (timeout) {
        clearTimeout(timeout);
        setConnectionTimeout(null);
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setStartTime(null);
    setElapsedTime('00:00:00');
    setShowConnectionLoader(false);
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [connectionTimeout]);

  const handleSessionCodeChange = (code: string) => {
    setSessionCode(code);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full blur-2xl animate-bounce delay-500"></div>
        <div className="absolute bottom-1/4 left-1/2 w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-2xl animate-pulse delay-2000"></div>
      </div>

      {/* Elegant grid pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 min-h-screen p-3">
        {/* Compact Header */}
        <motion.div
          className="text-center mb-4 pt-4"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="text-5xl mb-3"
            animate={{
              rotateY: [0, 10, -10, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
          >
            👑
          </motion.div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 bg-clip-text text-transparent mb-2 tracking-tight">
            Royal Trainer
          </h1>
          <p className="text-lg text-white/90 font-medium">Professional Clash Royale Analysis</p>
          <div className="mt-2 text-sm text-white/70">Real-time AI-powered game insights</div>
        </motion.div>

        {/* Compact Status Bar */}
        <motion.div
          className="flex flex-wrap justify-center gap-3 mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <StatusBadge
            icon={connectionState === 'live' ? Wifi : WifiOff}
            text={connectionState.toUpperCase()}
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

              {isInferenceActive && (
                <StatusBadge
                  icon={Play}
                  text="AI ACTIVE"
                  variant="inference"
                />
              )}
            </>
          )}
        </motion.div>

        {/* Main Content Grid - Larger video section */}
        <div className="max-w-[2000px] mx-auto px-2">
          <AnimatePresence mode="wait">
            {connectionState === 'live' ? (
              <motion.div
                key="live-content"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-8 xl:grid-cols-9 gap-4"
              >
                {/* Left Controls Column - Smaller */}
                <motion.div
                  className="lg:col-span-2 xl:col-span-2 space-y-4"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
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

                  <InferenceControlPanel
                    sessionCode={sessionCode}
                    isConnected={isConnected}
                    onInferenceStateChange={setIsInferenceEnabled}
                  />
                </motion.div>

                {/* Center Video Column - Much Larger */}
                <motion.div
                  className="lg:col-span-4 xl:col-span-5"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <VideoStream
                    videoRef={videoRef}
                    sessionCode={sessionCode}
                    streamStats={streamStats}
                  />
                </motion.div>

                {/* Right AI Panel Column - Smaller */}
                <motion.div
                  className="lg:col-span-2 xl:col-span-2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <InferencePanel
                    inferenceData={inferenceData}
                    isActive={isInferenceActive}
                    stats={inferenceStats}
                    sessionCode={sessionCode}
                  />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="offline-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto"
              >
                {/* Connection Panel */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
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

                {/* Enhanced Placeholder - Compact */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center shadow-2xl"
                >
                  <motion.div
                    className="text-5xl mb-4 opacity-60"
                    animate={{
                      rotateY: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 6, repeat: Infinity }}
                  >
                    📱
                  </motion.div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-3">
                    Ready to Connect
                  </h3>
                  <p className="text-base text-white/80 mb-6 leading-relaxed">
                    Experience next-generation Clash Royale analysis with real-time AI insights
                  </p>

                  {/* Compact Getting Started Guide */}
                  <div className="text-left max-w-md mx-auto">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      Getting Started
                    </h4>
                    <div className="space-y-3">
                      {[
                        { step: "1", text: "Open Royal Trainer iOS app", icon: "📱" },
                        { step: "2", text: "Start Clash Royale screen recording", icon: "🎮" },
                        { step: "3", text: "Note your 4-digit session code", icon: "🔢" },
                        { step: "4", text: "Enter code and click Connect", icon: "🚀" }
                      ].map((item, index) => (
                        <motion.div
                          key={item.step}
                          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/30"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 rounded-lg flex items-center justify-center text-sm font-black">
                            {item.step}
                          </div>
                          <div className="text-lg">{item.icon}</div>
                          <div className="text-white/90 text-sm font-medium">{item.text}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Compact Footer */}
        <motion.div
          className="mt-8 text-center text-white/40 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <div className="flex items-center justify-center gap-4 mb-2 text-base">
            <span className="flex items-center gap-2">🏆 Royal Trainer</span>
            <span>•</span>
            <span className="flex items-center gap-2">🎯 AI Analysis</span>
            <span>•</span>
            <span className="flex items-center gap-2">⚡ Real-time</span>
          </div>
          <div className="text-xs text-white/30">
            Professional Clash Royale streaming and analysis platform
          </div>
        </motion.div>
      </div>

      {/* Beautiful Connection Loading Overlay */}
      <AnimatePresence>
        {showConnectionLoader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-600/50 rounded-3xl p-12 text-center shadow-2xl max-w-md mx-4"
            >
              {/* Animated Crown */}
              <motion.div
                className="text-8xl mb-8"
                animate={{
                  rotateY: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                👑
              </motion.div>

              {/* Loading Title */}
              <motion.h2
                className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Connecting to Royal Stream
              </motion.h2>

              {/* Session Code Display */}
              <div className="mb-8">
                <p className="text-white/70 text-lg mb-3">Session Code:</p>
                <div className="flex justify-center gap-2">
                  {sessionCode.split('').map((digit, index) => (
                    <motion.div
                      key={index}
                      className="w-12 h-12 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-2 border-yellow-400/50 rounded-xl flex items-center justify-center text-2xl font-bold text-yellow-400"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                    >
                      {digit}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Centered Spinning Loading Ring */}
              <div className="relative mb-6 flex justify-center items-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <motion.div
                    className="absolute w-20 h-20 border-4 border-white/20 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                  />
                  <motion.div
                    className="absolute w-20 h-20 border-4 border-transparent border-t-yellow-400 border-r-orange-500 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute w-16 h-16 border-4 border-transparent border-b-purple-500 border-l-blue-500 rounded-full"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  {/* Center dot */}
                  <motion.div
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
              </div>

              {/* Loading Text with Dots */}
              <motion.div
                className="text-white/80 text-lg mb-4"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                Establishing connection
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                >
                  .
                </motion.span>
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                >
                  .
                </motion.span>
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                >
                  .
                </motion.span>
              </motion.div>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 6, ease: "easeOut" }}
                />
              </div>

              {/* Status Messages */}
              <motion.div
                className="text-sm text-white/60"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <motion.p
                  key="status-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  🔗 Connecting to stream server...
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="mt-2"
                >
                  🎮 Waiting for broadcast signal...
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 4 }}
                  className="mt-2"
                >
                  ⚡ Initializing real-time features...
                </motion.p>
              </motion.div>

              {/* Floating Particles Effect */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-400/60 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [-20, -40, -20],
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Connection Status Indicator */}
      {connectionState === 'connecting' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed top-6 right-6 bg-gradient-to-r from-orange-500 to-red-500 backdrop-blur-xl border border-orange-400/50 rounded-2xl p-4 shadow-2xl z-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-white font-semibold">Establishing connection...</span>
          </div>
        </motion.div>
      )}

      {/* Enhanced Error Display */}
      {connectionError && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-red-600 to-red-700 backdrop-blur-xl border border-red-500/50 rounded-2xl p-6 shadow-2xl max-w-md z-50"
        >
          <div className="text-white">
            <div className="font-bold text-lg mb-2">Connection Error</div>
            <div className="text-red-100">{connectionError.message}</div>
            <div className="text-xs text-red-200 mt-2">
              {connectionError.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default App;