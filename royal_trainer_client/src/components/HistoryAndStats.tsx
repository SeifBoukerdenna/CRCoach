// royal_trainer_client/src/components/HistoryAndStats.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Activity } from 'lucide-react';

import type { DetectionHistoryItem, StreamStats } from '../types';

/* ── LOCAL TYPES ────────────────────────────────────── */
interface LatencyStats {
    current: number;
    average: number;
    min: number;
    max: number;
    recent: number[];
    measurements: any[];
}

interface HistoryAndStatsProps {
    history: DetectionHistoryItem[];
    selectedFrame: DetectionHistoryItem | null;
    onSelectFrame: (frame: DetectionHistoryItem | null) => void;
    streamStats: StreamStats | null;
    latencyStats: LatencyStats;
    sessionCode: string;
    isInferenceEnabled: boolean;
}

/* ── SMALL REUSABLE COMPONENT ───────────────────────── */
const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({
    label,
    value,
}) => (
    <div className="flex justify-between">
        <span className="text-white/70">{label}:</span>
        <span className="text-white font-bold">{value}</span>
    </div>
);

/* ── MAIN COMPONENT ─────────────────────────────────── */
const HistoryAndStats: React.FC<HistoryAndStatsProps> = ({
    history,
    selectedFrame,
    onSelectFrame,
    streamStats,
    latencyStats,
    sessionCode,
    isInferenceEnabled,
}) => {
    /* cache for easier type-safe use below */
    const selectedFrameId = selectedFrame?.id;

    /* ────────── FRAME ANALYSIS VIEW ──────────────────── */
    if (selectedFrame) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <Eye className="w-5 h-5 text-purple-400" />
                        Frame Analysis
                    </h4>
                    <button
                        onClick={() => onSelectFrame(null)}
                        className="text-white/60 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 min-h-0 flex gap-4">
                    <img
                        src={`data:image/jpeg;base64,${selectedFrame.annotatedFrame}`}
                        alt="Annotated"
                        className="flex-1 object-contain bg-black rounded-lg border border-slate-600"
                    />

                    <div className="w-64 space-y-2 overflow-y-auto thin-scrollbar">
                        <div className="text-sm text-white/60">
                            {new Date(selectedFrame.timestamp).toLocaleString()}
                        </div>

                        {selectedFrame.detections.map((d, i) => (
                            <div key={i} className="bg-slate-700/50 rounded-lg p-2">
                                <div className="flex justify-between">
                                    <span className="text-white capitalize">{d.class}</span>
                                    <span className="text-green-400 text-sm">
                                        {Math.round(d.confidence * 100)}%
                                    </span>
                                </div>
                                <div className="text-xs text-white/60">
                                    {Math.round(d.bbox.width)}×{Math.round(d.bbox.height)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    /* ────────── HISTORY + LIVE-STATS GRID ─────────────── */
    return (
        <div className="grid grid-cols-4 gap-4 h-full">
            {/* History list */}
            <div className="col-span-2 space-y-4">
                {!!history.length && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3"
                    >
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-purple-400" />
                            Detection History ({history.length})
                        </h4>

                        <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar">
                            {history
                                .slice(0, 10)
                                .filter(
                                    (item): item is DetectionHistoryItem => !!item?.id
                                )
                                .map(item => (
                                    <motion.button
                                        key={item.id}
                                        onClick={() => onSelectFrame(item)}
                                        className={`w-full p-2 rounded-lg text-left ${selectedFrameId === item.id
                                            ? 'bg-purple-600/30 border border-purple-500/50'
                                            : 'bg-slate-700/30 hover:bg-slate-600/30'
                                            }`}
                                    >
                                        <div className="flex justify-between">
                                            <div>
                                                <div className="text-xs text-white/80">
                                                    {item.detections.length} objects
                                                </div>
                                                <div className="text-xs text-white/60">
                                                    {new Date(item.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                            <div className="text-xs text-green-400">
                                                {Math.round(item.inferenceTime)}ms
                                            </div>
                                        </div>
                                    </motion.button>
                                ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Live stats */}
            <div className="col-span-2 space-y-4">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    Connection Stats
                </h4>

                <div className="space-y-3">
                    <Stat label="Stream FPS" value={streamStats?.fps ?? 0} />
                    <Stat label="Resolution" value={streamStats?.resolution ?? 'N/A'} />
                    <Stat
                        label="Latency"
                        value={
                            latencyStats.current
                                ? `${Math.round(latencyStats.current)}ms`
                                : 'N/A'
                        }
                    />
                    <Stat
                        label="Session"
                        value={
                            <span className="text-yellow-400 font-mono">{sessionCode}</span>
                        }
                    />
                    <Stat label="Detections" value={history.length} />
                    <Stat
                        label="AI Status"
                        value={
                            <span
                                className={isInferenceEnabled ? 'text-green-400' : 'text-red-400'}
                            >
                                {isInferenceEnabled ? 'Active' : 'Inactive'}
                            </span>
                        }
                    />
                    <Stat
                        label="Viewer Limit"
                        value={<span className="text-orange-400">1/1&nbsp;MAX</span>}
                    />
                </div>
            </div>
        </div>
    );
};

export default HistoryAndStats;
