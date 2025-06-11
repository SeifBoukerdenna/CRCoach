// royal_trainer_client/src/App.tsx - Updated with single viewer enforcement

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Clock,
  Zap,
  Play,
  Activity,
  Brain,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Target,
  Eye,
  Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';

/* ── LAYOUT / OVERLAYS ───────────────────────────────── */
import AnimatedBackground from './components/layout/AnimatedBackground';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ConnectionLoader from './components/overlays/ConnectionLoader';
import ErrorToast from './components/overlays/ErrorToast';

/* ── FEATURE COMPONENTS ─────────────────────── */
import ConnectionSection from './components/ConnectionSection';
import VideoStream from './components/VideoStream';
import StatusBadge from './components/StatusBadge';
import InferencePanel from './components/InferencePanel';
import LatencyDisplay from './components/LatencyDisplay';
import InferenceControlPanel from './components/inference/InferenceControlPanel';
import AntiPiracyWatermark from './components/AntiPiracyWatermark';
import WatermarkSettings from './components/WatermarkSettings';

/* ── HOOKS ───────────────────────────────────────────── */
import { useWebRTCWithFrameCapture } from './hooks/useWebRTCWithFrameCapture';
import { useInference } from './hooks/useInference';

/* ── TYPES ───────────────────────────────────────────── */
import type { ConnectionState, Detection } from './types';

/* ── LOCAL TYPES ─────────────────────────────────────── */
interface DetectionHistoryItem {
  id: string;
  timestamp: number;
  detections: Detection[];
  annotatedFrame: string;
  inferenceTime: number;
  sessionCode: string;
}

const App: React.FC = () => {
  /* ────────── STATE & HOOKS ─────────────────────────── */
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');
  const [sessionCode, setSessionCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [showLoader, setShowLoader] = useState(false);
  const [timeoutRef, setTimeoutRef] = useState<NodeJS.Timeout | null>(null);

  const [isVideoMin, setIsVideoMin] = useState(true);
  const [showAdv, setShowAdv] = useState(false);
  const [showLatency, setShowLatency] = useState(false);

  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<DetectionHistoryItem | null>(null);

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
    isCapturing,
    // New session status properties
    sessionStatus,
    isCheckingSession,
    checkSessionStatus
  } = useWebRTCWithFrameCapture();

  const {
    inferenceData,
    isInferenceActive,
    inferenceStats
  } = useInference(sessionCode, isConnected);

  /* ────────── EFFECTS ───────────────────────────────── */

  /* Store detection history */
  useEffect(() => {
    if (inferenceData && inferenceData.detections.length) {
      setHistory(prev => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          detections: inferenceData.detections,
          annotatedFrame: inferenceData.annotated_frame,
          inferenceTime: inferenceData.inference_time,
          sessionCode
        },
        ...prev
      ].slice(0, 50));
    }
  }, [inferenceData, sessionCode]);

  /* Connection state watcher */
  useEffect(() => {
    if (isConnecting) {
      setConnectionState('connecting');
      return;
    }
    if (isConnected) {
      setConnectionState('live');
      setShowLoader(false);
      timeoutRef && clearTimeout(timeoutRef);
      if (!startTime) {
        setStartTime(new Date());
        confetti({
          particleCount: 150, spread: 80, origin: { y: 0.6 },
          colors: ['#ffd700', '#ff0000', '#b154ff', '#00ff00']
        });
      }
    } else {
      setConnectionState('offline');
      setStartTime(null);
      setShowLoader(false);
      timeoutRef && clearTimeout(timeoutRef);
    }
  }, [isConnecting, isConnected]);

  /* Elapsed timer */
  useEffect(() => {
    if (!startTime || connectionState !== 'live') return;
    const id = setInterval(() => {
      const diff = Date.now() - startTime.getTime();
      const h = Math.floor(diff / 36e5).toString().padStart(2, '0');
      const m = Math.floor((diff % 36e5) / 6e4).toString().padStart(2, '0');
      const s = Math.floor((diff % 6e4) / 1e3).toString().padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(id);
  }, [startTime, connectionState]);

  /* ────────── HANDLERS ──────────────────────────────── */
  const handleConnect = async () => {
    if (sessionCode.length !== 4) return;

    // Check session status first
    const status = await checkSessionStatus(sessionCode);
    if (status && !status.available_for_viewer) {
      // Error will be handled by the hook and displayed in ConnectionSection
      return;
    }

    setIsConnecting(true);
    setShowLoader(true);

    const to = setTimeout(() => {
      setIsConnecting(false);
      setShowLoader(false);
      setConnectionState('offline');
    }, 15_000); // Extended timeout for status checking
    setTimeoutRef(to);

    try {
      await connect(sessionCode);
    }
    catch (e) {
      console.error(e);
      setIsConnecting(false);
      setShowLoader(false);
      clearTimeout(to);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setStartTime(null);
    setElapsed('00:00:00');
    setShowLoader(false);
    setHistory([]);
    setSelectedFrame(null);
    timeoutRef && clearTimeout(timeoutRef);
  };

  const handleSessionCodeChange = (code: string) => {
    setSessionCode(code);
    // Clear any existing connection error when code changes
    if (connectionError && code.length < 4) {
      // The error will be cleared by the hook
    }
  };

  /* ────────── RENDER ───────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-x-hidden overflow-y-auto">
      {/* Decorations & watermark */}
      <AnimatedBackground />
      <AntiPiracyWatermark />

      <div className="relative z-10 flex flex-col min-h-screen p-3">
        <Header />

        {/* STATUS BAR */}
        <motion.div className="flex flex-wrap justify-center gap-2 mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <StatusBadge icon={isConnected ? Wifi : WifiOff} text={connectionState.toUpperCase()} variant={connectionState} />

          {connectionState === 'live' && (
            <>
              <StatusBadge icon={Clock} text={elapsed} variant="info" />
              {streamStats && <StatusBadge icon={Zap} text={`${streamStats.fps || 0} FPS`} variant="info" />}

              <motion.button
                onClick={() => setShowLatency(!showLatency)}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border-2 font-bold text-xs uppercase tracking-wider backdrop-blur-xl shadow-lg transition-all duration-150 ${latencyStats.current
                  ? latencyStats.current < 50 ? 'bg-gradient-to-r from-green-600  to-green-700  border-green-500'
                    : latencyStats.current < 100 ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 border-yellow-500'
                      : latencyStats.current < 200 ? 'bg-gradient-to-r from-orange-600 to-orange-700 border-orange-500'
                        : 'bg-gradient-to-r from-red-600    to-red-700    border-red-500'
                  : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500'
                  } text-white`}
              >
                <Activity className="w-3 h-3" />
                {latencyStats.current ? `${Math.round(latencyStats.current)}MS`
                  : latencyStats.average ? `${Math.round(latencyStats.average)}MS`
                    : 'LATENCY'}
              </motion.button>

              {isInferenceEnabled && <StatusBadge icon={Brain} text="AI DETECTING" variant="inference" />}
              {isCapturing && <StatusBadge icon={Play} text="CAPTURING" variant="info" />}
            </>
          )}
        </motion.div>

        {/* MAIN AREA */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {connectionState === 'live' ? (
              /* ─────────────── LIVE DASHBOARD ────────────── */
              <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-full grid gap-3 grid-cols-12">

                {/* LEFT SIDEBAR */}
                <motion.div className="col-span-3 space-y-3 overflow-y-auto overflow-x-hidden thin-scrollbar"
                  initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
                  <ConnectionSection
                    sessionCode={sessionCode}
                    onSessionCodeChange={handleSessionCodeChange}
                    connectionState={connectionState}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    isConnecting={isConnecting}
                    connectionError={connectionError}
                    sessionStatus={sessionStatus}
                    isCheckingSession={isCheckingSession}
                    onCheckSessionStatus={checkSessionStatus}
                  />

                  <InferenceControlPanel
                    sessionCode={sessionCode}
                    isConnected={isConnected}
                    isInferenceEnabled={isInferenceEnabled}
                    onToggleInference={toggleInference}
                    frameStats={getFrameStats()}
                  />

                  <WatermarkSettings />

                  {/* Advanced toggle */}
                  <motion.button
                    onClick={() => setShowAdv(!showAdv)}
                    className="w-full py-2 px-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white/70 hover:text-white hover:bg-slate-700/50 flex items-center justify-between"
                  >
                    <span className="text-sm">Advanced</span>
                    {showAdv ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </motion.button>

                  <AnimatePresence>
                    {showAdv && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-3">
                        <motion.button
                          onClick={() => setIsVideoMin(!isVideoMin)}
                          className="w-full py-2 px-3 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-300 hover:bg-blue-600/30 flex items-center justify-center gap-2"
                        >
                          {isVideoMin ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                          <span className="text-sm">{isVideoMin ? 'Expand' : 'Minimize'} Video</span>
                        </motion.button>

                        {showLatency && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="max-h-96 overflow-y-auto thin-scrollbar">
                            <LatencyDisplay
                              latencyStats={latencyStats}
                              streamStats={streamStats}
                              isConnected={isConnected}
                              onPerformLatencyTest={performLatencyTest}
                            />
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* CENTER COLUMN */}
                <motion.div className="col-span-5 flex flex-col" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}>
                  {/* Video */}
                  <div className={`transition-all duration-300 ${isVideoMin ? 'h-48' : 'h-3/5'} mb-3`}>
                    <VideoStream videoRef={videoRef} sessionCode={sessionCode} streamStats={streamStats} />
                  </div>

                  {/* History & stats */}
                  <div className="flex-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
                    {selectedFrame ? (
                      /* FRAME ANALYSIS */
                      <div className="h-full flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-bold text-white flex items-center gap-2"><Eye className="w-5 h-5 text-purple-400" />Frame Analysis</h4>
                          <button onClick={() => setSelectedFrame(null)} className="text-white/60 hover:text-white">✕</button>
                        </div>

                        <div className="flex-1 min-h-0 flex gap-4">
                          <img src={`data:image/jpeg;base64,${selectedFrame.annotatedFrame}`} alt="Annotated" className="flex-1 object-contain bg-black rounded-lg border border-slate-600" />
                          <div className="w-64 space-y-2 overflow-y-auto thin-scrollbar">
                            <div className="text-sm text-white/60">{new Date(selectedFrame.timestamp).toLocaleString()}</div>
                            {selectedFrame.detections.map((d, i) => (
                              <div key={i} className="bg-slate-700/50 rounded-lg p-2">
                                <div className="flex justify-between"><span className="text-white capitalize">{d.class}</span><span className="text-green-400 text-sm">{Math.round(d.confidence * 100)}%</span></div>
                                <div className="text-xs text-white/60">{Math.round(d.bbox.width)}×{Math.round(d.bbox.height)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* HISTORY GRID */
                      <div className="grid grid-cols-4 gap-4 h-full">
                        {/* History list */}
                        <div className="col-span-2 space-y-4">
                          {!!history.length && (
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3">
                              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-purple-400" />Detection History ({history.length})</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar">
                                {history.slice(0, 10).map(item => (
                                  <motion.button key={item.id} onClick={() => setSelectedFrame(item)}
                                    className={`w-full p-2 rounded-lg text-left ${(selectedFrame as unknown as DetectionHistoryItem)?.id === item.id ? 'bg-purple-600/30 border border-purple-500/50' : 'bg-slate-700/30 hover:bg-slate-600/30'}`}>
                                    <div className="flex justify-between">
                                      <div>
                                        <div className="text-xs text-white/80">{item.detections.length} objects</div>
                                        <div className="text-xs text-white/60">{new Date(item.timestamp).toLocaleTimeString()}</div>
                                      </div>
                                      <div className="text-xs text-green-400">{Math.round(item.inferenceTime)}ms</div>
                                    </div>
                                  </motion.button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Live stats */}
                        <div className="col-span-2 space-y-4">
                          <h4 className="text-lg font-bold text-white flex items-center gap-2"><Activity className="w-5 h-5 text-green-400" />Connection Stats</h4>
                          <div className="space-y-3">
                            <Stat label="Stream FPS" value={streamStats?.fps || 0} />
                            <Stat label="Resolution" value={streamStats?.resolution || 'N/A'} />
                            <Stat label="Latency" value={latencyStats.current ? `${Math.round(latencyStats.current)}ms` : 'N/A'} />
                            <Stat label="Session" value={<span className="text-yellow-400 font-mono">{sessionCode}</span>} />
                            <Stat label="Detections" value={history.length} />
                            <Stat label="AI Status" value={<span className={isInferenceEnabled ? 'text-green-400' : 'text-red-400'}>{isInferenceEnabled ? 'Active' : 'Inactive'}</span>} />
                            <Stat label="Viewer Limit" value={<span className="text-orange-400">1/1 MAX</span>} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* RIGHT PANEL */}
                <motion.div className="col-span-4 overflow-hidden" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.2 }}>
                  <InferencePanel inferenceData={inferenceData} isActive={isInferenceActive || isInferenceEnabled} stats={inferenceStats} sessionCode={sessionCode} />
                </motion.div>
              </motion.div>
            ) : (
              /* ─────────────── OFFLINE LANDING ───────────── */
              <OfflineLanding
                sessionCode={sessionCode}
                onSessionCodeChange={handleSessionCodeChange}
                connectionState={connectionState}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                isConnecting={isConnecting}
                connectionError={connectionError}
                sessionStatus={sessionStatus}
                isCheckingSession={isCheckingSession}
                onCheckSessionStatus={checkSessionStatus}
              />
            )}
          </AnimatePresence>
        </div>

        <Footer />
      </div>

      {/* Overlays */}
      <ConnectionLoader show={showLoader} sessionCode={sessionCode} />
      <ErrorToast error={connectionError} />

      {/* Global styles */}
      <style>{`
        .thin-scrollbar::-webkit-scrollbar{width:4px}
        .thin-scrollbar::-webkit-scrollbar-track{background:rgba(255,255,255,0.05);border-radius:2px}
        .thin-scrollbar::-webkit-scrollbar-thumb{background:rgba(177,84,255,0.4);border-radius:2px}
        .thin-scrollbar::-webkit-scrollbar-thumb:hover{background:rgba(177,84,255,0.6)}
        body{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
        *{-webkit-user-drag:none;-khtml-user-drag:none;-moz-user-drag:none;-o-user-drag:none;user-drag:none}
        .no-select{-webkit-user-select:none!important;-moz-user-select:none!important;-ms-user-select:none!important;user-select:none!important}
        @media print{[class*="watermark"],[style*="z-index: 999"]{display:block!important;visibility:visible!important;opacity:0.8!important;position:fixed!important}}
        .watermark-overlay{position:fixed!important;z-index:9999!important;pointer-events:none!important;user-select:none!important}
        html{display:block!important}
      `}</style>
    </div>
  );
};

/* ── SMALL REUSABLE COMPONENTS ───────────────────────── */
const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between"><span className="text-white/70">{label}:</span><span className="text-white font-bold">{value}</span></div>
);

/* ── OFFLINE LANDING PAGE ────────────────────────────── */
interface OfflineProps {
  sessionCode: string;
  onSessionCodeChange: (s: string) => void;
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
  connectionError: any;
  sessionStatus?: any;
  isCheckingSession?: boolean;
  onCheckSessionStatus?: (code: string) => Promise<any>;
}
const OfflineLanding: React.FC<OfflineProps> = ({
  sessionCode, onSessionCodeChange, connectionState, onConnect, onDisconnect,
  isConnecting, connectionError, sessionStatus, isCheckingSession, onCheckSessionStatus
}) => (
  <motion.div key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
    className="h-full flex items-center justify-center">
    <div className="max-w-6xl mx-auto px-6 text-center">
      {/* Top hero */}
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-12">
        <div className="text-8xl mb-6">🧠</div>
        <h2 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-6">
          AI-Powered Analysis Ready
        </h2>
        <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
          Experience cutting-edge YOLOv8 computer vision for real-time Clash Royale troop detection and analysis.
          Connect your mobile device and watch AI identify every troop, building and spell instantly.
        </p>
        {/* Enhanced beta warning */}
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-300 font-bold">CONFIDENTIAL BETA SOFTWARE</span>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
          <p className="text-red-200 text-sm mb-2">
            This software is protected by anti-piracy measures. All usage is monitored and logged.
            Unauthorized distribution is strictly prohibited.
          </p>
          <div className="bg-orange-900/40 border border-orange-500/40 rounded-lg p-2 mt-2">
            <p className="text-orange-200 text-xs font-bold">
              ⚠️ SINGLE VIEWER LIMIT: Only one viewer per broadcast session allowed
            </p>
          </div>
        </div>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <ConnectionSection
            sessionCode={sessionCode}
            onSessionCodeChange={onSessionCodeChange}
            connectionState={connectionState}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            isConnecting={isConnecting}
            connectionError={connectionError}
            sessionStatus={sessionStatus}
            isCheckingSession={isCheckingSession}
            onCheckSessionStatus={onCheckSessionStatus}
          />
        </motion.div>

        {/* AI Features */}
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Crown className="w-6 h-6 text-yellow-400" /> AI Features
          </h3>
          <div className="space-y-4">
            {[
              { step: "1", text: "Real-time troop detection", icon: "⚔️", desc: "Identify knights, archers, giants instantly" },
              { step: "2", text: "Building & structure analysis", icon: "🏰", desc: "Track towers, cannons, defenses" },
              { step: "3", text: "Spell & ability tracking", icon: "✨", desc: "Detect fireballs, lightning, freeze" },
              { step: "4", text: "Performance analytics", icon: "📊", desc: "Frame rates, accuracy, timing" },
              { step: "5", text: "Frame-by-frame analysis", icon: "🎯", desc: "Historical detection review" }
            ].map((it, idx) => (
              <motion.div key={it.step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + idx * 0.1 }}
                className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-slate-600/50">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0">
                  {it.step}
                </div>
                <div className="text-2xl flex-shrink-0">{it.icon}</div>
                <div className="flex-1">
                  <div className="text-white font-bold text-lg">{it.text}</div>
                  <div className="text-white/60 text-sm mt-1">{it.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Watermark settings panel */}
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="mb-12 flex justify-center">
        <div className="bg-gradient-to-br from-red-900/50 to-purple-900/50 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">🛡️ Security & Protection</h3>
          <div className="flex justify-center"><WatermarkSettings /></div>
          <p className="text-white/70 text-sm mt-4 max-w-md">
            Configure anti-piracy watermarks and security settings. These measures help protect
            the confidential nature of this beta software.
          </p>
        </div>
      </motion.div>

      {/* Model info */}
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8">
        {[
          { icon: "🧠", title: "YOLOv8 Model", sub: "State-of-the-art object detection" },
          { icon: "⚡", title: "Real-time Speed", sub: "5+ FPS processing rate" },
          { icon: "🎯", title: "High Accuracy", sub: "Trained on Clash Royale data" },
          { icon: "👤", title: "Single Viewer", sub: "One viewer per broadcast session" }].map((c) => (
            <div key={c.title} className="text-center">
              <div className="text-4xl mb-3">{c.icon}</div>
              <div className="text-lg font-bold text-white mb-1">{c.title}</div>
              <div className="text-sm text-white/70">{c.sub}</div>
            </div>
          ))}
      </motion.div>
    </div>
  </motion.div>
);

export default App;