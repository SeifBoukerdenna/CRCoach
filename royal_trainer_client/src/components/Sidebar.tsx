// royal_trainer_client/src/components/Sidebar.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import ConnectionSection from './ConnectionSection';
import InferenceControlPanel from './inference/InferenceControlPanel';
import WatermarkSettings from './WatermarkSettings';
import LatencyDisplay from './LatencyDisplay';
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
    showAdv,
    onToggleAdvanced,
    isVideoMin,
    onToggleVideoSize,
    showLatency,
    latencyStats,
    streamStats,
    onPerformLatencyTest,
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

            <WatermarkSettings />

            {/* Advanced toggle */}
            <motion.button
                onClick={onToggleAdvanced}
                className="w-full py-2 px-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white/70 hover:text-white hover:bg-slate-700/50 flex items-center justify-between"
            >
                <span className="text-sm">Advanced</span>
                {showAdv ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </motion.button>

            <AnimatePresence>
                {showAdv && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3"
                    >
                        <motion.button
                            onClick={onToggleVideoSize}
                            className="w-full py-2 px-3 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-300 hover:bg-blue-600/30 flex items-center justify-center gap-2"
                        >
                            {isVideoMin ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                            <span className="text-sm">{isVideoMin ? 'Expand' : 'Minimize'} Video</span>
                        </motion.button>

                        {showLatency && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="max-h-96 overflow-y-auto thin-scrollbar"
                            >
                                <LatencyDisplay
                                    latencyStats={latencyStats}
                                    streamStats={streamStats}
                                    isConnected={isConnected}
                                    onPerformLatencyTest={onPerformLatencyTest}
                                />
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Sidebar;