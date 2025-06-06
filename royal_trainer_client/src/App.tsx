// royal_trainer_client/src/App.tsx - Complete with Anti-Piracy Watermark System

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Wifi,
  WifiOff,
  Clock,
  Zap,
  Play,
  Activity,
  Brain,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Target,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Existing component imports
import ConnectionSection from './components/ConnectionSection';
import VideoStream from './components/VideoStream';
import StatusBadge from './components/StatusBadge';
import InferencePanel from './components/InferencePanel';
import LatencyDisplay from './components/LatencyDisplay';
import InferenceControlPanel from './components/inference/InferenceControlPanel';

// Hook imports
import { useWebRTCWithFrameCapture } from './hooks/useWebRTCWithFrameCapture';
import { useInference } from './hooks/useInference';

// Type imports
import type { ConnectionState, Detection } from './types';

// NEW: Anti-piracy watermark imports
import AntiPiracyWatermark from './components/AntiPiracyWatermark';
import WatermarkSettings from './components/WatermarkSettings';

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
  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [showConnectionLoader, setShowConnectionLoader] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Layout state
  const [isVideoMinimized, setIsVideoMinimized] = useState(true);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showLatencyPanel, setShowLatencyPanel] = useState(false);

  // Detection History
  const [detectionHistory, setDetectionHistory] = useState<DetectionHistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<DetectionHistoryItem | null>(null);

  // WebRTC and Inference hooks
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

  // NEW: Anti-piracy and security measures
  // useEffect(() => {
  //   const preventRightClick = (e: MouseEvent) => {
  //     e.preventDefault();
  //     console.warn('🛡️ Right-click disabled for security');

  //     // Log security event
  //     const securityEvent = {
  //       type: 'RIGHT_CLICK_ATTEMPT',
  //       timestamp: new Date().toISOString(),
  //       userAgent: navigator.userAgent,
  //       url: window.location.href,
  //       sessionCode: sessionCode
  //     };

  //     const logs = JSON.parse(localStorage.getItem('royal-trainer-security-logs') || '[]');
  //     logs.push(securityEvent);
  //     localStorage.setItem('royal-trainer-security-logs', JSON.stringify(logs));

  //     return false;
  //   };

  //   const preventKeyboardShortcuts = (e: KeyboardEvent) => {
  //     // Prevent common developer tools shortcuts
  //     const isDevToolsShortcut =
  //       (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
  //       (e.ctrlKey && e.key === 'u') ||
  //       e.key === 'F12' ||
  //       (e.ctrlKey && e.shiftKey && e.key === 'Delete') ||
  //       (e.ctrlKey && e.key === 's'); // Prevent save

  //     if (isDevToolsShortcut) {
  //       e.preventDefault();
  //       console.warn('🛡️ Developer tools access prevented');

  //       // Log security event
  //       const securityEvent = {
  //         type: 'DEVTOOLS_SHORTCUT_ATTEMPT',
  //         timestamp: new Date().toISOString(),
  //         key: e.key,
  //         ctrlKey: e.ctrlKey,
  //         shiftKey: e.shiftKey,
  //         userAgent: navigator.userAgent,
  //         sessionCode: sessionCode
  //       };

  //       const logs = JSON.parse(localStorage.getItem('royal-trainer-security-logs') || '[]');
  //       logs.push(securityEvent);
  //       localStorage.setItem('royal-trainer-security-logs', JSON.stringify(logs));

  //       return false;
  //     }
  //   };

  //   const preventDragDrop = (e: DragEvent) => {
  //     e.preventDefault();
  //     return false;
  //   };

  //   const preventSelection = (e: Event) => {
  //     e.preventDefault();
  //     return false;
  //   };

  //   // Detect developer tools by monitoring window size changes
  //   const detectDevTools = () => {
  //     const threshold = 160;

  //     const detectBySize = () => {
  //       if (
  //         window.outerHeight - window.innerHeight > threshold ||
  //         window.outerWidth - window.innerWidth > threshold
  //       ) {
  //         console.warn('🛡️ Developer tools detected - security event logged');

  //         const securityEvent = {
  //           type: 'DEVTOOLS_DETECTED',
  //           timestamp: new Date().toISOString(),
  //           userAgent: navigator.userAgent,
  //           windowSize: {
  //             inner: { width: window.innerWidth, height: window.innerHeight },
  //             outer: { width: window.outerWidth, height: window.outerHeight }
  //           },
  //           sessionCode: sessionCode
  //         };

  //         const logs = JSON.parse(localStorage.getItem('royal-trainer-security-logs') || '[]');
  //         logs.push(securityEvent);
  //         localStorage.setItem('royal-trainer-security-logs', JSON.stringify(logs));
  //       }
  //     };

  //     detectBySize();
  //   };

  //   // Monitor for console tampering
  //   const detectConsoleTampering = () => {
  //     const originalLog = console.log;
  //     console.log = function (...args) {
  //       // Check if someone is trying to disable watermarks via console
  //       const message = args.join(' ').toLowerCase();
  //       if (message.includes('watermark') || message.includes('disable') || message.includes('hide')) {
  //         const securityEvent = {
  //           type: 'CONSOLE_TAMPERING_DETECTED',
  //           timestamp: new Date().toISOString(),
  //           message: args.join(' '),
  //           sessionCode: sessionCode
  //         };

  //         const logs = JSON.parse(localStorage.getItem('royal-trainer-security-logs') || '[]');
  //         logs.push(securityEvent);
  //         localStorage.setItem('royal-trainer-security-logs', JSON.stringify(logs));
  //       }
  //       originalLog.apply(console, args);
  //     };
  //   };

  //   // Add event listeners
  //   document.addEventListener('contextmenu', preventRightClick);
  //   document.addEventListener('keydown', preventKeyboardShortcuts);
  //   document.addEventListener('dragstart', preventDragDrop);
  //   document.addEventListener('selectstart', preventSelection);

  //   // Initialize console monitoring
  //   detectConsoleTampering();

  //   // Check for developer tools periodically
  //   const devToolsInterval = setInterval(detectDevTools, 2000);

  //   // Monitor for window focus/blur (potential screen recording detection)
  //   const handleVisibilityChange = () => {
  //     if (document.hidden) {
  //       const securityEvent = {
  //         type: 'WINDOW_HIDDEN',
  //         timestamp: new Date().toISOString(),
  //         sessionCode: sessionCode
  //       };

  //       const logs = JSON.parse(localStorage.getItem('royal-trainer-security-logs') || '[]');
  //       logs.push(securityEvent);
  //       localStorage.setItem('royal-trainer-security-logs', JSON.stringify(logs));
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);

  //   // Cleanup
  //   return () => {
  //     document.removeEventListener('contextmenu', preventRightClick);
  //     document.removeEventListener('keydown', preventKeyboardShortcuts);
  //     document.removeEventListener('dragstart', preventDragDrop);
  //     document.removeEventListener('selectstart', preventSelection);
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //     clearInterval(devToolsInterval);
  //   };
  // }, [sessionCode]);

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

  // Connection handlers
  const handleConnect = async () => {
    if (sessionCode.length !== 4) return;

    setIsConnecting(true);
    setShowConnectionLoader(true);

    const timeout = setTimeout(() => {
      console.log('Connection timeout - resetting to offline state');
      setIsConnecting(false);
      setShowConnectionLoader(false);
      setConnectionState('offline');
    }, 10000); // Increased timeout to 10 seconds

    setConnectionTimeout(timeout);

    try {
      await connect(sessionCode);
      setIsConnecting(false);
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
    setIsConnecting(false);
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

  const handleSessionCodeChange = (code: string) => {
    setSessionCode(code);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
    };
  }, [connectionTimeout]);

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
            <div className="text-xs bg-red-600/20 border border-red-500/40 rounded-full px-2 py-1 text-red-300 font-bold">
              BETA
            </div>
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

                  {/* Left Sidebar - Fixed width */}
                  <motion.div
                    className="col-span-3 w-full max-w-sm space-y-3 overflow-y-auto overflow-x-hidden thin-scrollbar"
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

                    {/* NEW: Watermark Settings Panel */}
                    <WatermarkSettings />

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

                  {/* Center - Video Stream */}
                  <motion.div
                    className="col-span-5 flex flex-col"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    {/* Video Container */}
                    <div className={`transition-all duration-300 ${isVideoMinimized ? 'h-48' : 'h-3/5'} mb-3`}>
                      <VideoStream
                        videoRef={videoRef}
                        sessionCode={sessionCode}
                        streamStats={streamStats}
                      />
                    </div>

                    {/* Bottom Stats Area */}
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
                                      className={`w-full p-2 rounded-lg text-left transition-all ${(selectedHistoryItem as DetectionHistoryItem | null)?.id === item.id
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

                              <div className="flex justify-between items-center">
                                <span className="text-white/70">AI Status:</span>
                                <span className={`font-bold ${isInferenceEnabled ? 'text-green-400' : 'text-red-400'}`}>
                                  {isInferenceEnabled ? 'Active' : 'Inactive'}
                                </span>
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

                    {/* Beta Warning */}
                    <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-8 max-w-2xl mx-auto">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-300 font-bold">CONFIDENTIAL BETA SOFTWARE</span>
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-red-200 text-sm">
                        This software is protected by anti-piracy measures. All usage is monitored and logged.
                        Unauthorized distribution is strictly prohibited.
                      </p>
                    </div>
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

                  {/* Watermark Settings Panel - Always visible on homepage */}
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="mb-12 flex justify-center"
                  >
                    <div className="bg-gradient-to-br from-red-900/50 to-purple-900/50 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        🛡️ Security & Protection
                      </h3>
                      <div className="flex justify-center">
                        <WatermarkSettings />
                      </div>
                      <p className="text-white/70 text-sm mt-4 max-w-md">
                        Configure anti-piracy watermarks and security settings. These measures help protect
                        the confidential nature of this beta software.
                      </p>
                    </div>
                  </motion.div>

                  {/* Model Info Grid */}
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.0 }}
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
                      <div className="text-4xl mb-3">🛡️</div>
                      <div className="text-lg font-bold text-white mb-2">Protected</div>
                      <div className="text-sm text-white/70">Anti-piracy watermarks</div>
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
            <span>•</span>
            <span>🛡️ Anti-Piracy Protected</span>
          </div>
        </motion.div>
      </div>

      {/* NEW: Anti-Piracy Watermark - ALWAYS RENDERED WITH HIGHEST Z-INDEX */}
      <AntiPiracyWatermark />

      {/* Connection Loading Overlay */}
      <AnimatePresence>
        {showConnectionLoader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-lg flex items-center justify-center"
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

              <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3 mt-4">
                <div className="text-red-300 text-sm">
                  🛡️ Secure connection in progress...
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {connectionError && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-gradient-to-r from-red-600 to-red-700 backdrop-blur-xl border border-red-500/50 rounded-2xl p-6 shadow-2xl max-w-md z-[9995]"
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
      </AnimatePresence>

      {/* Custom Scrollbar Styles & Security CSS */}
      <style>{`
        /* Scrollbar Styles */
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

        /* Security CSS - Prevent common bypass attempts */
        body {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }

        * {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }

        /* Prevent text selection on specific elements */
        .no-select {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }

        /* Hide watermarks from print media - but ensure they still appear */
        @media print {
          [class*="watermark"],
          [style*="z-index: 999"] {
            display: block !important;
            visibility: visible !important;
            opacity: 0.8 !important;
            position: fixed !important;
          }
        }

        /* Ensure watermarks stay on top */
        .watermark-overlay {
          position: fixed !important;
          z-index: 9999 !important;
          pointer-events: none !important;
          user-select: none !important;
        }

        /* Prevent iframe embedding */
        html {
          display: block !important;
        }
      `}</style>
    </div>
  );
};

export default App;