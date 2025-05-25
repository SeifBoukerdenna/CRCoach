import React from 'react';
import { motion } from 'framer-motion';
import {
    Zap,
    Wifi,
    Signal,
    Clock,
    Activity,
    Target,
    BarChart3,
    RefreshCw,
    Camera,
    Info
} from 'lucide-react';

interface PerformanceInsightsProps {
    inferenceTime: number;
    inferenceFPS: number;
    accuracy: number;
    isWebSocketConnected: boolean;
    connectionAttempts: number;
    uptime: number;
    totalFrames: number;
    minInferenceTime: number;
    maxInferenceTime: number;
}

const PerformanceInsights: React.FC<PerformanceInsightsProps> = ({
    inferenceTime,
    inferenceFPS,
    accuracy,
    isWebSocketConnected,
    connectionAttempts,
    uptime,
    totalFrames,
    minInferenceTime,
    maxInferenceTime
}) => {
    const getPerformanceColor = (time: number) => {
        if (time <= 50) return 'text-green-400';
        if (time <= 100) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getConnectionStatusColor = () => {
        if (isWebSocketConnected) return 'text-green-400';
        return 'text-yellow-400';
    };

    const getConnectionStatusText = () => {
        if (isWebSocketConnected) return 'WebSocket';
        return 'HTTP Polling';
    };

    const getPerformanceTip = () => {
        if (inferenceTime > 100) {
            return "Consider reducing stream quality or checking network connection for better performance.";
        } else if (inferenceFPS < 10) {
            return "Low inference rate detected. Server may be under load.";
        } else if (accuracy < 70) {
            return "Low detection accuracy. Check lighting and camera angle.";
        } else {
            return "Performance is optimal! All systems running smoothly.";
        }
    };

    return (
        <motion.div
            className="bg-gradient-to-r from-cr-purple/10 to-cr-gold/10 rounded-xl p-6 border border-cr-purple/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
        >
            <h5 className="font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6 text-cr-gold" />
                Performance Insights
            </h5>

            <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                    <div className="text-white/70 mb-3 font-medium">Inference Performance:</div>
                    <div className="space-y-2">
                        <div className={`flex items-center gap-2 ${getPerformanceColor(inferenceTime)}`}>
                            <Clock className="w-4 h-4" />
                            <span>Processing: {Math.round(inferenceTime)}ms</span>
                            {inferenceTime <= 50 ? (
                                <span className="text-green-400">⚡ Excellent</span>
                            ) : inferenceTime <= 100 ? (
                                <span className="text-yellow-400">✅ Good</span>
                            ) : (
                                <span className="text-red-400">⚠️ Slow</span>
                            )}
                        </div>
                        <div className="text-white/60 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            <span>Rate: {inferenceFPS.toFixed(1)} FPS</span>
                        </div>
                        <div className="text-white/60 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            <span>Efficiency: {Math.round(accuracy)}% detection rate</span>
                        </div>
                        <div className="text-white/60 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            <span>Range: {Math.round(minInferenceTime)}-{Math.round(maxInferenceTime)}ms</span>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="text-white/70 mb-3 font-medium">Connection Quality:</div>
                    <div className="space-y-2">
                        <div className={`flex items-center gap-2 ${getConnectionStatusColor()}`}>
                            {isWebSocketConnected ? (
                                <Wifi className="w-4 h-4" />
                            ) : (
                                <Signal className="w-4 h-4" />
                            )}
                            <span>Method: {getConnectionStatusText()}</span>
                            {isWebSocketConnected ? (
                                <span className="text-green-400">⚡ Real-time</span>
                            ) : (
                                <span className="text-yellow-400">📡 Polling</span>
                            )}
                        </div>
                        <div className="text-white/60 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            <span>Retries: {connectionAttempts}</span>
                        </div>
                        <div className="text-white/60 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Uptime: {Math.round(uptime)}s</span>
                        </div>
                        <div className="text-white/60 flex items-center gap-2">
                            <Camera className="w-4 h-4" />
                            <span>Frames: {totalFrames}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance recommendation */}
            <div className="mt-4 p-3 bg-black/20 rounded-lg border-l-4 border-cr-gold">
                <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-cr-gold mt-0.5" />
                    <div>
                        <div className="text-cr-gold font-medium text-sm">Performance Tip:</div>
                        <div className="text-white/70 text-sm">
                            {getPerformanceTip()}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PerformanceInsights;