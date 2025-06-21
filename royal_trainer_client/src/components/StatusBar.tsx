// royal_trainer_client/src/components/StatusBar.tsx - REQUIRED COMPONENT

import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Clock, Zap, Play, Activity, Brain } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { ConnectionStateValue, StreamStats } from '../types';

interface LatencyStats {
    current: number;
    average: number;
}

interface StatusBarProps {
    connectionState: ConnectionStateValue;
    elapsed: string;
    streamStats: StreamStats | null;
    latencyStats: LatencyStats;
    isInferenceEnabled: boolean;
    isCapturing: boolean;
    onToggleLatency: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
    connectionState,
    elapsed,
    streamStats,
    latencyStats,
    isInferenceEnabled,
    isCapturing,
    onToggleLatency,
}) => {
    const getLatencyDisplayText = () => {
        if (latencyStats.current) {
            return `${Math.round(latencyStats.current)}MS`;
        }
        if (latencyStats.average) {
            return `${Math.round(latencyStats.average)}MS`;
        }
        return 'LATENCY';
    };

    const getLatencyColorClass = () => {
        const latency = latencyStats.current || latencyStats.average;
        if (!latency) return 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500';
        if (latency < 50) return 'bg-gradient-to-r from-green-600 to-green-700 border-green-500';
        if (latency < 100) return 'bg-gradient-to-r from-yellow-600 to-yellow-700 border-yellow-500';
        if (latency < 200) return 'bg-gradient-to-r from-orange-600 to-orange-700 border-orange-500';
        return 'bg-gradient-to-r from-red-600 to-red-700 border-red-500';
    };

    return (
        <motion.div
            className="flex flex-wrap justify-center gap-2 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
        >
            <StatusBadge
                icon={connectionState === 'live' ? Wifi : WifiOff}
                text={connectionState.toUpperCase()}
                variant={connectionState}
            />

            {connectionState === 'live' && (
                <>
                    <StatusBadge icon={Clock} text={elapsed} variant="info" />

                    {streamStats && (
                        <StatusBadge
                            icon={Zap}
                            text={`${streamStats.fps || 0} FPS`}
                            variant="info"
                        />
                    )}

                    <motion.button
                        onClick={onToggleLatency}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border-2 font-bold text-xs uppercase tracking-wider backdrop-blur-xl shadow-lg transition-all duration-150 ${getLatencyColorClass()} text-white`}
                    >
                        <Activity className="w-3 h-3" />
                        {getLatencyDisplayText()}
                    </motion.button>

                    {isInferenceEnabled && (
                        <StatusBadge icon={Brain} text="AI DETECTING" variant="inference" />
                    )}

                    {isCapturing && (
                        <StatusBadge icon={Play} text="CAPTURING" variant="info" />
                    )}
                </>
            )}
        </motion.div>
    );
};

export default StatusBar;