import React from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Zap,
    Wifi,
    Clock,
    TrendingUp,
    TrendingDown,
    Minus,
    Signal
} from 'lucide-react';

interface LatencyStats {
    current: number;
    average: number;
    min: number;
    max: number;
    recent: number[];
    measurements: any[];
}

interface StreamStats {
    fps?: number;
    bitrate?: number;
    resolution?: string;
    latency?: number;
    endToEndLatency?: number;
    signalingLatency?: number;
    networkLatency?: number;
}

interface LatencyDisplayProps {
    latencyStats: LatencyStats;
    streamStats: StreamStats | null;
    isConnected: boolean;
    onPerformLatencyTest?: () => void;
}

const LatencyDisplay: React.FC<LatencyDisplayProps> = ({
    latencyStats,
    streamStats,
    isConnected,
    onPerformLatencyTest
}) => {
    const getLatencyColor = (latency: number) => {
        if (latency === 0 || !isFinite(latency)) return 'text-gray-400';
        if (latency < 50) return 'text-green-400';
        if (latency < 100) return 'text-yellow-400';
        if (latency < 200) return 'text-orange-400';
        return 'text-red-400';
    };

    const getLatencyQuality = (latency: number) => {
        if (latency === 0 || !isFinite(latency)) return 'N/A';
        if (latency < 50) return 'Excellent';
        if (latency < 100) return 'Good';
        if (latency < 200) return 'Fair';
        return 'Poor';
    };

    const getTrendIcon = () => {
        if (latencyStats.recent.length < 2) return Minus;

        const recent = latencyStats.recent.slice(-5);
        const first = recent[0];
        const last = recent[recent.length - 1];

        if (last > first * 1.1) return TrendingUp;
        if (last < first * 0.9) return TrendingDown;
        return Minus;
    };

    const formatLatency = (latency: number) => {
        if (latency === 0 || !isFinite(latency) || latency === Infinity) return '--';
        return `${Math.round(latency)}ms`;
    };

    const TrendIcon = getTrendIcon();

    // Show actual current latency or fallback to average
    const displayLatency = latencyStats.current > 0 ? latencyStats.current : latencyStats.average;

    return (
        <div className="space-y-4">
            {/* Main Latency Display */}
            <motion.div
                className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl p-6 shadow-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock className="w-6 h-6 text-purple-400" />
                        End-to-End Latency
                    </h3>
                    {onPerformLatencyTest && (
                        <motion.button
                            onClick={onPerformLatencyTest}
                            className="px-3 py-1 bg-purple-600/20 border border-purple-500/40 rounded-lg text-purple-300 text-sm hover:bg-purple-600/30 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Test Network
                        </motion.button>
                    )}
                </div>

                {/* Current Latency - Large Display */}
                <div className="text-center mb-6">
                    <div className={`text-6xl font-black mb-2 ${getLatencyColor(displayLatency)}`}>
                        {formatLatency(displayLatency)}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-lg">
                        <TrendIcon className="w-5 h-5 text-white/60" />
                        <span className="text-white/80">
                            {getLatencyQuality(displayLatency)}
                        </span>
                    </div>
                </div>

                {/* Latency Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black/20 rounded-xl p-3 text-center">
                        <div className="text-xs text-white/60 mb-1">Average</div>
                        <div className={`text-lg font-bold ${getLatencyColor(latencyStats.average)}`}>
                            {formatLatency(latencyStats.average)}
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-3 text-center">
                        <div className="text-xs text-white/60 mb-1">Minimum</div>
                        <div className={`text-lg font-bold ${getLatencyColor(latencyStats.min)}`}>
                            {formatLatency(latencyStats.min)}
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-3 text-center">
                        <div className="text-xs text-white/60 mb-1">Maximum</div>
                        <div className={`text-lg font-bold ${getLatencyColor(latencyStats.max)}`}>
                            {formatLatency(latencyStats.max)}
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-3 text-center">
                        <div className="text-xs text-white/60 mb-1">Frames</div>
                        <div className="text-lg font-bold text-white">
                            {latencyStats.measurements.length}
                        </div>
                    </div>
                </div>

                {/* Recent Latency Trend */}
                {latencyStats.recent.length > 0 && (
                    <div className="mt-4">
                        <div className="text-sm text-white/60 mb-2">Recent Trend (last 20 frames)</div>
                        <div className="flex items-end gap-1 h-12">
                            {latencyStats.recent.map((latency, index) => {
                                if (!isFinite(latency) || latency <= 0) return null;

                                const validLatencies = latencyStats.recent.filter(l => isFinite(l) && l > 0);
                                const maxLatency = Math.max(...validLatencies);
                                const height = Math.max(1, (latency / maxLatency) * 100);

                                return (
                                    <div
                                        key={index}
                                        className={`flex-1 rounded-t transition-all duration-300 ${latency < 50 ? 'bg-green-400' :
                                            latency < 100 ? 'bg-yellow-400' :
                                                latency < 200 ? 'bg-orange-400' : 'bg-red-400'
                                            }`}
                                        style={{ height: `${height}%` }}
                                        title={`${latency.toFixed(1)}ms`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Network Component Breakdown */}
            {isConnected && streamStats && (
                <motion.div
                    className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        Latency Breakdown
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Signaling Latency */}
                        <div className="bg-black/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Wifi className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-white/80">Signaling</span>
                            </div>
                            <div className={`text-xl font-bold ${getLatencyColor(streamStats.signalingLatency || 0)}`}>
                                {formatLatency(streamStats.signalingLatency || 0)}
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                                WebSocket connection setup
                            </div>
                        </div>

                        {/* Network Latency */}
                        <div className="bg-black/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Signal className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-white/80">Network RTT</span>
                            </div>
                            <div className={`text-xl font-bold ${getLatencyColor(streamStats.networkLatency || 0)}`}>
                                {formatLatency(streamStats.networkLatency || 0)}
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                                Round-trip network delay
                            </div>
                        </div>

                        {/* Processing Latency */}
                        <div className="bg-black/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm text-white/80">Processing</span>
                            </div>
                            <div className={`text-xl font-bold ${getLatencyColor(Math.max(0, displayLatency - (streamStats.networkLatency || 0) - (streamStats.signalingLatency || 0)))}`}>
                                {formatLatency(Math.max(0, displayLatency - (streamStats.networkLatency || 0) - (streamStats.signalingLatency || 0)))}
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                                Encoding + decoding + display
                            </div>
                        </div>
                    </div>

                    {/* Performance Indicators */}
                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="bg-black/20 rounded-lg p-3">
                            <div className="text-xs text-white/60 mb-1">Stream Quality</div>
                            <div className="text-lg font-bold text-white">
                                {streamStats.fps ? `${streamStats.fps} FPS` : 'N/A'}
                            </div>
                            {streamStats.resolution && (
                                <div className="text-xs text-white/50 mt-1">
                                    {streamStats.resolution}
                                </div>
                            )}
                        </div>

                        <div className="bg-black/20 rounded-lg p-3">
                            <div className="text-xs text-white/60 mb-1">Bitrate</div>
                            <div className="text-lg font-bold text-white">
                                {streamStats.bitrate ? `${Math.round(streamStats.bitrate / 1000)}K` : 'N/A'}
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                                Current bandwidth usage
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Debug Info */}
            <motion.div
                className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-xl border border-slate-600/50 rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
            >
                <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-slate-400" />
                    Debug Information
                </h4>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-white/60">Current Latency:</span>
                        <span className="text-white font-mono">{formatLatency(latencyStats.current)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/60">Average Latency:</span>
                        <span className="text-white font-mono">{formatLatency(latencyStats.average)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/60">Recent Measurements:</span>
                        <span className="text-white font-mono">{latencyStats.recent.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/60">Total Measurements:</span>
                        <span className="text-white font-mono">{latencyStats.measurements.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/60">Network RTT:</span>
                        <span className="text-white font-mono">{formatLatency(streamStats?.networkLatency || 0)}</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LatencyDisplay;