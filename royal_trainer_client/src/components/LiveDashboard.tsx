// royal_trainer_client/src/components/LiveDashboard.tsx - Full file with scrollable containers

import React from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import CenterPanel from './CenterPanel';
import InferencePanel from './InferencePanel';
import type { ConnectionState, ConnectionError, SessionStatus, StreamStats, InferenceData, InferenceStats, DetectionHistoryItem } from '../types';

interface LatencyStats {
  current: number;
  average: number;
  min: number;
  max: number;
  recent: number[];
  measurements: any[];
}

interface LiveDashboardProps {
  // Session & Connection
  sessionCode: string;
  onSessionCodeChange: (code: string) => void;
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
  connectionError: ConnectionError | null;
  sessionStatus?: SessionStatus | null;
  isCheckingSession?: boolean;
  onCheckSessionStatus?: (code: string) => Promise<SessionStatus | null>;
  isConnected: boolean;

  // Video & Streams
  videoRef: React.RefObject<HTMLVideoElement>;
  streamStats: StreamStats | null;
  remoteStream: MediaStream | null;
  latencyStats: LatencyStats;
  onPerformLatencyTest: () => void;

  // Inference
  isInferenceEnabled: boolean;
  onToggleInference: (enabled: boolean) => Promise<boolean>;
  getFrameStats: () => any;
  inferenceData: InferenceData | null;
  isInferenceActive: boolean;
  inferenceStats: InferenceStats;

  // UI State
  showAdv: boolean;
  onToggleAdvanced: () => void;
  isVideoMin: boolean;
  onToggleVideoSize: () => void;
  showLatency: boolean;

  // History
  history: DetectionHistoryItem[];
  selectedFrame: DetectionHistoryItem | null;
  onSelectFrame: (frame: DetectionHistoryItem | null) => void;
}

const LiveDashboard: React.FC<LiveDashboardProps> = ({
  sessionCode,
  onSessionCodeChange,
  connectionState,
  onConnect,
  onDisconnect,
  isConnecting,
  connectionError,
  sessionStatus,
  isCheckingSession,
  onCheckSessionStatus,
  isConnected,
  videoRef,
  streamStats,
  remoteStream,
  latencyStats,
  onPerformLatencyTest,
  isInferenceEnabled,
  onToggleInference,
  getFrameStats,
  inferenceData,
  isInferenceActive,
  inferenceStats,
  showAdv,
  onToggleAdvanced,
  isVideoMin,
  onToggleVideoSize,
  showLatency,
  history,
  selectedFrame,
  onSelectFrame,
}) => {
  return (
    <motion.div
      key="live"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden"
    >
      <div className="flex h-full p-4 gap-4">
        {/* Left Sidebar - Compact with moved panels */}
        <div className="w-80 flex-shrink-0 overflow-y-auto thin-scrollbar">
          <Sidebar
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
            isConnected={isConnected}
            isInferenceEnabled={isInferenceEnabled}
            onToggleInference={onToggleInference}
            getFrameStats={getFrameStats}
            showAdv={showAdv}
            onToggleAdvanced={onToggleAdvanced}
            isVideoMin={isVideoMin}
            onToggleVideoSize={onToggleVideoSize}
            showLatency={showLatency}
            latencyStats={latencyStats}
            streamStats={streamStats}
            onPerformLatencyTest={onPerformLatencyTest}
          />
        </div>

        {/* Center Panel - Video, Elixir/Cards, and History */}
        <div className="flex-1 min-w-0 overflow-y-auto thin-scrollbar">
          <CenterPanel
            videoRef={videoRef}
            sessionCode={sessionCode}
            streamStats={streamStats}
            remoteStream={remoteStream}
            isVideoMin={isVideoMin}
            history={history}
            selectedFrame={selectedFrame}
            onSelectFrame={onSelectFrame}
            latencyStats={latencyStats}
            isInferenceEnabled={isInferenceEnabled}
            isConnected={isConnected}
          />
        </div>

        {/* Right Panel - Inference and Analysis */}
        <div className="w-80 flex-shrink-0 overflow-y-auto thin-scrollbar">
          <InferencePanel
            inferenceData={inferenceData}
            isActive={isInferenceActive}
            stats={inferenceStats}
            sessionCode={sessionCode}
            isInferenceEnabled={isInferenceEnabled}
            onToggleInference={onToggleInference}
            getFrameStats={getFrameStats}
            isConnected={isConnected}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default LiveDashboard;