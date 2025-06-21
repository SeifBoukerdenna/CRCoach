// royal_trainer_client/src/components/inference/InferenceControlPanel.tsx - Updated with Auth Integration

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
    Brain,
    Loader2,
    AlertTriangle,
    Server,
    Settings,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    XCircle,
} from 'lucide-react';

// ✅ Import the updated hook and auth popup
import { useInferenceToggle } from '../../hooks/useInferenceToggle';
import { getApiUrl } from '../../config/api';
import { useAuthPopup } from '../auth/DiscordAuthPopup';

interface InferenceControlPanelProps {
    sessionCode: string | null;
    isConnected: boolean;
    frameStats: {
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
    frameStats,
    className = ''
}) => {
    // ✅ Use the updated inference toggle hook with built-in auth
    const {
        isInferenceEnabled,
        hasYoloService,
        isToggling,
        toggleError,
        retryCount,
        authCheckResult,
        toggleInference,
        clearError
    } = useInferenceToggle(sessionCode);

    // ✅ Auth popup for manual control (optional - the hook handles most cases automatically)
    const { showPopup, AuthPopupComponent } = useAuthPopup();

    const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const maxRetries = 3;

    // Check service status
    const checkServiceStatus = useCallback(async () => {
        if (!isConnected || !sessionCode) return;
        try {
            const response = await fetch(getApiUrl(`api/inference/${sessionCode}/status`));
            if (response.ok) {
                const data = await response.json();
                setServiceStatus(data.service_stats);
            }
        } catch (error) {
            console.warn('Failed to check service status:', error);
        }
    }, [isConnected, sessionCode]);

    // Check status on mount and connection changes
    useEffect(() => {
        checkServiceStatus();
        const interval = setInterval(checkServiceStatus, 10000);
        return () => clearInterval(interval);
    }, [checkServiceStatus]);

    // ✅ Handle inference toggle with automatic auth checking
    const handleToggleInference = useCallback(async () => {
        if (!sessionCode || isToggling) return;

        try {
            // The toggleInference function now handles auth automatically
            const success = await toggleInference(!isInferenceEnabled);

            if (success) {
                // Celebration for enabling AI
                if (!isInferenceEnabled) {
                    confetti({
                        particleCount: 80,
                        spread: 60,
                        origin: { y: 0.7 },
                        colors: ['#b154ff', '#ffd700', '#00ff00']
                    });
                }
            }
        } catch (error) {
            console.error('Inference toggle failed:', error);
        }
    }, [sessionCode, isToggling, toggleInference, isInferenceEnabled]);

    const isServiceReady = hasYoloService && serviceStatus?.is_ready;
    const canToggle = isConnected && sessionCode && isServiceReady && !isToggling;

    return (
        <motion.div
            className={`bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 ${className}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <h3 className="text-white font-semibold">AI Detection</h3>
                </div>

                {/* ✅ Auth Status Indicator */}
                <div className="flex items-center gap-2">
                    {authCheckResult && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${authCheckResult.can_use_inference
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                            }`}>
                            {authCheckResult.can_use_inference ? (
                                <>
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Authorized</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-3 h-3" />
                                    <span>Auth Required</span>
                                </>
                            )}
                        </div>
                    )}

                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Connection Status */}
            {!isConnected && (
                <div className="mb-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-300 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        Connect to a session to enable AI detection
                    </div>
                </div>
            )}

            {/* Service Status */}
            {isConnected && (
                <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">AI Service:</span>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isServiceReady ? 'bg-green-400' : 'bg-red-400'}`} />
                            <span className={isServiceReady ? 'text-green-400' : 'text-red-400'}>
                                {isServiceReady ? 'Ready' : 'Loading'}
                            </span>
                        </div>
                    </div>

                    {/* Frame Capture Status */}
                    {frameStats && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-300">Frame Capture:</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${frameStats.isCapturing ? 'bg-green-400' : 'bg-red-400'}`} />
                                <span className={frameStats.isCapturing ? 'text-green-400' : 'text-red-400'}>
                                    {frameStats.isCapturing ? 'Active' : 'Stopped'}
                                </span>
                            </div>
                        </div>
                    )}
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

            {/* ✅ Manual Auth Check Button (for testing/debugging) */}
            {!authCheckResult?.can_use_inference && (
                <motion.button
                    onClick={() => showPopup({
                        authRequired: !authCheckResult?.authenticated,
                        guildRequired: authCheckResult?.authenticated && !authCheckResult?.in_required_guild,
                        discordInviteUrl: authCheckResult?.discord_invite_url,
                        errorMessage: authCheckResult?.error_message
                    })}
                    className="w-full mt-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors flex items-center justify-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    🔐 Check Authentication
                </motion.button>
            )}

            {/* Error Display */}
            <AnimatePresence>
                {toggleError && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-3 p-3 bg-red-900/30 border border-red-500/40 rounded-lg"
                    >
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="text-red-300 text-sm font-medium">
                                    {retryCount > 0 ? `Retry ${retryCount}/${maxRetries}` : 'Error'}
                                </div>
                                <div className="text-red-200 text-xs mt-1">
                                    {toggleError}
                                </div>
                                <button
                                    onClick={clearError}
                                    className="text-red-400 hover:text-red-300 text-xs mt-1 underline"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Advanced Settings */}
            <AnimatePresence>
                {showAdvanced && serviceStatus && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-slate-700/50"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-300">
                                <Settings className="w-4 h-4" />
                                <span className="text-sm font-medium">Service Details</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Inferences:</span>
                                    <span className="text-white">{serviceStatus.total_inferences}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Avg Time:</span>
                                    <span className="text-white">{serviceStatus.avg_inference_time?.toFixed(1)}ms</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Confidence:</span>
                                    <span className="text-white">{(serviceStatus.confidence_threshold * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Classes:</span>
                                    <span className="text-white">{serviceStatus.classes?.length || 0}</span>
                                </div>
                            </div>

                            {/* Auth Details */}
                            {authCheckResult && (
                                <div className="mt-3 p-2 bg-slate-800/50 rounded-lg">
                                    <div className="text-xs space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Authenticated:</span>
                                            <span className={authCheckResult.authenticated ? 'text-green-400' : 'text-red-400'}>
                                                {authCheckResult.authenticated ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Guild Member:</span>
                                            <span className={authCheckResult.in_required_guild ? 'text-green-400' : 'text-red-400'}>
                                                {authCheckResult.in_required_guild ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        {authCheckResult.username && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">User:</span>
                                                <span className="text-white">{authCheckResult.username}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ✅ Discord Auth Popup - This will automatically show when auth is required */}
            <AuthPopupComponent />
        </motion.div>
    );
};

export default InferenceControlPanel;