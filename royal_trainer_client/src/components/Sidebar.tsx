// royal_trainer_client/src/components/Sidebar.tsx - Improved layout and organization

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Maximize2, Minimize2, Settings } from 'lucide-react';
import ConnectionSection from './ConnectionSection';
import InferenceControlPanel from './inference/InferenceControlPanel';
import WatermarkSettings from './WatermarkSettings';
import LatencyDisplay from './LatencyDisplay';
import type { ConnectionState, ConnectionError, SessionStatus, StreamStats } from '../types';

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
    connectionState: ConnectionState;
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
            className="h-full flex flex-col gap-4 overflow-y-auto thin-scrollbar"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Connection Section */}
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

            {/* AI Control Panel */}
            <InferenceControlPanel
                isInferenceEnabled={isInferenceEnabled}
                onToggleInference={onToggleInference}
                getFrameStats={getFrameStats}
                sessionCode={sessionCode}
            />

            {/* Advanced Controls - Only show when connected */}
            <AnimatePresence>
                {connectionState === 'live' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                    >
                        {/* Video Controls */}
                        <motion.div
                            className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <Settings className="w-5 h-5 text-blue-400" />
                                <h3 className="text-lg font-bold text-white">Video Controls</h3>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={onToggleVideoSize}
                                    className="w-full flex items-center justify-between p-3 bg-slate-700/40 border border-slate-600/30 rounded-lg hover:border-blue-500/50 transition-all duration-200 text-white"
                                >
                                    <span className="flex items-center gap-2">
                                        {isVideoMin ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                                        Video Size
                                    </span>
                                    <span className="text-sm text-white/60">
                                        {isVideoMin ? 'Expand' : 'Minimize'}
                                    </span>
                                </button>

                                <button
                                    onClick={onToggleAdvanced}
                                    className="w-full flex items-center justify-between p-3 bg-slate-700/40 border border-slate-600/30 rounded-lg hover:border-blue-500/50 transition-all duration-200 text-white"
                                >
                                    <span className="flex items-center gap-2">
                                        <Settings className="w-4 h-4" />
                                        Advanced
                                    </span>
                                    {showAdv ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>
                        </motion.div>

                        {/* Latency Display */}
                        {showLatency && (
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                            >
                                <LatencyDisplay
                                    latencyStats={latencyStats}
                                    streamStats={streamStats}
                                    onPerformLatencyTest={onPerformLatencyTest}
                                    isConnected={isConnected}
                                />
                            </motion.div>
                        )}

                        {/* Advanced Settings */}
                        <AnimatePresence>
                            {showAdv && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <WatermarkSettings />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Spacer to push content up */}
            <div className="flex-1"></div>
        </motion.div>
    );
};

export default Sidebar;