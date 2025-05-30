// royal_trainer_client/src/App.tsx - Optimized layout with better space usage

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Wifi, WifiOff, Clock, Zap, Play, Activity, Brain, Maximize2, Minimize2, ChevronDown, ChevronUp, BarChart3, Target, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import ConnectionSection from './components/ConnectionSection';
import VideoStream from './components/VideoStream';
import StatusBadge from './components/StatusBadge';
import InferencePanel from './components/InferencePanel';
import LatencyDisplay from './components/LatencyDisplay';
import { useWebRTCWithFrameCapture } from './hooks/useWebRTCWithFrameCapture';
import { useInference } from './hooks/useInference';
import type { ConnectionState, Detection } from './types';
import InferenceControlPanel from './components/inference/InferenceControlPanel';

// Detection History Interface
interface DetectionHistoryItem {
  id: string;
  timestamp: number;
  detections: Detection[];
  annotatedFrame: string;
  inferenceTime: number;
  sessionCode: string;
}

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [showConnectionLoader, setShowConnectionLoader] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  // New layout state
  const [isVideoMinimized, setIsVideoMinimized] = useState(true);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showLatencyPanel, setShowLatencyPanel] = useState(false);

  // Detection History
  const [detectionHistory, setDetectionHistory] = useState<DetectionHistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<DetectionHistoryItem | null>(null);

  const {
    videoRef,
    connect,
    disconnect,
    isConnected,
    connectionError,
    streamStats,
    latencyStats,
    performLatencyTest,
    isInferenceEnabled,
    toggleInference,
    getFrameStats,
    isCapturing
  } = useWebRTCWithFrameCapture();

  const {
    inferenceData,
    isInferenceActive,
    inferenceStats
  } = useInference(sessionCode, isConnected);

  // Store detection history
  useEffect(() => {
    if (inferenceData && inferenceData.detections.length > 0) {
      const historyItem: DetectionHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        detections: inferenceData.detections,
        annotatedFrame: inferenceData.annotated_frame,
        inferenceTime: inferenceData.inference_time,
        sessionCode: sessionCode
      };

      setDetectionHistory(prev => {
        const newHistory = [historyItem, ...prev].slice(0, 50); // Keep last 50
        return newHistory;
      });
    }
  }, [inferenceData, sessionCode]);

  // Update connection state based on WebRTC status
  useEffect(() => {
    if (isConnecting) {
      setConnectionState('connecting');
    } else if (isConnected) {
      setConnectionState('live');
      setShowConnectionLoader(false);
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }
      if (!startTime) {
        setStartTime(new Date());
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

    const timeout = setTimeout(() => {
      console.log('Connection timeout - resetting to offline state');
      setIsConnecting(false);
      setShowConnectionLoader(false);
      setConnectionState('offline');
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
    setDetectionHistory([]);
    setSelectedHistoryItem(null);
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      setConnectionTimeout(null);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-x-hidden overflow-y-auto">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-16 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full blur-2xl animate-bounce delay-500"></div>
        <div className="absolute bottom-1/4 left-1/2 w-32 h-32 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-2xl animate-pulse delay-2000"></div>
      </div>

      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen p-3">
        {/* Compact Header */}
        <motion.div
          className="text-center mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="text-3xl">👑</div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 bg-clip-text text-transparent tracking-tight">
              Royal Trainer AI
            </h1>
          </div>
        </motion.div>

        {/* Status Bar */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
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

              {/* Enhanced Latency Badge */}
              <motion.button
                onClick={() => setShowLatencyPanel(!showLatencyPanel)}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border-2 font-bold text-xs uppercase tracking-wider backdrop-blur-xl shadow-lg transition-all duration-150 ${latencyStats.current > 0 && isFinite(latencyStats.current)
                  ? latencyStats.current < 50
                    ? 'bg-gradient-to-r from-green-600 to-green-700 border-green-500 text-white'
                    : latencyStats.current < 100
                      ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 border-yellow-500 text-white'
                      : latencyStats.current < 200
                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 border-orange-500 text-white'
                        : 'bg-gradient-to-r from-red-600 to-red-700 border-red-500 text-white'
                  : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500 text-white'
                  } hover:scale-105`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Activity className="w-3 h-3" />
                <span className="font-black tracking-wider">
                  {latencyStats.current > 0 && isFinite(latencyStats.current)
                    ? `${Math.round(latencyStats.current)}MS`
                    : latencyStats.average > 0 && isFinite(latencyStats.average)
                      ? `${Math.round(latencyStats.average)}MS`
                      : 'LATENCY'
                  }
                </span>
              </motion.button>

              {/* AI Status Badge */}
              {isInferenceEnabled && (
                <StatusBadge
                  icon={Brain}
                  text="AI DETECTING"
                  variant="inference"
                />
              )}

              {/* Frame Capture Status */}
              {isCapturing && (
                <StatusBadge
                  icon={Play}
                  text="CAPTURING"
                  variant="info"
                />
              )}
            </>
          )}
        </motion.div>

        {/* Main Content Area - Full Height */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {connectionState === 'live' ? (
              <motion.div
                key="live-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {/* Live Layout - Better proportions */}
                <div className="grid h-full gap-3 grid-cols-12">

                  {/* Left Sidebar - Fixed width, no horizontal scroll */}
                  <motion.div
                    className="col-span-3 max-w-xs space-y-3 overflow-y-auto thin-scrollbar"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
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
                      isInferenceEnabled={isInferenceEnabled}
                      onToggleInference={toggleInference}
                      frameStats={getFrameStats()}
                    />

                    {/* Detection History Panel */}
                    {detectionHistory.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3"
                      >
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-400" />
                          Detection History ({detectionHistory.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar">
                          {detectionHistory.slice(0, 10).map((item) => (
                            <motion.button
                              key={item.id}
                              onClick={() => setSelectedHistoryItem(item)}
                              className={`w-full p-2 rounded-lg text-left transition-all ${selectedHistoryItem?.id === item.id
                                ? 'bg-purple-600/30 border border-purple-500/50'
                                : 'bg-slate-700/30 hover:bg-slate-600/30 border border-transparent'
                                }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="text-xs text-white/80">
                                    {item.detections.length} objects
                                  </div>
                                  <div className="text-xs text-white/60">
                                    {new Date(item.timestamp).toLocaleTimeString()}
                                  </div>
                                </div>
                                <div className="text-xs text-green-400">
                                  {Math.round(item.inferenceTime)}ms
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Advanced Controls Toggle */}
                    <motion.button
                      onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                      className="w-full py-2 px-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white/70 hover:text-white hover:bg-slate-700/50 transition-all flex items-center justify-between"
                    >
                      <span className="text-sm">Advanced</span>
                      {showAdvancedControls ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </motion.button>

                    {/* Collapsible Advanced Controls */}
                    <AnimatePresence>
                      {showAdvancedControls && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-3"
                        >
                          {/* Video Size Toggle */}
                          <motion.button
                            onClick={() => setIsVideoMinimized(!isVideoMinimized)}
                            className="w-full py-2 px-3 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-all flex items-center justify-center gap-2"
                          >
                            {isVideoMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                            <span className="text-sm">{isVideoMinimized ? 'Expand' : 'Minimize'} Video</span>
                          </motion.button>

                          {/* Latency Panel Toggle */}
                          <AnimatePresence>
                            {showLatencyPanel && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="max-h-96 overflow-y-auto thin-scrollbar"
                              >
                                <LatencyDisplay
                                  latencyStats={latencyStats}
                                  streamStats={streamStats}
                                  isConnected={isConnected}
                                  onPerformLatencyTest={performLatencyTest}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Center - Video Stream with better proportions */}
                  <motion.div
                    className="col-span-5 flex flex-col"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    {/* Video Container */}
                    <div className={`transition-all duration-300 ${isVideoMinimized ? 'h-48' : 'h-3/5'
                      } mb-3`}>
                      <VideoStream
                        videoRef={videoRef}
                        sessionCode={sessionCode}
                        streamStats={streamStats}
                      />
                    </div>

                    {/* Bottom Stats Area - Using remaining space */}
                    <div className="flex-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
                      {selectedHistoryItem ? (
                        <div className="h-full flex flex-col overflow-hidden">
                          <div className="flex items-center justify-between mb-3 flex-shrink-0">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                              <Eye className="w-5 h-5 text-purple-400" />
                              Frame Analysis
                            </h4>
                            <button
                              onClick={() => setSelectedHistoryItem(null)}
                              className="text-white/60 hover:text-white"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="flex-1 min-h-0 flex gap-4">
                            {/* Frame Preview */}
                            <div className="flex-1">
                              <img
                                src={`data:image/jpeg;base64,${selectedHistoryItem.annotatedFrame}`}
                                alt="Historical detection frame"
                                className="w-full h-full object-contain bg-black rounded-lg border border-slate-600"
                              />
                            </div>

                            {/* Detection Details */}
                            <div className="w-64 space-y-2 overflow-y-auto thin-scrollbar">
                              <div className="text-sm text-white/60 flex-shrink-0">
                                {new Date(selectedHistoryItem.timestamp).toLocaleString()}
                              </div>
                              {selectedHistoryItem.detections.map((detection, index) => (
                                <div key={index} className="bg-slate-700/50 rounded-lg p-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-white font-medium capitalize">{detection.class}</span>
                                    <span className="text-green-400 text-sm">{Math.round(detection.confidence * 100)}%</span>
                                  </div>
                                  <div className="text-xs text-white/60">
                                    {Math.round(detection.bbox.width)}×{Math.round(detection.bbox.height)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-4 h-full">
                          {/* Performance Stats */}
                          <div className="col-span-2 space-y-4">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                              <BarChart3 className="w-5 h-5 text-blue-400" />
                              Performance Stats
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-400">
                                  {Math.round(inferenceStats.avgInferenceTime || 0)}ms
                                </div>
                                <div className="text-sm text-white/60">Avg Processing</div>
                              </div>

                              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-purple-400">
                                  {(inferenceStats.inferenceFPS || 0).toFixed(1)}
                                </div>
                                <div className="text-sm text-white/60">Inference FPS</div>
                              </div>

                              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-yellow-400">
                                  {inferenceStats.detectionsPerSecond.toFixed(1)}/s
                                </div>
                                <div className="text-sm text-white/60">Detection Rate</div>
                              </div>

                              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-white">
                                  {Math.round(inferenceStats.accuracy || 0)}%
                                </div>
                                <div className="text-sm text-white/60">Accuracy</div>
                              </div>
                            </div>
                          </div>

                          {/* Connection Stats */}
                          <div className="col-span-2 space-y-4">
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                              <Activity className="w-5 h-5 text-green-400" />
                              Connection Stats
                            </h4>

                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-white/70">Stream FPS:</span>
                                <span className="text-white font-bold">{streamStats?.fps || 0}</span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-white/70">Resolution:</span>
                                <span className="text-white font-bold">{streamStats?.resolution || 'N/A'}</span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-white/70">Latency:</span>
                                <span className="text-white font-bold">
                                  {latencyStats.current > 0 ? `${Math.round(latencyStats.current)}ms` : 'N/A'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-white/70">Session:</span>
                                <span className="text-yellow-400 font-mono">{sessionCode}</span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-white/70">Detections:</span>
                                <span className="text-white font-bold">{detectionHistory.length}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Right - AI Inference Panel */}
                  <motion.div
                    className="col-span-4 overflow-hidden"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <div className="h-full">
                      <InferencePanel
                        inferenceData={inferenceData}
                        isActive={isInferenceActive || isInferenceEnabled}
                        stats={inferenceStats}
                        sessionCode={sessionCode}
                      />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="offline-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full flex items-center justify-center"
              >
                {/* Full-screen homepage */}
                <div className="max-w-6xl mx-auto px-6 text-center">
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                  >
                    <div className="text-8xl mb-6">🧠</div>
                    <h2 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-6">
                      AI-Powered Analysis Ready
                    </h2>
                    <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
                      Experience cutting-edge YOLOv8 computer vision for real-time Clash Royale troop detection and analysis.
                      Connect your mobile device and watch AI identify every troop, building, and spell in real-time.
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Connection Panel */}
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
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

                    {/* AI Features Panel */}
                    <motion.div
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8"
                    >
                      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <Crown className="w-6 h-6 text-yellow-400" />
                        AI Features
                      </h3>
                      <div className="space-y-4">
                        {[
                          { step: "1", text: "Real-time troop detection", icon: "⚔️", desc: "Identify knights, archers, giants instantly" },
                          { step: "2", text: "Building & structure analysis", icon: "🏰", desc: "Track towers, cannons, defenses" },
                          { step: "3", text: "Spell & ability tracking", icon: "✨", desc: "Detect fireballs, lightning, freeze" },
                          { step: "4", text: "Performance analytics", icon: "📊", desc: "Frame rates, accuracy, timing" },
                          { step: "5", text: "Frame-by-frame analysis", icon: "🎯", desc: "Historical detection review" }
                        ].map((item, index) => (
                          <motion.div
                            key={item.step}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-all"
                          >
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0">
                              {item.step}
                            </div>
                            <div className="text-2xl flex-shrink-0">{item.icon}</div>
                            <div className="flex-1">
                              <div className="text-white font-bold text-lg">{item.text}</div>
                              <div className="text-white/60 text-sm mt-1">{item.desc}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Model Info Grid */}
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8"
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-3">🧠</div>
                      <div className="text-lg font-bold text-white mb-2">YOLOv8 Model</div>
                      <div className="text-sm text-white/70">State-of-the-art object detection</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl mb-3">⚡</div>
                      <div className="text-lg font-bold text-white mb-2">Real-time Speed</div>
                      <div className="text-sm text-white/70">5+ FPS processing rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl mb-3">🎯</div>
                      <div className="text-lg font-bold text-white mb-2">High Accuracy</div>
                      <div className="text-sm text-white/70">Trained on Clash Royale data</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl mb-3">📱</div>
                      <div className="text-lg font-bold text-white mb-2">Mobile Ready</div>
                      <div className="text-sm text-white/70">Works with any device</div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Compact Footer */}
        <motion.div
          className="mt-3 text-center text-white/30 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-center gap-3">
            <span>🏆 Royal Trainer AI</span>
            <span>•</span>
            <span>🧠 YOLOv8 Detection</span>
            <span>•</span>
            <span>⚡ Real-time Analysis</span>
            <span>•</span>
            <span>📊 Frame History</span>
          </div>
        </motion.div>
      </div>

      {/* Connection Loading Overlay */}
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
                🧠
              </motion.div>

              <motion.h2
                className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent mb-4"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Connecting AI Stream
              </motion.h2>

              <div className="mb-8">
                <p className="text-white/70 text-lg mb-3">Session Code:</p>
                <div className="flex justify-center gap-2">
                  {sessionCode.split('').map((digit, index) => (
                    <motion.div
                      key={index}
                      className="w-12 h-12 bg-gradient-to-br from-purple-400/20 to-blue-500/20 border-2 border-purple-400/50 rounded-xl flex items-center justify-center text-2xl font-bold text-purple-400"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                    >
                      {digit}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="relative mb-6 flex justify-center items-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <motion.div
                    className="absolute w-20 h-20 border-4 border-white/20 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                  />
                  <motion.div
                    className="absolute w-20 h-20 border-4 border-transparent border-t-purple-400 border-r-blue-500 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              </div>

              <motion.div
                className="text-white/80 text-lg mb-4"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                Initializing AI detection system
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
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

      {/* Custom Scrollbar Styles */}
      <style>{`
        .thin-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(177, 84, 255, 0.4);
          border-radius: 2px;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(177, 84, 255, 0.6);
        }
      `}</style>
    </div>
  );
};

export default App;