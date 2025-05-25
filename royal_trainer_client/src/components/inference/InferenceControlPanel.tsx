import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BrainCircuit,
    Brain,
    AlertTriangle,
    CheckCircle,
    Loader2,
    RefreshCw,
    Wifi,
    WifiOff,
    Server
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useInferenceToggle } from '../../hooks/useInferenceToggle';

interface InferenceControlPanelProps {
    sessionCode: string;
    isConnected: boolean;
    onInferenceStateChange?: (enabled: boolean) => void;
    className?: string;
}

const InferenceControlPanel: React.FC<InferenceControlPanelProps> = ({
    sessionCode,
    isConnected,
    onInferenceStateChange,
    className = ''
}) => {
    const {
        isInferenceEnabled,
        isToggling,
        toggleError,
        hasYoloService,
        retryCount,
        maxRetries,
        toggleInference,
        getInferenceStatus,
        refreshStatus,
        resetState,
        isRetrying,
        canToggle,
        hasConnection
    } = useInferenceToggle();

    // Check status when connected
    useEffect(() => {
        if (isConnected && sessionCode) {
            getInferenceStatus(sessionCode);
        } else {
            resetState();
        }
    }, [isConnected, sessionCode, getInferenceStatus, resetState]);

    // Notify parent of state changes
    useEffect(() => {
        onInferenceStateChange?.(isInferenceEnabled);
    }, [isInferenceEnabled, onInferenceStateChange]);

    const handleToggleInference = useCallback(async () => {
        if (!sessionCode || !canToggle) return;

        const newState = !isInferenceEnabled;
        const success = await toggleInference(sessionCode, newState);

        if (success && newState) {
            // Celebration confetti when AI is enabled!
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.7 },
                colors: ['#b154ff', '#ffd700', '#00ff00']
            });
        }
    }, [sessionCode, canToggle, isInferenceEnabled, toggleInference]);

    const handleRefreshStatus = useCallback(async () => {
        if (sessionCode) {
            await refreshStatus(sessionCode);
        }
    }, [sessionCode, refreshStatus]);

    if (!isConnected) {
        return null;
    }

    return (
        <motion.div
            className={`bg-gradient-to-br from-cr-purple/20 to-cr-gold/10 backdrop-blur-xl border-3 border-cr-purple/40 rounded-2xl p-6 shadow-xl ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <BrainCircuit className="w-6 h-6 text-cr-purple" />
                    <h3 className="text-lg font-bold text-white">AI Control</h3>
                </div>

                {/* Status Indicators */}
                <div className="flex items-center gap-2">
                    {/* Connection Status */}
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${hasConnection
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                        }`}>
                        {hasConnection ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        <span>{hasConnection ? 'Connected' : 'Offline'}</span>
                    </div>

                    {/* YOLO Service Status */}
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${hasYoloService
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        <Server className="w-3 h-3" />
                        <span>{hasYoloService ? 'AI Ready' : 'AI Loading'}</span>
                    </div>

                    {/* Refresh Button */}
                    <motion.button
                        onClick={handleRefreshStatus}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Refresh Status"
                    >
                        <RefreshCw className="w-4 h-4 text-white/70" />
                    </motion.button>
                </div>
            </div>

            <div className="space-y-4">
                {/* Status Display */}
                <div className="flex items-center justify-between">
                    <span className="text-white/80 font-medium">Real-time Analysis</span>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isInferenceEnabled
                            ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50'
                            : 'bg-gray-500'
                            }`} />
                        <span className={`text-sm font-bold ${isInferenceEnabled ? 'text-green-400' : 'text-gray-400'
                            }`}>
                            {isInferenceEnabled ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                    </div>
                </div>

                {/* Session Info */}
                <div className="text-xs text-white/60 bg-black/20 p-2 rounded-lg">
                    <div className="flex justify-between">
                        <span>Session:</span>
                        <span className="font-mono text-cr-gold">{sessionCode}</span>
                    </div>
                    {isInferenceEnabled && (
                        <div className="flex justify-between mt-1">
                            <span>AI Mode:</span>
                            <span className="text-green-400">Object Detection</span>
                        </div>
                    )}
                </div>

                {/* Toggle Button */}
                <motion.button
                    onClick={handleToggleInference}
                    disabled={!canToggle || !hasYoloService}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-200 flex items-center justify-center gap-3 border-3 ${!hasYoloService
                        ? 'bg-gray-600 border-gray-500 cursor-not-allowed'
                        : isInferenceEnabled
                            ? 'bg-red-gradient border-red-800 hover:scale-105 active:scale-95'
                            : 'bg-purple-gradient border-cr-purple hover:scale-105 active:scale-95'
                        } ${(!canToggle || !hasYoloService) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    whileHover={canToggle && hasYoloService ? { y: -2 } : {}}
                    whileTap={canToggle && hasYoloService ? { y: 0 } : {}}
                >
                    {!hasYoloService ? (
                        <>
                            <Server className="w-5 h-5" />
                            AI Service Loading...
                        </>
                    ) : isToggling ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {isRetrying
                                ? `Retrying... (${retryCount}/${maxRetries})`
                                : isInferenceEnabled ? 'Stopping...' : 'Starting...'
                            }
                        </>
                    ) : (
                        <>
                            <Brain className="w-5 h-5" />
                            {isInferenceEnabled ? 'Stop AI Analysis' : 'Start AI Analysis'}
                        </>
                    )}
                </motion.button>

                {/* Error Display */}
                <AnimatePresence>
                    {toggleError && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-3 bg-red-900/30 border border-red-500/40 rounded-lg"
                        >
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-red-300 text-sm font-medium">
                                        {isRetrying ? 'Retrying...' : 'Error'}
                                    </div>
                                    <div className="text-red-200 text-xs mt-1">
                                        {toggleError}
                                    </div>
                                    {retryCount > 0 && (
                                        <div className="text-red-300 text-xs mt-2">
                                            Attempt {retryCount} of {maxRetries}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Success State */}
                <AnimatePresence>
                    {isInferenceEnabled && !toggleError && !isToggling && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-3 bg-green-900/30 border border-green-500/40 rounded-lg"
                        >
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <div className="text-green-300 text-sm">
                                    AI is analyzing your gameplay in real-time
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Help Text */}
                <div className="text-xs text-white/60 text-center">
                    {!hasYoloService ? (
                        '⚠️ Waiting for AI service to initialize...'
                    ) : isInferenceEnabled ? (
                        '🧠 AI is detecting objects in your Clash Royale gameplay'
                    ) : (
                        '⚡ Enable AI to get real-time object detection and analysis'
                    )}
                </div>

                {/* Performance Indicators */}
                {isInferenceEnabled && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10"
                    >
                        <div className="text-center">
                            <div className="text-xs text-white/50">Detection</div>
                            <div className="text-sm font-bold text-green-400">Active</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-white/50">Latency</div>
                            <div className="text-sm font-bold text-white">~50ms</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-white/50">Quality</div>
                            <div className="text-sm font-bold text-cr-gold">HD</div>
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default InferenceControlPanel;