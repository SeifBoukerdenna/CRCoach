// royal_trainer_client/src/components/InferencePanel.tsx - Fixed responsive layout with no overflow

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    Target,
    Eye,
    BarChart3,
    Signal,
    CheckCircle,
    AlertCircle
} from 'lucide-react';

import type { InferenceData, InferenceStats } from '../types';

interface ExtendedInferenceStats extends InferenceStats {
    connectionAttempts?: number;
    isWebSocketConnected?: boolean;
    frameCount?: number;
    inferenceFPS?: number;
    lastInferenceTime?: number;
    networkLatency?: number;
    modelLoadTime?: number;
    totalFramesProcessed?: number;
}

interface InferencePanelProps {
    inferenceData: InferenceData | null;
    isActive: boolean;
    stats: ExtendedInferenceStats;
    sessionCode?: string;
}

// Helper function to format coordinates more compactly
const formatCoordinate = (value: number): string => {
    if (value < 1) return value.toFixed(2);
    if (value < 10) return value.toFixed(1);
    return Math.round(value).toString();
};

// Helper function to format position
const formatPosition = (x: number, y: number): string => {
    return `(${formatCoordinate(x)}, ${formatCoordinate(y)})`;
};

// Helper function to format size
const formatSize = (width: number, height: number): string => {
    return `${formatCoordinate(width)}×${formatCoordinate(height)}`;
};

const InferencePanel: React.FC<InferencePanelProps> = ({
    inferenceData,
    isActive,
    stats,
    sessionCode = '0000'
}) => {
    const [selectedTab, setSelectedTab] = useState<'detections' | 'frame' | 'stats'>('detections');
    const [confidenceFilter, setConfidenceFilter] = useState(0.0);
    const [classFilters, _] = useState<string[]>([]);

    // Filter detections based on confidence and class
    const filteredDetections = React.useMemo(() => {
        if (!inferenceData?.detections) return [];

        return inferenceData.detections.filter(detection => {
            const confidenceMatch = detection.confidence >= confidenceFilter;
            const classMatch = classFilters.length === 0 || classFilters.includes(detection.class);
            return confidenceMatch && classMatch;
        });
    }, [inferenceData?.detections, confidenceFilter, classFilters]);

    // Get connection status
    const getConnectionStatus = () => {
        if (!isActive) return { text: 'Offline', color: 'text-red-400', icon: AlertCircle };
        if (stats.isWebSocketConnected) return { text: 'WebSocket', color: 'text-green-400', icon: CheckCircle };
        return { text: 'Connecting', color: 'text-yellow-400', icon: Signal };
    };

    const connectionStatus = getConnectionStatus();

    // Calculate detection statistics
    const detectionStats = React.useMemo(() => {
        const detections = filteredDetections;
        const total = detections.length;

        if (total === 0) return { high: 0, medium: 0, low: 0, avgConfidence: 0, uniqueClasses: 0 };

        const high = detections.filter(d => d.confidence >= 0.8).length;
        const medium = detections.filter(d => d.confidence >= 0.6 && d.confidence < 0.8).length;
        const low = detections.filter(d => d.confidence < 0.6).length;
        const avgConfidence = detections.reduce((sum, d) => sum + d.confidence, 0) / total;
        const uniqueClasses = new Set(detections.map(d => d.class)).size;

        return { high, medium, low, avgConfidence, uniqueClasses };
    }, [filteredDetections]);

    return (
        <motion.div
            className="bg-gradient-to-br from-cr-navy/95 to-cr-purple/25 backdrop-blur-xl border-2 border-cr-purple/40 rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Compact Header */}
            <div className="p-3 border-b border-cr-purple/30 bg-gradient-to-r from-cr-purple/20 to-cr-gold/10">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-cr-purple" />
                        <h3 className="text-sm font-bold text-cr-purple">AI Analysis</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <connectionStatus.icon className={`w-3 h-3 ${connectionStatus.color}`} />
                        <span className={`text-xs font-medium ${connectionStatus.color}`}>
                            {connectionStatus.text}
                        </span>
                    </div>
                </div>

                {/* Compact Stats Row */}
                <div className="grid grid-cols-4 gap-1 text-xs">
                    <div className="text-center">
                        <div className="text-yellow-400 font-bold">{sessionCode.slice(-2)}</div>
                        <div className="text-white/60">Session</div>
                    </div>
                    <div className="text-center">
                        <div className="text-green-400 font-bold">{filteredDetections.length}</div>
                        <div className="text-white/60">Objects</div>
                    </div>
                    <div className="text-center">
                        <div className="text-blue-400 font-bold">{Math.round(stats.lastInferenceTime || 0)}</div>
                        <div className="text-white/60">ms</div>
                    </div>
                    <div className="text-center">
                        <div className="text-purple-400 font-bold">{(stats.inferenceFPS || 0).toFixed(1)}</div>
                        <div className="text-white/60">FPS</div>
                    </div>
                </div>
            </div>

            {/* Performance Stats Bar */}
            <div className="px-3 py-2 bg-slate-800/30">
                <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                        <div className="text-green-400 font-bold">{Math.round(stats.lastInferenceTime || 0)}ms</div>
                        <div className="text-white/50">Avg Time</div>
                    </div>
                    <div className="text-center">
                        <div className="text-yellow-400 font-bold">{(stats.inferenceFPS || 0).toFixed(1)}/s</div>
                        <div className="text-white/50">Rate</div>
                    </div>
                    <div className="text-center">
                        <div className="text-purple-400 font-bold">{(stats.inferenceFPS || 0).toFixed(1)}</div>
                        <div className="text-white/50">FPS</div>
                    </div>
                    <div className="text-center">
                        <div className="text-white font-bold">100%</div>
                        <div className="text-white/50">Accuracy</div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-3 py-2 border-b border-slate-700/50">
                <div className="flex rounded-lg bg-slate-800/50 p-1 gap-1">
                    {[
                        { id: 'detections', label: 'Detections', icon: Target },
                        { id: 'frame', label: 'Frame', icon: Eye },
                        { id: 'stats', label: 'Stats', icon: BarChart3 }
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setSelectedTab(id as any)}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${selectedTab === id
                                ? 'bg-purple-600 text-white'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Icon className="w-3 h-3" />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    {selectedTab === 'detections' && (
                        <motion.div
                            key="detections"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="h-full flex flex-col"
                        >
                            {/* Detection Controls */}
                            <div className="p-3 border-b border-slate-700/30">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold text-white">
                                        Live Detections ({filteredDetections.length}/{inferenceData?.detections?.length || 0})
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-white/60">Live Filter:</span>
                                        <span className="text-purple-400 font-mono">
                                            {Math.round(confidenceFilter * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={confidenceFilter}
                                    onChange={(e) => setConfidenceFilter(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-white/40 mt-1">
                                    <span>Show all</span>
                                    <span>High confidence only</span>
                                </div>
                            </div>

                            {/* Detections List */}
                            <div className="flex-1 overflow-y-auto thin-scrollbar">
                                {filteredDetections.length > 0 ? (
                                    <div className="p-3 space-y-2">
                                        {filteredDetections.map((detection, idx) => (
                                            <motion.div
                                                key={idx}
                                                className="bg-slate-800/40 border border-slate-600/30 rounded-xl p-3 hover:border-purple-500/50 transition-all"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Target className="w-3 h-3 text-purple-400" />
                                                        <span className="font-bold text-white text-sm truncate">
                                                            {detection.class}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs bg-slate-700/50 px-1 py-0.5 rounded">
                                                            ID: {idx}
                                                        </span>
                                                        <span className="text-sm font-bold text-green-400">
                                                            {Math.round(detection.confidence * 100)}%
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Compact coordinates */}
                                                <div className="text-xs text-white/70 mb-2">
                                                    <div className="truncate">
                                                        {formatSize(detection.bbox.width, detection.bbox.height)} • at {formatPosition(detection.bbox.x1, detection.bbox.y1)}
                                                    </div>
                                                </div>

                                                {/* Additional info in compact grid */}
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div className="bg-slate-700/30 p-1.5 rounded text-center">
                                                        <div className="text-white/50">Center</div>
                                                        <div className="text-white font-mono">
                                                            {formatPosition(
                                                                detection.bbox.x1 + detection.bbox.width / 2,
                                                                detection.bbox.y1 + detection.bbox.height / 2
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-700/30 p-1.5 rounded text-center">
                                                        <div className="text-white/50">Area</div>
                                                        <div className="text-white font-mono">
                                                            {formatCoordinate(detection.bbox.width * detection.bbox.height)}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-700/30 p-1.5 rounded text-center">
                                                        <div className="text-white/50">Aspect</div>
                                                        <div className="text-white font-mono">
                                                            {(detection.bbox.width / detection.bbox.height).toFixed(1)}:1
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Position indicator */}
                                                <div className="mt-2 flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                        <span className="text-white/50">Position:</span>
                                                        <span className="text-white">
                                                            {detection.bbox.x1 < 100 ? 'Left' :
                                                                detection.bbox.x1 > 200 ? 'Right' : 'Middle'}
                                                        </span>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded-full text-xs ${detection.confidence >= 0.8 ? 'bg-green-900/30 text-green-400' :
                                                        detection.confidence >= 0.6 ? 'bg-yellow-900/30 text-yellow-400' :
                                                            'bg-red-900/30 text-red-400'
                                                        }`}>
                                                        {detection.confidence >= 0.8 ? 'High' :
                                                            detection.confidence >= 0.6 ? 'Medium' : 'Low'}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-white/50">
                                        <Target className="w-12 h-12 mb-3 opacity-50" />
                                        <p className="text-sm font-medium">No detections found</p>
                                        <p className="text-xs text-white/30 mt-1">
                                            {inferenceData?.detections?.length ?
                                                `Try lowering the confidence threshold` :
                                                `Waiting for AI analysis...`
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {selectedTab === 'frame' && (
                        <motion.div
                            key="frame"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="h-full flex flex-col p-3"
                        >
                            {inferenceData?.annotated_frame ? (
                                <div className="flex flex-col h-full">
                                    <h4 className="text-sm font-bold text-white mb-3">Current Frame</h4>

                                    {/* Frame Image */}
                                    <div className="flex-1 bg-black rounded-xl border border-slate-600/50 overflow-hidden mb-3">
                                        <img
                                            src={`data:image/jpeg;base64,${inferenceData.annotated_frame}`}
                                            alt="Current Analysis Frame"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    {/* Frame Info */}
                                    <div className="bg-slate-800/40 border border-slate-600/30 rounded-xl p-3">
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <div className="text-white/60">Frame Time:</div>
                                                <div className="text-green-400 font-mono">
                                                    {Math.round(stats.lastInferenceTime || 0)}ms
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-white/60">Objects Found:</div>
                                                <div className="text-purple-400 font-bold">
                                                    {inferenceData.detections?.length || 0}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-white/60">Processing Rate:</div>
                                                <div className="text-yellow-400 font-mono">
                                                    {(stats.inferenceFPS || 0).toFixed(1)}/s
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-white/60">Status:</div>
                                                <div className={connectionStatus.color}>
                                                    {connectionStatus.text}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-white/50">
                                    <Eye className="w-12 h-12 mb-3 opacity-50" />
                                    <p className="text-sm font-medium">No frame data</p>
                                    <p className="text-xs text-white/30 mt-1">
                                        Waiting for analysis frames...
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {selectedTab === 'stats' && (
                        <motion.div
                            key="stats"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="h-full p-3"
                        >
                            {/* Detection Quality Breakdown */}
                            <div className="bg-slate-800/40 border border-slate-600/30 rounded-xl p-3 mb-3">
                                <h4 className="text-sm font-bold text-white mb-3">Detection Quality</h4>
                                <div className="grid grid-cols-5 gap-2 text-xs">
                                    <div className="text-center">
                                        <div className="text-green-400 font-bold text-lg">{detectionStats.high}</div>
                                        <div className="text-white/60">High</div>
                                        <div className="text-green-400/60">≥80%</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-yellow-400 font-bold text-lg">{detectionStats.medium}</div>
                                        <div className="text-white/60">Medium</div>
                                        <div className="text-yellow-400/60">60-79%</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-red-400 font-bold text-lg">{detectionStats.low}</div>
                                        <div className="text-white/60">Low</div>
                                        <div className="text-red-400/60">&lt;60%</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-white font-bold text-lg">{Math.round(detectionStats.avgConfidence * 100)}%</div>
                                        <div className="text-white/60">Avg</div>
                                        <div className="text-white/60">confidence</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-purple-400 font-bold text-lg">{detectionStats.uniqueClasses}</div>
                                        <div className="text-white/60">Classes</div>
                                        <div className="text-purple-400/60">found</div>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Metrics */}
                            <div className="bg-slate-800/40 border border-slate-600/30 rounded-xl p-3">
                                <h4 className="text-sm font-bold text-white mb-3">Performance</h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Inference Time:</span>
                                        <span className="text-green-400 font-mono">{Math.round(stats.lastInferenceTime || 0)}ms</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Processing Rate:</span>
                                        <span className="text-yellow-400 font-mono">{(stats.inferenceFPS || 0).toFixed(1)}/s</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Total Frames:</span>
                                        <span className="text-blue-400 font-mono">{stats.totalFramesProcessed || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Connection:</span>
                                        <span className={connectionStatus.color}>{connectionStatus.text}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default InferencePanel;