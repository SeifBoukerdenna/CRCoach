// royal_trainer_client/src/components/ConnectionStats.tsx - New Clean Stats Component

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Monitor, Wifi, Target, Brain, Users } from 'lucide-react';
import type { DetectionHistoryItem, StreamStats } from '../types';

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
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
    <motion.div
        className="flex items-center gap-3 p-4 rounded-xl bg-slate-700/40 border border-slate-600/40 hover:border-purple-500/40 transition-all duration-200 backdrop-blur-sm"
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div className={`text-${color}-400 flex-shrink-0`}>
            {icon}
        </div>
        <div className="min-w-0 flex-1">
            <div className="text-xs text-white/60 font-medium uppercase tracking-wide mb-1">
                {label}
            </div>
            <div className="text-lg font-bold text-white truncate">
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
    history,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* Stream FPS */}
                <StatCard
                    icon={<Activity className="w-5 h-5" />}
                    label="Stream FPS"
                    value={streamStats?.fps ?? 0}
                    color="blue"
                />

                {/* Resolution */}
                <StatCard
                    icon={<Monitor className="w-5 h-5" />}
                    label="Resolution"
                    value={streamStats?.resolution ?? 'N/A'}
                    color="green"
                />

                {/* Latency */}
                <StatCard
                    icon={<Wifi className="w-5 h-5" />}
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
                    icon={<Users className="w-5 h-5" />}
                    label="Session"
                    value={
                        <span className="text-yellow-400 font-mono text-xl">
                            {sessionCode}
                        </span>
                    }
                    color="yellow"
                />

                {/* Detections */}
                <StatCard
                    icon={<Target className="w-5 h-5" />}
                    label="Detections"
                    value={history.length}
                    color="purple"
                />

                {/* AI Status */}
                <StatCard
                    icon={<Brain className="w-5 h-5" />}
                    label="AI Status"
                    value={
                        <span
                            className={`font-semibold ${isInferenceEnabled ? 'text-green-400' : 'text-red-400'
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