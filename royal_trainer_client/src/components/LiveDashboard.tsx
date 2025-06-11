// royal_trainer_client/src/components/LiveDashboard.tsx

import React from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import CenterPanel from './CenterPanel';
import InferencePanel from './InferencePanel';
import type { DetectionHistoryItem } from '../hooks/useDetectionHistory';
import type { ConnectionState, ConnectionError, SessionStatus, StreamStats, InferenceData, InferenceStats } from '../types';

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
            transition={{ duration: 0.2 }}
            className="h-full grid gap-3 grid-cols-12"
        >
            {/* LEFT SIDEBAR */}
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

            {/* CENTER PANEL */}
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
            />

            {/* RIGHT PANEL */}
            <motion.div
                className="col-span-4 overflow-hidden"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
            >
                <InferencePanel
                    inferenceData={inferenceData}
                    isActive={isInferenceActive || isInferenceEnabled}
                    stats={inferenceStats}
                    sessionCode={sessionCode}
                />
            </motion.div>
        </motion.div>
    );
};

export default LiveDashboard;