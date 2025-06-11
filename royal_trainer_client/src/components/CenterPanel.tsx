// royal_trainer_client/src/components/CenterPanel.tsx

import React from 'react';
import { motion } from 'framer-motion';
import VideoStream from './VideoStream';
import HistoryAndStats from './HistoryAndStats';
import type { DetectionHistoryItem } from '../hooks/useDetectionHistory';
import type { StreamStats } from '../types';

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
        <motion.div
            className="col-span-5 flex flex-col"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
        >
            {/* Video */}
            <div className={`transition-all duration-300 ${isVideoMin ? 'h-48' : 'h-3/5'} mb-3`}>
                <VideoStream
                    videoRef={videoRef}
                    sessionCode={sessionCode}
                    streamStats={streamStats}
                    remoteStream={remoteStream}
                />
            </div>

            {/* History & stats */}
            <div className="flex-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
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
        </motion.div>
    );
};

export default CenterPanel;