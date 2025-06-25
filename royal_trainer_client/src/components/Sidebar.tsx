// royal_trainer_client/src/components/Sidebar.tsx

import React from 'react';
import { motion } from 'framer-motion';
import ConnectionSection from './ConnectionSection';
import InferenceControlPanel from './inference/InferenceControlPanel';
import type { ConnectionError, SessionStatus, StreamStats, ConnectionStateValue } from '../types';

interface LatencyStats {
    current: number;
    average: number;
    min: number;
    max: number;
    recent: number[];
    measurements: number[];
}

interface SidebarProps {
    sessionCode: string;
    onSessionCodeChange: (code: string) => void;
    connectionState: ConnectionStateValue;
    onConnect: () => void;
    onDisconnect: () => void;
    isConnecting: boolean;
    connectionError: ConnectionError | null;
    sessionStatus?: SessionStatus | null;
    isCheckingSession?: boolean;
    onCheckSessionStatus?: (code: string) => Promise<SessionStatus | null>;
    isConnected: boolean;
    isInferenceEnabled: boolean;
    onToggleInference: (enabled: boolean) => Promise<boolean>;
    getFrameStats: () => any;
    showAdv: boolean;
    onToggleAdvanced: () => void;
    isVideoMin: boolean;
    onToggleVideoSize: () => void;
    showLatency: boolean;
    latencyStats: LatencyStats;
    streamStats: StreamStats | null;
    onPerformLatencyTest: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
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
    isInferenceEnabled,
    onToggleInference,
    getFrameStats,
}) => {
    return (
        <motion.div
            className="col-span-3 space-y-3 overflow-y-auto overflow-x-hidden thin-scrollbar"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
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

            <InferenceControlPanel
                sessionCode={sessionCode}
                isConnected={isConnected}
                isInferenceEnabled={isInferenceEnabled}
                onToggleInference={onToggleInference}
                frameStats={getFrameStats()}
            />
        </motion.div>
    );
};

export default Sidebar;