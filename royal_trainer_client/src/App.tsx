// royal_trainer_client/src/App.tsx - Complete Fixed Version

import React from 'react';
import { AnimatePresence } from 'framer-motion';

/* ── LAYOUT / OVERLAYS ─────────────────────────────────────────────── */
import AnimatedBackground from './components/layout/AnimatedBackground';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ConnectionLoader from './components/overlays/ConnectionLoader';
import ErrorToast from './components/overlays/ErrorToast';

/* ── FEATURE COMPONENTS ───────────────────────────────────────────── */
import StatusBar from './components/StatusBar';
import LiveDashboard from './components/LiveDashboard';
import OfflineLanding from './components/OfflineLanding';


/* ── CUSTOM HOOKS ─────────────────────────────────────────────────── */
import { useWebRTCWithFrameCapture } from './hooks/useWebRTCWithFrameCapture';
import { useInference } from './hooks/useInference';
import { useConnectionState } from './hooks/useConnectionState';
import { useDetectionHistory } from './hooks/useDetectionHistory';
import { useUIState } from './hooks/useUIState';
import OptimizedWatermark from './components/OptimizedWatermark';

const App: React.FC = () => {
  /* ────────── CUSTOM HOOKS ─────────────────────────── */
  const uiState = useUIState();

  const webRTC = useWebRTCWithFrameCapture();

  const connection = useConnectionState(webRTC.isConnecting, webRTC.isConnected);

  const inference = useInference(uiState.sessionCode, webRTC.isConnected);

  const detectionHistory = useDetectionHistory(inference.inferenceData, uiState.sessionCode);

  /* ────────── CONNECTION HANDLERS ─────────────────────────────── */
  const handleConnect = async () => {
    if (uiState.sessionCode.length !== 4) return;

    const status = await webRTC.checkSessionStatus(uiState.sessionCode);
    if (status && !status.available_for_viewer) return;

    connection.handleConnectionStart();

    try {
      await webRTC.connect(uiState.sessionCode);
    } catch (e) {
      console.error(e);
      connection.handleConnectionEnd();
    }
  };

  const handleDisconnect = () => {
    webRTC.disconnect();
    connection.handleConnectionEnd();
    detectionHistory.clearHistory();
  };

  /* ────────── RENDER ───────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-x-hidden overflow-y-auto">
      {/* Global decorations & watermark */}
      <AnimatedBackground />
      <OptimizedWatermark />

      <div className="relative z-10 flex flex-col min-h-screen p-3">
        <Header />

        {/* STATUS BAR - Fixed with correct props */}
        <StatusBar
          connectionState={connection.connectionState}
          elapsed={connection.elapsed}
          streamStats={webRTC.streamStats}
          latencyStats={webRTC.latencyStats}
          isInferenceEnabled={webRTC.isInferenceEnabled}
          isCapturing={webRTC.isCapturing}
          onToggleLatency={uiState.toggleLatency}
        />

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {connection.connectionState === 'live' ? (
              <LiveDashboard
                // Session & Connection
                sessionCode={uiState.sessionCode}
                onSessionCodeChange={uiState.handleSessionCodeChange}
                connectionState={connection.connectionState}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                isConnecting={webRTC.isConnecting}
                connectionError={webRTC.connectionError}
                sessionStatus={webRTC.sessionStatus}
                isCheckingSession={webRTC.isCheckingSession}
                onCheckSessionStatus={webRTC.checkSessionStatus}
                isConnected={webRTC.isConnected}

                // Video & Streams
                videoRef={webRTC.videoRef}
                streamStats={webRTC.streamStats}
                remoteStream={webRTC.remoteStream}
                latencyStats={webRTC.latencyStats}
                onPerformLatencyTest={webRTC.performLatencyTest}

                // Inference
                isInferenceEnabled={webRTC.isInferenceEnabled}
                onToggleInference={webRTC.toggleInference}
                getFrameStats={webRTC.getFrameStats}
                inferenceData={inference.inferenceData}
                isInferenceActive={inference.isInferenceActive}
                inferenceStats={inference.inferenceStats}

                // UI State
                showAdv={uiState.showAdv}
                onToggleAdvanced={uiState.toggleAdvanced}
                isVideoMin={uiState.isVideoMin}
                onToggleVideoSize={uiState.toggleVideoSize}
                showLatency={uiState.showLatency}

                // History
                history={detectionHistory.history}
                selectedFrame={detectionHistory.selectedFrame}
                onSelectFrame={detectionHistory.selectFrame}
              />
            ) : (
              <OfflineLanding
                sessionCode={uiState.sessionCode}
                onSessionCodeChange={uiState.handleSessionCodeChange}
                connectionState={connection.connectionState}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                isConnecting={webRTC.isConnecting}
                connectionError={webRTC.connectionError}
                sessionStatus={webRTC.sessionStatus}
                isCheckingSession={webRTC.isCheckingSession}
                onCheckSessionStatus={webRTC.checkSessionStatus}
              />
            )}
          </AnimatePresence>
        </div>

        <Footer />
      </div>

      {/* OVERLAYS */}
      <ConnectionLoader show={connection.showLoader} sessionCode={uiState.sessionCode} />
      <ErrorToast error={webRTC.connectionError} />

      {/* GLOBAL STYLES */}
      <style>{`
        .thin-scrollbar::-webkit-scrollbar { width: 4px }
        .thin-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 2px }
        .thin-scrollbar::-webkit-scrollbar-thumb { background: rgba(177,84,255,0.4); border-radius: 2px }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(177,84,255,0.6) }
        body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent }
        * { -webkit-user-drag: none; -khtml-user-drag: none; -moz-user-drag: none; -o-user-drag: none; user-drag: none }
        .no-select { -webkit-user-select: none!important; -moz-user-select: none!important; -ms-user-select: none!important; user-select: none!important }
        @media print { [class*="watermark"], [style*="z-index: 999"] { display: block!important; visibility: visible!important; opacity: 0.8!important; position: fixed!important } }
        .watermark-overlay { position: fixed!important; z-index: 9999!important; pointer-events: none!important; user-select: none!important }
        html { display: block!important }
      `}</style>
    </div>
  );
};

export default App;