// royal_trainer_client/src/components/CenterPanel.tsx - Fixed with proper connection stats integration

import React from 'react';
import { motion } from 'framer-motion';
import VideoStream from './VideoStream';
import HistoryAndStats from './HistoryAndStats';
import ConnectionStats from './ConnectionStats';
import type { DetectionHistoryItem, StreamStats } from '../types';

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
}) => {
    return (
        <div className="h-full flex flex-col gap-4">
            {/* Top Connection Stats Bar - Clean and horizontal */}
            <motion.div
                className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4"
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
                className={`transition-all duration-300 ${isVideoMin ? 'h-64' : 'flex-1'
                    } min-h-96`}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <VideoStream
                    videoRef={videoRef}
                    sessionCode={sessionCode}
                    streamStats={streamStats}
                    remoteStream={remoteStream}
                />
            </motion.div>

            {/* Bottom History Panel - Only when frame is selected or history exists */}
            {(selectedFrame || history.length > 0) && (
                <motion.div
                    className="flex-1 min-h-[400px] bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <HistoryAndStats
                        history={history}
                        selectedFrame={selectedFrame}
                        onSelectFrame={onSelectFrame}
                        streamStats={streamStats}
                        latencyStats={latencyStats}
                        sessionCode={sessionCode}
                        isInferenceEnabled={isInferenceEnabled}
                        compactMode={true}
                    />
                </motion.div>
            )}
        </div>
    );
};

export default CenterPanel;