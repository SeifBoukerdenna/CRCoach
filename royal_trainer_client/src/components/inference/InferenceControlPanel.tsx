// royal_trainer_client/src/components/inference/InferenceControlPanel.tsx - Fixed layout and organization

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    Play,
    Pause,
    Settings,
    ChevronDown,
    ChevronUp,
    Target,
    BarChart3,
    Info,
} from 'lucide-react';

interface InferenceStats {
    connectionAttempts?: number;
    isWebSocketConnected?: boolean;
    frameCount?: number;
    inferenceFPS?: number;
    lastInferenceTime?: number;
    networkLatency?: number;
    modelLoadTime?: number;
    totalFramesProcessed?: number;
}

interface InferenceControlPanelProps {
    isInferenceEnabled: boolean;
    onToggleInference: (enabled: boolean) => Promise<boolean>;
    getFrameStats: () => any;
    stats?: InferenceStats;
    sessionCode: string;
}

const InferenceControlPanel: React.FC<InferenceControlPanelProps> = ({
    isInferenceEnabled,
    onToggleInference,
    stats = {},
    sessionCode
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    const handleToggleInference = async () => {
        setIsToggling(true);
        try {
            await onToggleInference(!isInferenceEnabled);
        } catch (error) {
            console.error('Failed to toggle inference:', error);
        } finally {
            setIsToggling(false);
        }
    };

    const getConnectionStatus = () => {
        if (stats.isWebSocketConnected) return { text: 'Connected', color: 'text-green-400' };
        if (stats.connectionAttempts && stats.connectionAttempts > 0) return { text: 'Connecting', color: 'text-yellow-400' };
        return { text: 'Offline', color: 'text-red-400' };
    };

    const connectionStatus = getConnectionStatus();

    return (
        <motion.div
            className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
        >
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Brain className="w-6 h-6 text-purple-400" />
                            {isInferenceEnabled && (
                                <motion.div
                                    className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">AI Analysis</h3>
                            <div className="flex items-center gap-2 text-xs">
                                <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus.color.replace('text-', 'bg-')}`}></div>
                                <span className={connectionStatus.color}>
                                    {connectionStatus.text}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium ${isInferenceEnabled
                            ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                            : 'bg-slate-700/50 text-white/60 border border-slate-600/30'
                            }`}>
                            {isInferenceEnabled ? 'Ready' : 'Offline'}
                        </div>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1 text-white/60 hover:text-white transition-colors"
                        >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4">
                {/* Detection Model Info */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-purple-400" />
                        <span className="font-semibold text-white">YOLOv8 Detection</span>
                        <div className={`ml-auto w-2 h-2 rounded-full ${isInferenceEnabled ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                        <span className="text-xs font-medium text-white/60">
                            {isInferenceEnabled ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                    </div>

                    {/* Model Details Grid */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div>
                            <div className="text-xs text-white/60 mb-1">Session:</div>
                            <div className="text-sm font-mono text-yellow-400">{sessionCode}</div>
                        </div>
                        <div>
                            <div className="text-xs text-white/60 mb-1">Model:</div>
                            <div className="text-sm font-medium text-white">best.pt</div>
                        </div>
                        <div>
                            <div className="text-xs text-white/60 mb-1">Classes:</div>
                            <div className="text-sm font-medium text-purple-400">1 types</div>
                        </div>
                        <div>
                            <div className="text-xs text-white/60 mb-1">Confidence:</div>
                            <div className="text-sm font-medium text-white">20%</div>
                        </div>
                    </div>
                </div>

                {/* Control Button */}
                <motion.button
                    onClick={handleToggleInference}
                    disabled={isToggling}
                    className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 mb-4 ${isInferenceEnabled
                        ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500/30'
                        : 'bg-purple-600 hover:bg-purple-700 text-white border border-purple-500/30'
                        } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                    whileHover={!isToggling ? { scale: 1.02 } : {}}
                    whileTap={!isToggling ? { scale: 0.98 } : {}}
                >
                    {isToggling ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                                <Settings className="w-5 h-5" />
                            </motion.div>
                            {isInferenceEnabled ? 'Stopping...' : 'Starting...'}
                        </>
                    ) : isInferenceEnabled ? (
                        <>
                            <Pause className="w-5 h-5" />
                            Stop AI Detection
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            Start AI Detection
                        </>
                    )}
                </motion.button>

                {/* Advanced Settings - Only show when expanded */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-4"
                        >
                            {/* Detection Classes */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Settings className="w-4 h-4 text-orange-400" />
                                    <span className="font-semibold text-white text-sm">Advanced Settings</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs text-white/60 mb-1">Detection Classes</div>
                                    <div className="flex flex-wrap gap-1">
                                        <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded text-xs border border-purple-500/30">
                                            deployment
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Stats */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="w-4 h-4 text-blue-400" />
                                    <span className="font-semibold text-white text-sm">Performance</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-slate-700/30 rounded border border-slate-600/20">
                                        <div className="text-white/60 mb-1">Total Inferences</div>
                                        <div className="text-white font-mono">135</div>
                                    </div>
                                    <div className="p-2 bg-slate-700/30 rounded border border-slate-600/20">
                                        <div className="text-white/60 mb-1">Avg Processing</div>
                                        <div className="text-white font-mono">159.9ms</div>
                                    </div>
                                </div>
                            </div>

                            {/* Helper Text */}
                            <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-blue-400">
                                        <div className="font-medium mb-1">Real-time Object Detection</div>
                                        <div className="text-blue-400/80">
                                            Click to start real-time Clash Royale object detection and analysis.
                                        </div>
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

export default InferenceControlPanel;