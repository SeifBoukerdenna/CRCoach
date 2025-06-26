// royal_trainer_client/src/components/HistoryAndStats.tsx - Updated with Troop Deployment Detection

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Target,
    Activity,
    TrendingUp,
    Eye,
    Users
} from 'lucide-react';
import type {
    DetectionHistoryItem,
    InferenceData,
} from '../types';
import { useTroopDeploymentDetection } from '../hooks/useTroopDeploymentDetection';
import TroopDeploymentPanel from './inference/TroopDeploymentPanel';

interface HistoryAndStatsProps {
    history: DetectionHistoryItem[];
    selectedFrame: DetectionHistoryItem | null;
    selectedFrameId: string | null;
    onSelectFrame: (frame: DetectionHistoryItem | null) => void;
    onClearHistory: () => void;
    performanceMetrics?: {
        totalFrames: number;
        avgDetections: number;
        avgInferenceTime: number;
    };
    inferenceData?: InferenceData | null;
}

const HistoryAndStats: React.FC<HistoryAndStatsProps> = ({
    history,
    selectedFrame,
    selectedFrameId,
    onSelectFrame,
    onClearHistory,
    performanceMetrics,

}) => {
    const [activeTab, setActiveTab] = useState<'detections' | 'deployments'>('detections');

    // NEW: Troop deployment detection
    const [deploymentState, deploymentActions] = useTroopDeploymentDetection(history, {
        timeWindow: 1000,        // 2 seconds
        proximityThreshold: 80,  // 80 pixels
        minDetections: 2,        // At least 3 detections
        maxDetections: 15,       // Up to 15 detections
        confidenceThreshold: 0.4 // Minimum 60% confidence
    });

    // Helper to get detection type distribution
    const getDetectionTypeDistribution = () => {
        const typeCount = new Map<string, number>();
        history.forEach(item => {
            item.detections.forEach(detection => {
                const count = typeCount.get(detection.class_name) || 0;
                typeCount.set(detection.class_name, count + 1);
            });
        });
        return Array.from(typeCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    };

    const typeDistribution = getDetectionTypeDistribution();

    /* ────────── SELECTED FRAME DETAIL VIEW ─────────────── */
    if (selectedFrame) {
        return (
            <div className="space-y-4">
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Eye className="w-5 h-5 text-purple-400" />
                            Frame Details
                        </h3>
                        <button
                            onClick={() => onSelectFrame(null)}
                            className="px-3 py-1 bg-slate-700/50 text-white/70 rounded hover:bg-slate-700 transition-colors text-sm"
                        >
                            Back to List
                        </button>
                    </div>

                    {selectedFrame.annotatedFrame && (
                        <div className="mb-4">
                            <img
                                src={`data:image/jpeg;base64,${selectedFrame.annotatedFrame}`}
                                alt="Detection frame"
                                className="w-full max-w-md mx-auto rounded-lg border border-slate-600"
                            />
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="text-sm text-white/60">
                            {new Date(selectedFrame.timestamp).toLocaleString()}
                        </div>

                        {selectedFrame.detections.map((d, i) => {
                            const [x1, y1, x2, y2] = d.bbox;
                            return (
                                <div key={i} className="bg-slate-700/50 rounded-lg p-2">
                                    <div className="flex justify-between">
                                        <span className="text-white capitalize">{d.class_name}</span>
                                        <span className="text-green-400 text-sm">
                                            {Math.round(d.confidence * 100)}%
                                        </span>
                                    </div>
                                    <div className="text-xs text-white/60">
                                        {Math.round(x2 - x1)}×{Math.round(y2 - y1)} at ({Math.round(x1)}, {Math.round(y1)})
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    /* ────────── MAIN TABS VIEW ─────────────── */
    return (
        <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-1">
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab('detections')}
                        className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'detections'
                            ? 'bg-cr-purple text-white shadow-lg'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        <Target className="w-4 h-4" />
                        Detections
                    </button>
                    <button
                        onClick={() => setActiveTab('deployments')}
                        className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'deployments'
                            ? 'bg-cr-purple text-white shadow-lg'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Deployments
                        {deploymentState.recentDeployments.length > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                                {deploymentState.recentDeployments.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'detections' && (
                <div className="grid grid-cols-4 gap-4 h-full">
                    {/* History list */}
                    <div className="col-span-2 space-y-4">
                        {!!history.length && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3"
                            >
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-purple-400" />
                                    Detection History ({history.length})
                                </h4>

                                <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar">
                                    {history
                                        .slice(0, 10)
                                        .filter((item): item is DetectionHistoryItem => !!item?.id)
                                        .map(item => (
                                            <motion.button
                                                key={item.id}
                                                onClick={() => onSelectFrame(item)}
                                                className={`w-full p-2 rounded-lg text-left ${selectedFrameId === item.id
                                                    ? 'bg-purple-600/30 border border-purple-500/50'
                                                    : 'bg-slate-700/30 hover:bg-slate-700/50'
                                                    } transition-all`}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-white text-sm font-medium">
                                                        {item.detections.length} detection{item.detections.length !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="text-white/50 text-xs">
                                                        {new Date(item.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-white/60">
                                                    {item.detections.slice(0, 3).map(d => d.class_name).join(', ')}
                                                    {item.detections.length > 3 && ` +${item.detections.length - 3} more`}
                                                </div>
                                            </motion.button>
                                        ))}
                                </div>

                                <button
                                    onClick={onClearHistory}
                                    className="w-full mt-3 px-3 py-2 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors text-sm"
                                >
                                    Clear History
                                </button>
                            </motion.div>
                        )}
                    </div>

                    {/* Stats panels */}
                    <div className="col-span-2 space-y-4">
                        {/* Performance stats */}
                        {performanceMetrics && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4"
                            >
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-green-400" />
                                    Performance Metrics
                                </h4>

                                <div className="grid grid-cols-1 gap-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Total Frames:</span>
                                        <span className="text-white font-medium">{performanceMetrics.totalFrames}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Avg Detections:</span>
                                        <span className="text-green-400 font-medium">{performanceMetrics.avgDetections.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Avg Inference:</span>
                                        <span className="text-blue-400 font-medium">{performanceMetrics.avgInferenceTime.toFixed(1)}ms</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Detection type distribution */}
                        {typeDistribution.length > 0 && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4"
                            >
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-yellow-400" />
                                    Top Detected Objects
                                </h4>

                                <div className="space-y-2">
                                    {typeDistribution.map(([type, count],) => (
                                        <div key={type} className="flex justify-between items-center">
                                            <span className="text-white/80 text-sm capitalize">{type}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-slate-700/50 rounded-full h-2">
                                                    <div
                                                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${(count / typeDistribution[0][1]) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-yellow-400 text-sm font-medium w-8 text-right">
                                                    {count}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            )}

            {/* Deployments Tab */}
            {activeTab === 'deployments' && (
                <TroopDeploymentPanel
                    state={deploymentState}
                    actions={deploymentActions}
                />
            )}

            {/* No history message */}
            {!history.length && activeTab === 'detections' && (
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-8 text-center">
                    <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-white/60 mb-2">No detection history available</p>
                    <p className="text-white/40 text-sm">
                        Start AI inference to see detection results here
                    </p>
                </div>
            )}
        </div>
    );
};

export default HistoryAndStats;