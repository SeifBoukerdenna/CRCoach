import React from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    Target,
    Activity,
    Eye,
    Monitor,
    CheckCircle,
    Camera,
    TrendingUp
} from 'lucide-react';

interface PerformanceDashboardProps {
    stats: {
        avgInferenceTime: number;
        detectionsPerSecond: number;
        totalDetections: number;
        accuracy: number;
        inferenceFPS?: number;
        connectionAttempts?: number;
        isWebSocketConnected?: boolean;
        frameCount?: number;
        networkLatency?: number;
        modelLoadTime?: number;
        totalFramesProcessed?: number;
    };
    currentInferenceTime: number;
    currentDetectionCount: number;
    showAdvanced?: boolean;
    performanceMetrics?: {
        avgInferenceTime: number;
        maxInferenceTime: number;
        minInferenceTime: number;
        avgDetections: number;
        totalFrames: number;
        uptime: number;
    };
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
    stats,
    currentInferenceTime,
    currentDetectionCount,
    showAdvanced = false,
    performanceMetrics
}) => {
    const getPerformanceColor = (time: number) => {
        if (time <= 50) return 'text-green-400';
        if (time <= 100) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="space-y-4">
            {/* Main Performance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div
                    className="bg-black/20 rounded-xl p-4 border border-cr-purple/20 hover:border-cr-purple/40 transition-colors"
                    whileHover={{ scale: 1.02 }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-cr-purple" />
                        <span className="text-white/80 text-sm font-medium">Processing</span>
                    </div>
                    <div className={`text-2xl font-bold ${getPerformanceColor(stats.avgInferenceTime)}`}>
                        {stats.avgInferenceTime}ms
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                        Current: {Math.round(currentInferenceTime)}ms
                    </div>
                    {performanceMetrics && (
                        <div className="text-xs text-white/40 mt-1">
                            Range: {Math.round(performanceMetrics.minInferenceTime)}-{Math.round(performanceMetrics.maxInferenceTime)}ms
                        </div>
                    )}
                </motion.div>

                <motion.div
                    className="bg-black/20 rounded-xl p-4 border border-cr-purple/20 hover:border-cr-purple/40 transition-colors"
                    whileHover={{ scale: 1.02 }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-cr-purple" />
                        <span className="text-white/80 text-sm font-medium">Detection Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-cr-gold">
                        {stats.detectionsPerSecond.toFixed(1)}/s
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                        Current: {currentDetectionCount} objects
                    </div>
                    {performanceMetrics && (
                        <div className="text-xs text-white/40 mt-1">
                            Avg: {performanceMetrics.avgDetections.toFixed(1)} per frame
                        </div>
                    )}
                </motion.div>

                <motion.div
                    className="bg-black/20 rounded-xl p-4 border border-cr-purple/20 hover:border-cr-purple/40 transition-colors"
                    whileHover={{ scale: 1.02 }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-cr-purple" />
                        <span className="text-white/80 text-sm font-medium">Inference FPS</span>
                    </div>
                    <div className="text-2xl font-bold text-cr-purple">
                        {(stats.inferenceFPS || 0).toFixed(1)}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                        Frames: {performanceMetrics?.totalFrames || stats.frameCount || 0}
                    </div>
                    {performanceMetrics && (
                        <div className="text-xs text-white/40 mt-1">
                            Uptime: {Math.round(performanceMetrics.uptime)}s
                        </div>
                    )}
                </motion.div>

                <motion.div
                    className="bg-black/20 rounded-xl p-4 border border-cr-purple/20 hover:border-cr-purple/40 transition-colors"
                    whileHover={{ scale: 1.02 }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-5 h-5 text-cr-purple" />
                        <span className="text-white/80 text-sm font-medium">Accuracy</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                        {Math.round(stats.accuracy || 0)}%
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                        Total: {stats.totalDetections.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                        Connection: {stats.connectionAttempts || 0} retries
                    </div>
                </motion.div>
            </div>

            {/* Advanced Stats */}
            {showAdvanced && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    <div className="bg-black/20 rounded-xl p-4 border border-cr-gold/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Monitor className="w-5 h-5 text-cr-gold" />
                            <span className="text-white/80 text-sm">Network</span>
                        </div>
                        <div className="text-xl font-bold text-cr-gold">
                            {stats.networkLatency ? `${Math.round(stats.networkLatency)}ms` : 'N/A'}
                        </div>
                        <div className="text-xs text-white/50">Latency</div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-4 border border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-white/80 text-sm">Success Rate</span>
                        </div>
                        <div className="text-xl font-bold text-green-400">
                            {stats.totalFramesProcessed ?
                                Math.round((stats.totalFramesProcessed / (stats.totalFramesProcessed + (stats.connectionAttempts || 0))) * 100) :
                                100}%
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-4 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Camera className="w-5 h-5 text-blue-400" />
                            <span className="text-white/80 text-sm">Model Load</span>
                        </div>
                        <div className="text-xl font-bold text-blue-400">
                            {stats.modelLoadTime ? `${Math.round(stats.modelLoadTime)}ms` : 'N/A'}
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-4 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                            <span className="text-white/80 text-sm">Efficiency</span>
                        </div>
                        <div className="text-xl font-bold text-purple-400">
                            {stats.inferenceFPS && currentInferenceTime ?
                                Math.round((1000 / currentInferenceTime) / (stats.inferenceFPS || 1) * 100) :
                                0}%
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default PerformanceDashboard;