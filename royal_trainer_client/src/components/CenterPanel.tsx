// royal_trainer_client/src/components/CenterPanel.tsx - Full component with scrollable content

import React from 'react';
import { motion } from 'framer-motion';
import VideoStream from './VideoStream';
import HistoryAndStats from './HistoryAndStats';
import ConnectionStats from './ConnectionStats';

import type { DetectionHistoryItem, StreamStats } from '../types';
import ElixirAndCards from './game/ElixirAndCards';

interface LatencyStats {
    current: number;
    average: number;
    min: number;
    max: number;
    recent: number[];
    measurements: any[];
}

interface CenterPanelProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    sessionCode: string;
    streamStats: StreamStats | null;
    remoteStream: MediaStream | null;
    isVideoMin: boolean;
    history: DetectionHistoryItem[];
    selectedFrame: DetectionHistoryItem | null;
    onSelectFrame: (frame: DetectionHistoryItem | null) => void;
    latencyStats: LatencyStats;
    isInferenceEnabled: boolean;
    isConnected: boolean;
}

const CenterPanel: React.FC<CenterPanelProps> = ({
    videoRef,
    sessionCode,
    streamStats,
    remoteStream,
    isVideoMin,
    history,
    selectedFrame,
    onSelectFrame,
    latencyStats,
    isInferenceEnabled,
    isConnected,
}) => {
    return (
        <div className="space-y-4 pb-4">
            {/* Top Connection Stats Bar - Clean and horizontal */}
            <motion.div
                className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 sticky top-0 z-10"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                <ConnectionStats
                    streamStats={streamStats}
                    latencyStats={latencyStats}
                    sessionCode={sessionCode}
                    isInferenceEnabled={isInferenceEnabled}
                    history={history}
                />
            </motion.div>

            {/* Main Video Area - Much larger and prominent */}
            <motion.div
                className={`transition-all duration-300 ${isVideoMin
                    ? 'h-48'
                    : 'h-96'
                    } bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden`}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <VideoStream
                    videoRef={videoRef}
                    sessionCode={sessionCode}
                    streamStats={streamStats}
                    remoteStream={remoteStream}
                />
            </motion.div>

            {/* Elixir and Cards Component */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <ElixirAndCards isConnected={isConnected} />
            </motion.div>

            {/* History and Stats Section - Scrollable */}
            <motion.div
                className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
            >
                <div className={`${isVideoMin
                    ? 'h-96'
                    : 'h-80'
                    } overflow-y-auto thin-scrollbar`}>
                    <div className="p-4">
                        <HistoryAndStats
                            history={history}
                            selectedFrame={selectedFrame}
                            onSelectFrame={onSelectFrame}
                            streamStats={streamStats}
                            latencyStats={latencyStats}
                            sessionCode={sessionCode}
                            isInferenceEnabled={isInferenceEnabled}
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CenterPanel;