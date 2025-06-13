// royal_trainer_client/src/components/inference/EnhancedInferenceControlPanel.tsx

import React, { useEffect, useCallback, useState } from 'react';
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
    Server,
    Camera,
    Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface InferenceControlPanelProps {
    sessionCode: string;
    isConnected: boolean;
    isInferenceEnabled: boolean;
    onToggleInference: (enabled: boolean) => Promise<boolean>;
    frameStats?: {
        totalFramesCaptured: number;
        isCapturing: boolean;
        captureRate: number;
        quality: number;
    };
    className?: string;
}

interface ServiceStatus {
    is_ready: boolean;
    model_path: string;
    total_inferences: number;
    avg_inference_time: number;
    confidence_threshold: number;
    classes: string[];
}

const InferenceControlPanel: React.FC<InferenceControlPanelProps> = ({
    sessionCode,
    isConnected,
    isInferenceEnabled,
    onToggleInference,
    frameStats,
    className = ''
}) => {
    const [isToggling, setIsToggling] = useState(false);
    const [toggleError, setToggleError] = useState<string | null>(null);
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 3;

    // Check service status
    const checkServiceStatus = useCallback(async () => {
        if (!isConnected || !sessionCode) return;

        const { getApiUrl } = await import("../../config/api");
        try {
            const response = await fetch(getApiUrl(`api/inference/${sessionCode}/status`));
            if (response.ok) {
                const data = await response.json();
                setServiceStatus(data.service_stats);
                setToggleError(null);
            }
        } catch (error) {
            console.log("-------------------")
            console.log(getApiUrl(`api/inference/${sessionCode}/status`))
            console.warn('Failed to check service status:', error);
        }
    }, [isConnected, sessionCode]);

    // Check status on mount and connection changes
    useEffect(() => {
        checkServiceStatus();
        const interval = setInterval(checkServiceStatus, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, [checkServiceStatus]);

    const handleToggleInference = useCallback(async () => {
        if (!sessionCode || isToggling) return;

        setIsToggling(true);
        setToggleError(null);

        try {
            const success = await onToggleInference(!isInferenceEnabled);

            if (success) {
                setRetryCount(0);

                // Celebration for enabling AI
                if (!isInferenceEnabled) {
                    confetti({
                        particleCount: 80,
                        spread: 60,
                        origin: { y: 0.7 },
                        colors: ['#b154ff', '#ffd700', '#00ff00']
                    });
                }
            } else {
                throw new Error('Toggle request failed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Implement retry logic
            if (retryCount < maxRetries) {
                const newRetryCount = retryCount + 1;
                setRetryCount(newRetryCount);
                setToggleError(`${errorMessage} (Retrying ${newRetryCount}/${maxRetries}...)`);

                // Exponential backoff
                const retryDelay = Math.pow(2, newRetryCount - 1) * 1000;
                setTimeout(() => {
                    if (newRetryCount <= maxRetries) {
                        handleToggleInference();
                    }
                }, retryDelay);
            } else {
                setToggleError(errorMessage);
                setRetryCount(0);
            }
        } finally {
            setIsToggling(false);
        }
    }, [sessionCode, isToggling, isInferenceEnabled, onToggleInference, retryCount]);

    if (!isConnected) {
        return null;
    }

    const isServiceReady = serviceStatus?.is_ready ?? false;
    const canToggle = !isToggling && isServiceReady;

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
                    <h3 className="text-lg font-bold text-white">AI Analysis</h3>
                </div>

                <div className="flex items-center gap-2">
                    {/* Service Status */}
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isServiceReady
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        <Server className="w-3 h-3" />
                        <span>{isServiceReady ? 'Ready' : 'Loading'}</span>
                    </div>

                    {/* Connection Status */}
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isConnected
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                        }`}>
                        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        <span>{isConnected ? 'Connected' : 'Offline'}</span>
                    </div>

                    {/* Settings */}
                    <motion.button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Advanced Settings"
                    >
                        <Settings className="w-4 h-4 text-white/70" />
                    </motion.button>

                    {/* Refresh */}
                    <motion.button
                        onClick={checkServiceStatus}
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
                    <span className="text-white/80 font-medium">YOLOv8 Detection</span>
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

                {/* Session & Model Info */}
                <div className="text-xs text-white/60 bg-black/20 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between">
                        <span>Session:</span>
                        <span className="font-mono text-cr-gold">{sessionCode}</span>
                    </div>
                    {serviceStatus && (
                        <>
                            <div className="flex justify-between">
                                <span>Model:</span>
                                <span className="text-white/80">{serviceStatus.model_path.split('/').pop()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Classes:</span>
                                <span className="text-cr-purple">{serviceStatus.classes.length} types</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Confidence:</span>
                                <span className="text-white/80">{Math.round(serviceStatus.confidence_threshold * 100)}%</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Frame Capture Stats */}
                {frameStats && isInferenceEnabled && (
                    <div className="text-xs text-white/60 bg-black/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Camera className="w-4 h-4 text-cr-gold" />
                            <span className="font-medium">Frame Capture</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex justify-between">
                                <span>Rate:</span>
                                <span className="text-cr-gold">{frameStats.captureRate} FPS</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Quality:</span>
                                <span className="text-white/80">{Math.round(frameStats.quality * 100)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Captured:</span>
                                <span className="text-white/80">{frameStats.totalFramesCaptured}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Status:</span>
                                <span className={frameStats.isCapturing ? 'text-green-400' : 'text-red-400'}>
                                    {frameStats.isCapturing ? 'Active' : 'Stopped'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Toggle Button */}
                <motion.button
                    onClick={handleToggleInference}
                    disabled={!canToggle}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-200 flex items-center justify-center gap-3 border-3 ${!isServiceReady
                        ? 'bg-gray-600 border-gray-500 cursor-not-allowed'
                        : isInferenceEnabled
                            ? 'bg-red-gradient border-red-800 hover:scale-105 active:scale-95'
                            : 'bg-purple-gradient border-cr-purple hover:scale-105 active:scale-95'
                        } ${(!canToggle) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    whileHover={canToggle ? { y: -2 } : {}}
                    whileTap={canToggle ? { y: 0 } : {}}
                >
                    {!isServiceReady ? (
                        <>
                            <Server className="w-5 h-5" />
                            AI Service Loading...
                        </>
                    ) : isToggling ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {retryCount > 0
                                ? `Retrying... (${retryCount}/${maxRetries})`
                                : isInferenceEnabled ? 'Stopping AI...' : 'Starting AI...'
                            }
                        </>
                    ) : (
                        <>
                            <Brain className="w-5 h-5" />
                            {isInferenceEnabled ? 'Stop AI Detection' : 'Start AI Detection'}
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
                                        {retryCount > 0 ? 'Retrying...' : 'Error'}
                                    </div>
                                    <div className="text-red-200 text-xs mt-1">
                                        {toggleError}
                                    </div>
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
                                    AI is analyzing Clash Royale gameplay
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Advanced Settings Panel */}
                <AnimatePresence>
                    {showAdvanced && serviceStatus && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-black/20 rounded-lg p-4 border border-white/10"
                        >
                            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-cr-gold" />
                                Advanced Settings
                            </h4>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="text-white/70 mb-1 block">Detection Classes</label>
                                    <div className="flex flex-wrap gap-1">
                                        {serviceStatus.classes.slice(0, 8).map((className, index) => (
                                            <span key={index} className="px-2 py-1 bg-cr-purple/20 text-cr-purple rounded text-xs">
                                                {className}
                                            </span>
                                        ))}
                                        {serviceStatus.classes.length > 8 && (
                                            <span className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs">
                                                +{serviceStatus.classes.length - 8} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-white/70 mb-1 block">Total Inferences</label>
                                        <div className="text-white font-mono">{serviceStatus.total_inferences.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <label className="text-white/70 mb-1 block">Avg Processing</label>
                                        <div className="text-white font-mono">{serviceStatus.avg_inference_time.toFixed(1)}ms</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Performance Indicators */}
                {isInferenceEnabled && serviceStatus && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10"
                    >
                        <div className="text-center">
                            <div className="text-xs text-white/50">Model</div>
                            <div className="text-sm font-bold text-green-400">YOLOv8</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-white/50">Speed</div>
                            <div className="text-sm font-bold text-white">
                                {serviceStatus.avg_inference_time < 100 ? 'Fast' : 'Normal'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-white/50">Mode</div>
                            <div className="text-sm font-bold text-cr-gold">Real-time</div>
                        </div>
                    </motion.div>
                )}

                {/* Help Text */}
                <div className="text-xs text-white/60 text-center">
                    {!isServiceReady ? (
                        '⚠️ Loading AI model... Please wait'
                    ) : isInferenceEnabled ? (
                        '🧠 Detecting troops, buildings, and spells in your gameplay'
                    ) : (
                        '⚡ Click to start real-time Clash Royale object detection'
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default InferenceControlPanel;