// royal_trainer_client/src/components/HistoryAndStats.tsx - Larger thumbnails, no purple badges

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, History, Image, Sliders, Filter } from 'lucide-react';
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
    compactMode?: boolean;
}

const HistoryAndStats: React.FC<HistoryAndStatsProps> = ({
    history,
    selectedFrame,
    onSelectFrame,
}) => {
    const [confidenceThreshold, setConfidenceThreshold] = useState(0.2); // 20% default

    // Filter detections based on confidence threshold
    const filteredDetections = selectedFrame?.detections?.filter(
        detection => detection.confidence >= confidenceThreshold
    ) || [];

    /* ────────── FRAME ANALYSIS VIEW ──────────────────── */
    if (selectedFrame) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold text-white flex items-center gap-2">
                        <Eye className="w-6 h-6 text-purple-400" />
                        Frame Analysis
                    </h4>
                    <button
                        onClick={() => onSelectFrame(null)}
                        className="text-white/60 hover:text-white transition-colors text-2xl font-bold hover:bg-red-500/20 rounded-lg p-2"
                        title="Close Analysis"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 min-h-0 flex gap-6">
                    {/* Large Image Display - Takes most of the space */}
                    <div className="flex-1 min-h-0 flex flex-col">
                        {/* Confidence Threshold Control */}
                        <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                            <div className="flex items-center gap-3 mb-2">
                                <Sliders className="w-4 h-4 text-blue-400" />
                                <span className="font-semibold text-white text-sm">Confidence Threshold</span>
                                <span className="text-blue-400 font-mono text-sm">
                                    {Math.round(confidenceThreshold * 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={confidenceThreshold}
                                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${confidenceThreshold * 100}%, #475569 ${confidenceThreshold * 100}%, #475569 100%)`
                                }}
                            />
                        </div>

                        {/* Large Image Container */}
                        <div className="flex-1 bg-black rounded-xl border-2 border-slate-600/50 overflow-hidden">
                            <img
                                src={`data:image/jpeg;base64,${selectedFrame.annotatedFrame}`}
                                alt="Annotated Frame"
                                className="w-full h-full object-contain"
                                style={{ minHeight: '500px' }}
                            />
                        </div>

                        {/* Image Metadata */}
                        <div className="mt-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-white/60">Captured:</span>
                                    <div className="text-white font-medium">
                                        {new Date(selectedFrame.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-white/60">Frame ID:</span>
                                    <div className="text-white font-mono">
                                        {selectedFrame.id}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-white/60">Total Detections:</span>
                                    <div className="text-white font-bold">
                                        {selectedFrame.detections?.length || 0}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-white/60">Filtered Detections:</span>
                                    <div className="text-white font-bold">
                                        {filteredDetections.length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detection Details Panel - Fixed width sidebar */}
                    <div className="w-80 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <Target className="w-5 h-5 text-purple-400" />
                            <h5 className="font-bold text-white text-lg">
                                Detections ({filteredDetections.length})
                            </h5>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto thin-scrollbar">
                            {filteredDetections.map((detection, idx) => (
                                <motion.div
                                    key={idx}
                                    className="p-4 bg-slate-700/40 rounded-xl border border-slate-600/30 hover:border-purple-500/50 transition-all duration-200"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="font-bold text-white text-lg">
                                            {detection.class}
                                        </span>
                                        <span className="text-sm font-bold text-green-400 bg-green-900/30 px-3 py-1 rounded-lg">
                                            {Math.round(detection.confidence * 100)}%
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-white/70">
                                        <div className="bg-slate-800/30 p-2 rounded">
                                            <span className="text-white/50 text-xs">X Position</span>
                                            <div className="font-mono text-white">{Math.round(detection.bbox.x1)}</div>
                                        </div>
                                        <div className="bg-slate-800/30 p-2 rounded">
                                            <span className="text-white/50 text-xs">Y Position</span>
                                            <div className="font-mono text-white">{Math.round(detection.bbox.y1)}</div>
                                        </div>
                                        <div className="bg-slate-800/30 p-2 rounded">
                                            <span className="text-white/50 text-xs">Width</span>
                                            <div className="font-mono text-white">{Math.round(detection.bbox.width)}</div>
                                        </div>
                                        <div className="bg-slate-800/30 p-2 rounded">
                                            <span className="text-white/50 text-xs">Height</span>
                                            <div className="font-mono text-white">{Math.round(detection.bbox.height)}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {filteredDetections.length === 0 && (
                                <div className="text-white/50 text-center py-8">
                                    <Filter className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                    <div className="text-lg font-medium mb-2">
                                        {selectedFrame.detections?.length
                                            ? `No detections above ${Math.round(confidenceThreshold * 100)}% confidence`
                                            : 'No detections in this frame'
                                        }
                                    </div>
                                    {selectedFrame.detections?.length && (
                                        <div className="text-sm text-white/40">
                                            Try lowering the confidence threshold
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ────────── HISTORY VIEW ─────────────────────────── */
    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    <History className="w-6 h-6 text-blue-400" />
                    Detection History
                    {history.length > 0 && (
                        <span className="text-lg font-normal text-white/60">
                            ({history.length} frames)
                        </span>
                    )}
                </h4>
            </div>

            {/* Global Confidence Control - For filtering which frames to show */}
            {history.length > 0 && (
                <div className="mb-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="flex items-center gap-3 mb-2">
                        <Filter className="w-4 h-4 text-blue-400" />
                        <span className="font-semibold text-white text-sm">History Filter</span>
                        <span className="text-blue-400 font-mono text-sm">
                            {Math.round(confidenceThreshold * 100)}%+
                        </span>
                    </div>
                    <div className="text-xs text-white/60 mb-2">
                        Show only frames with detections above this confidence
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={confidenceThreshold}
                        onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${confidenceThreshold * 100}%, #475569 ${confidenceThreshold * 100}%, #475569 100%)`
                        }}
                    />
                    <div className="flex justify-between text-xs text-white/50 mt-1">
                        <span>Show all frames</span>
                        <span>High confidence only</span>
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
                {history.length > 0 ? (
                    <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {history
                            .slice(-50) // Show only last 50 frames
                            .map((frame) => {
                                // Filter detections for this frame based on confidence
                                const frameFilteredDetections = frame.detections?.filter(
                                    detection => detection.confidence >= confidenceThreshold
                                ) || [];

                                // Skip this frame if no detections meet the threshold
                                if (frameFilteredDetections.length === 0 && confidenceThreshold > 0) {
                                    return null;
                                }

                                return (
                                    <motion.button
                                        key={frame.id}
                                        onClick={() => onSelectFrame(frame)}
                                        className="group relative aspect-square bg-slate-700/30 border-2 border-slate-600/30 rounded-xl overflow-hidden hover:border-purple-500/60 hover:scale-105 transition-all duration-200 cursor-pointer"
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

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <div className="absolute bottom-3 left-3 right-3">
                                                <div className="text-sm text-white font-bold">
                                                    {frameFilteredDetections.length} detections
                                                </div>
                                                <div className="text-xs text-white/80">
                                                    {new Date(frame.timestamp).toLocaleTimeString()}
                                                </div>
                                                {frameFilteredDetections.length !== (frame.detections?.length || 0) && (
                                                    <div className="text-xs text-yellow-400">
                                                        (filtered from {frame.detections?.length || 0})
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Click Indicator - Only show on hover */}
                                        <div className="absolute top-3 right-3 bg-black/60 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <Eye className="w-4 h-4 text-white" />
                                        </div>
                                    </motion.button>
                                );
                            }).filter(Boolean)} {/* Remove null entries */}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white/50">
                        <Image className="w-16 h-16 mb-4" />
                        <p className="text-xl font-medium">No detection history yet</p>
                        <p className="text-sm text-white/40 mt-2">
                            Frames with detections will appear here
                        </p>
                        <p className="text-xs text-white/30 mt-1">
                            Showing last 50 frames when available
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryAndStats;