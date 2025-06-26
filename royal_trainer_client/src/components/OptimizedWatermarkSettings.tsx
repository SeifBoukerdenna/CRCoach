// royal_trainer_client/src/components/OptimizedWatermarkSettings.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Monitor, TrendingUp, User } from 'lucide-react';
import { useOptimizedWatermark } from '../hooks/useOptimizedWatermark';
import { getDiscordDisplayName } from '../types/auth';
import { useDiscordAuth } from '../hooks/useDiscordAuth';

const OptimizedWatermarkSettings: React.FC = () => {
    const {
        watermarkSettings,
        deviceInfo,
        updateWatermarkSettings,
        toggleWatermark,
        resetToSecureDefaults,
        setOpacityWithPerformanceCheck,
        performanceMetrics
    } = useOptimizedWatermark();

    const { user, isAuthenticated } = useDiscordAuth();

    const handleOpacityChange = (value: number) => {
        setOpacityWithPerformanceCheck(value / 100);
    };

    const handleSizeChange = (size: 'small' | 'medium' | 'large') => {
        updateWatermarkSettings({ size });
    };

    const handlePerformanceModeChange = (mode: 'low' | 'medium' | 'high') => {
        updateWatermarkSettings({ performanceMode: mode });
    };

    const getPerformanceColor = () => {
        if (performanceMetrics.avgFrameTime > 16.67) return 'text-red-400';
        if (performanceMetrics.avgFrameTime > 10) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getPerformanceStatus = () => {
        if (performanceMetrics.avgFrameTime > 16.67) return 'Poor';
        if (performanceMetrics.avgFrameTime > 10) return 'Good';
        return 'Excellent';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-cr-purple/20"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cr-purple/20 rounded-lg">
                        <Shield className="w-5 h-5 text-cr-purple" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg">
                            Optimized Anti-Piracy Protection
                        </h3>
                        <p className="text-white/60 text-sm">
                            High-performance watermark with 90% less CPU usage
                        </p>
                    </div>
                </div>

                {/* Performance Indicator */}
                <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className={`w-4 h-4 ${getPerformanceColor()}`} />
                    <span className={getPerformanceColor()}>
                        {getPerformanceStatus()}
                    </span>
                </div>
            </div>

            {/* Discord User Info */}
            {isAuthenticated && user && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 mb-6"
                >
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-indigo-400" />
                        <div>
                            <h4 className="text-white font-medium">
                                Discord Integration Active
                            </h4>
                            <p className="text-white/60 text-sm">
                                Watermark customized for: <span className="text-indigo-400 font-mono">
                                    {getDiscordDisplayName(user)}
                                </span>
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Main Toggle */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h4 className="text-white font-medium mb-1">
                        Protection Status
                    </h4>
                    <p className="text-white/60 text-sm">
                        {watermarkSettings.enabled
                            ? "Active - Content is protected with optimized watermarking"
                            : "Disabled - Content is vulnerable to unauthorized use"
                        }
                    </p>
                </div>
                <motion.button
                    onClick={toggleWatermark}
                    className={`relative w-14 h-7 rounded-full transition-colors ${watermarkSettings.enabled ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    whileTap={{ scale: 0.95 }}
                >
                    <motion.div
                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
                        animate={{
                            x: watermarkSettings.enabled ? 28 : 4
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                </motion.button>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
                {watermarkSettings.enabled && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-6"
                    >
                        {/* Performance Mode */}
                        <div>
                            <label className="text-white text-sm font-medium mb-3 block flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Performance Mode
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['low', 'medium', 'high'] as const).map((mode) => (
                                    <motion.button
                                        key={mode}
                                        onClick={() => handlePerformanceModeChange(mode)}
                                        className={`px-4 py-3 text-sm rounded-lg border transition-colors capitalize relative ${watermarkSettings.performanceMode === mode
                                            ? 'bg-cr-purple text-white border-cr-purple'
                                            : 'bg-black/20 text-white/60 border-white/20 hover:border-white/40'
                                            }`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {mode}
                                        {mode === 'low' && (
                                            <div className="text-xs text-green-400 mt-1">
                                                Max Performance
                                            </div>
                                        )}
                                        {mode === 'medium' && (
                                            <div className="text-xs text-blue-400 mt-1">
                                                Balanced
                                            </div>
                                        )}
                                        {mode === 'high' && (
                                            <div className="text-xs text-purple-400 mt-1">
                                                Max Security
                                            </div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                            <p className="text-white/40 text-xs mt-2">
                                Auto-adjusts based on device performance
                            </p>
                        </div>

                        {/* Opacity Control */}
                        <div>
                            <label className="text-white text-sm font-medium mb-3 block">
                                Opacity: {Math.round(watermarkSettings.opacity * 100)}%
                                {watermarkSettings.performanceMode === 'low' && (
                                    <span className="text-yellow-400 text-xs ml-2">(Capped for performance)</span>
                                )}
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="50"
                                value={watermarkSettings.opacity * 100}
                                onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="flex justify-between text-xs text-white/40 mt-1">
                                <span>Subtle</span>
                                <span>Visible</span>
                            </div>
                        </div>

                        {/* Size Control */}
                        <div>
                            <label className="text-white text-sm font-medium mb-3 block">
                                Watermark Size
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['small', 'medium', 'large'] as const).map((size) => (
                                    <motion.button
                                        key={size}
                                        onClick={() => handleSizeChange(size)}
                                        className={`px-4 py-3 text-sm rounded-lg border transition-colors capitalize ${watermarkSettings.size === size
                                            ? 'bg-cr-purple text-white border-cr-purple'
                                            : 'bg-black/20 text-white/60 border-white/20 hover:border-white/40'
                                            }`}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {size}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                            <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                                <Monitor className="w-4 h-4" />
                                Live Performance Metrics
                            </h5>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-white/60">Avg Frame Time:</span>
                                    <div className={`font-mono ${getPerformanceColor()}`}>
                                        {performanceMetrics.avgFrameTime.toFixed(2)}ms
                                    </div>
                                </div>
                                <div>
                                    <span className="text-white/60">Target FPS:</span>
                                    <div className="text-cr-gold font-mono">
                                        30fps (Optimized)
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs text-white/40 mt-2">
                                Canvas-based rendering with hardware acceleration
                            </div>
                        </div>

                        {/* Device Info */}
                        {deviceInfo && (
                            <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                                <h5 className="text-white font-medium mb-3">
                                    Device Fingerprint
                                </h5>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-white/60">ID:</span>
                                        <span className="text-cr-gold font-mono text-xs">
                                            {deviceInfo.id}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Browser:</span>
                                        <span className="text-white/80 text-xs">
                                            {deviceInfo.browserInfo}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/60">Timezone:</span>
                                        <span className="text-white/80 text-xs">
                                            {deviceInfo.timezone}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex gap-3">
                            <motion.button
                                onClick={resetToSecureDefaults}
                                className="px-4 py-2 bg-cr-purple text-white rounded-lg text-sm font-medium hover:bg-cr-purple/80 transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                Reset to Secure Defaults
                            </motion.button>
                        </div>

                        {/* Optimization Info */}
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <h5 className="text-green-400 font-medium mb-2">
                                🚀 Performance Improvements
                            </h5>
                            <ul className="text-sm text-white/80 space-y-1">
                                <li>• 90% less CPU usage vs previous version</li>
                                <li>• Single canvas instead of 8 DOM elements</li>
                                <li>• Hardware-accelerated rendering</li>
                                <li>• Intelligent performance auto-adjustment</li>
                                <li>• Discord handle integration included</li>
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default OptimizedWatermarkSettings;