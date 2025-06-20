// royal_trainer_client/src/components/ConnectionStats.tsx - Updated to show total detections

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Monitor, Wifi, Target, Brain, Users } from 'lucide-react';
import type { DetectionHistoryItem, StreamStats, InferenceStats } from '../types';

interface LatencyStats {
    current: number;
    average: number;
    min: number;
    max: number;
    recent: number[];
    measurements: any[];
}

interface ConnectionStatsProps {
    streamStats: StreamStats | null;
    latencyStats: LatencyStats;
    sessionCode: string;
    isInferenceEnabled: boolean;
    history: DetectionHistoryItem[];
    inferenceStats?: InferenceStats; // Add inference stats to get total detections
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
    <motion.div
        className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-700/40 border border-slate-600/40 hover:border-purple-500/40 transition-all duration-200 backdrop-blur-sm h-20"
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div className={`text-${color}-400 mb-1`}>
            {icon}
        </div>
        <div className="text-center min-w-0 flex-1">
            <div className="text-xs text-white/60 font-medium uppercase tracking-wide mb-1">
                {label}
            </div>
            <div className="text-sm font-bold text-white truncate">
                {value}
            </div>
        </div>
    </motion.div>
);

const ConnectionStats: React.FC<ConnectionStatsProps> = ({
    streamStats,
    latencyStats,
    sessionCode,
    isInferenceEnabled,
    inferenceStats,
}) => {
    // Calculate total detections from the entire session
    const totalDetections = inferenceStats?.totalDetections ?? 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* Stream FPS */}
                <StatCard
                    icon={<Activity className="w-4 h-4" />}
                    label="Stream FPS"
                    value={streamStats?.fps ?? 0}
                    color="blue"
                />

                {/* Resolution */}
                <StatCard
                    icon={<Monitor className="w-4 h-4" />}
                    label="Resolution"
                    value={streamStats?.resolution ?? 'N/A'}
                    color="green"
                />

                {/* Latency */}
                <StatCard
                    icon={<Wifi className="w-4 h-4" />}
                    label="Latency"
                    value={
                        latencyStats.current
                            ? `${Math.round(latencyStats.current)}ms`
                            : 'N/A'
                    }
                    color="yellow"
                />

                {/* Session Code */}
                <StatCard
                    icon={<Users className="w-4 h-4" />}
                    label="Session"
                    value={
                        <span className="text-yellow-400 font-mono text-base">
                            {sessionCode}
                        </span>
                    }
                    color="yellow"
                />

                {/* Total Detections - Now shows ALL detections from entire session */}
                <StatCard
                    icon={<Target className="w-4 h-4" />}
                    label="Detections"
                    value={
                        <span className="text-purple-400 font-bold">
                            {totalDetections.toLocaleString()}
                        </span>
                    }
                    color="purple"
                />

                {/* AI Status */}
                <StatCard
                    icon={<Brain className="w-4 h-4" />}
                    label="AI Status"
                    value={
                        <span
                            className={`font-semibold text-xs ${isInferenceEnabled ? 'text-green-400' : 'text-red-400'
                                }`}
                        >
                            {isInferenceEnabled ? 'Active' : 'Inactive'}
                        </span>
                    }
                    color={isInferenceEnabled ? 'green' : 'red'}
                />
            </div>
        </motion.div>
    );
};

export default ConnectionStats;