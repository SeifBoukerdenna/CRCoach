// royal_trainer_client/src/components/HistoryAndStats.tsx - Improved for new layout

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, History, Image } from 'lucide-react';
import type { DetectionHistoryItem, StreamStats } from '../types';

interface LatencyStats {
    current: number;
    average: number;
    min: number;
    max: number;
    recent: number[];
    measurements: any[];
}

interface HistoryAndStatsProps {
    history: DetectionHistoryItem[];
    selectedFrame: DetectionHistoryItem | null;
    onSelectFrame: (frame: DetectionHistoryItem | null) => void;
    streamStats: StreamStats | null;
    latencyStats: LatencyStats;
    sessionCode: string;
    isInferenceEnabled: boolean;
    compactMode?: boolean; // New prop for layout mode
}

const HistoryAndStats: React.FC<HistoryAndStatsProps> = ({
    history,
    selectedFrame,
    onSelectFrame,
    compactMode = false,
}) => {
    /* ────────── FRAME ANALYSIS VIEW ──────────────────── */
    if (selectedFrame) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <Eye className="w-5 h-5 text-purple-400" />
                        Frame Analysis
                    </h4>
                    <button
                        onClick={() => onSelectFrame(null)}
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className={`flex-1 min-h-0 flex gap-4 ${compactMode ? 'flex-row' : 'flex-col lg:flex-row'}`}>
                    <div className="flex-1 min-h-0">
                        <img
                            src={`data:image/jpeg;base64,${selectedFrame.annotatedFrame}`}
                            alt="Annotated"
                            className="w-full h-full object-contain bg-black rounded-lg border border-slate-600"
                        />
                    </div>

                    <div className={`${compactMode ? 'w-64' : 'w-full lg:w-64'} space-y-2 overflow-y-auto thin-scrollbar`}>
                        <h5 className="font-semibold text-white/80 text-sm mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Detections ({selectedFrame.detections?.length || 0})
                        </h5>

                        {selectedFrame.detections?.map((detection, idx) => (
                            <motion.div
                                key={idx}
                                className="p-3 bg-slate-700/40 rounded-lg border border-slate-600/30"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-white text-sm">
                                        {detection.class}
                                    </span>
                                    <span className="text-xs text-green-400 font-bold">
                                        {Math.round(detection.confidence * 100)}%
                                    </span>
                                </div>
                                <div className="text-xs text-white/60 space-y-1">
                                    <div>X: {Math.round(detection.bbox.x1)}</div>
                                    <div>Y: {Math.round(detection.bbox.y1)}</div>
                                    <div>W: {Math.round(detection.bbox.width)}</div>
                                    <div>H: {Math.round(detection.bbox.height)}</div>
                                </div>
                            </motion.div>
                        ))}

                        {(!selectedFrame.detections || selectedFrame.detections.length === 0) && (
                            <div className="text-white/50 text-sm italic text-center py-4">
                                No detections in this frame
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    /* ────────── HISTORY VIEW ─────────────────────────── */
    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    Detection History
                    {history.length > 0 && (
                        <span className="text-sm font-normal text-white/60">
                            ({history.length} frames)
                        </span>
                    )}
                </h4>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
                {history.length > 0 ? (
                    <div className={`grid gap-3 ${compactMode ? 'grid-cols-4 lg:grid-cols-6' : 'grid-cols-3 lg:grid-cols-4'}`}>
                        {history.map((frame) => (
                            <motion.button
                                key={frame.id}
                                onClick={() => onSelectFrame(frame)}
                                className="group relative aspect-square bg-slate-700/30 border border-slate-600/30 rounded-lg overflow-hidden hover:border-purple-500/50 transition-all duration-200"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <img
                                    src={`data:image/jpeg;base64,${frame.annotatedFrame}`}
                                    alt={`Frame ${frame.id}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-1 left-1 right-1">
                                        <div className="text-xs text-white font-medium">
                                            {frame.detections?.length || 0} detections
                                        </div>
                                        <div className="text-xs text-white/60">
                                            {new Date(frame.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-1 right-1">
                                    <Eye className="w-3 h-3 text-white/60 group-hover:text-white transition-colors" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white/50">
                        <Image className="w-12 h-12 mb-2" />
                        <p className="text-sm">No detection history yet</p>
                        <p className="text-xs text-white/40 mt-1">
                            Frames with detections will appear here
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryAndStats;