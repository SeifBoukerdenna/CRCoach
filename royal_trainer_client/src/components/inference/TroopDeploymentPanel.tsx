// royal_trainer_client/src/components/inference/TroopDeploymentPanel.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    MapPin,
    Clock,
    Target,
    Settings,
    TrendingUp,
    AlertCircle,
    Play,
    Pause,
    Trash2
} from 'lucide-react';
import type { DeploymentDetectionConfig } from '../../utils/troopDeploymentDetector';
import type { TroopDeploymentHookState, TroopDeploymentHookActions } from '../../hooks/useTroopDeploymentDetection';

interface TroopDeploymentPanelProps {
    state: TroopDeploymentHookState;
    actions: TroopDeploymentHookActions;
}

const TroopDeploymentPanel: React.FC<TroopDeploymentPanelProps> = ({ state, actions }) => {
    const [showSettings, setShowSettings] = useState(false);
    const [configChanges, setConfigChanges] = useState<Partial<DeploymentDetectionConfig>>({});

    const { recentDeployments, deploymentStats, isDetectionEnabled, config } = state;
    const { toggleDetection, clearDeployments, updateConfig } = actions;

    // Format time ago
    const formatTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    // Get troop type emoji
    const getTroopEmoji = (troopType: string) => {
        const emojiMap: Record<string, string> = {
            'knight': '⚔️', 'archer': '🏹', 'giant': '👾', 'wizard': '🔮',
            'dragon': '🐲', 'hog': '🐗', 'balloon': '🎈', 'golem': '🗿',
            'pekka': '🤖', 'barbarian': '🪓', 'minion': '👹', 'skeleton': '💀',
            'goblin': '👺', 'valkyrie': '⚔️', 'musketeer': '🔫', 'mini_pekka': '🤖',
            'lumberjack': '🪓', 'ice_wizard': '❄️', 'princess': '👸', 'miner': '⛏️',
            'sparky': '⚡', 'bowler': '🎳', 'executioner': '🪓', 'night_witch': '🧙‍♀️',
            'mega_knight': '🤴', 'bandit': '🗡️', 'ram_rider': '🐏', 'fisherman': '🎣',
            'hunter': '🔫', 'zappies': '⚡', 'flying_machine': '🛸', 'tower': '🏰',
            'cannon': '💣', 'tesla': '⚡', 'inferno_tower': '🔥', 'bomb_tower': '💥',
            'elixir_collector': '💧', 'furnace': '🔥', 'tombstone': '⚰️', 'default': '🪖'
        };
        return emojiMap[troopType.toLowerCase().replace(/\s+/g, '_')] || emojiMap.default;
    };

    // Apply configuration changes
    const applyConfigChanges = () => {
        if (Object.keys(configChanges).length > 0) {
            updateConfig(configChanges);
            setConfigChanges({});
        }
        setShowSettings(false);
    };

    return (
        <div className="space-y-4">
            {/* Header with controls */}
            <div className="bg-black/30 rounded-xl p-4 border border-cr-purple/20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-cr-purple" />
                        <h3 className="text-lg font-bold text-white">Troop Deployments</h3>
                        <div className={`px-2 py-1 rounded-full text-xs ${isDetectionEnabled
                            ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                            : 'bg-red-900/30 text-red-400 border border-red-500/30'
                            }`}>
                            {isDetectionEnabled ? 'Active' : 'Paused'}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleDetection}
                            className={`p-2 rounded-lg transition-colors ${isDetectionEnabled
                                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                }`}
                            title={isDetectionEnabled ? 'Pause Detection' : 'Resume Detection'}
                        >
                            {isDetectionEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>

                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 rounded-lg bg-cr-purple/20 text-cr-purple hover:bg-cr-purple/30 transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>

                        <button
                            onClick={clearDeployments}
                            className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                            title="Clear History"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                        <div className="text-white/60 mb-1">Total Deployments</div>
                        <div className="text-xl font-bold text-cr-gold">{deploymentStats.totalDeployments}</div>
                    </div>
                    <div>
                        <div className="text-white/60 mb-1">Recent (1min)</div>
                        <div className="text-xl font-bold text-cr-purple">{deploymentStats.deploymentsPerMinute}</div>
                    </div>
                    <div>
                        <div className="text-white/60 mb-1">Avg Duration</div>
                        <div className="text-xl font-bold text-blue-400">
                            {deploymentStats.averageDeploymentDuration.toFixed(0)}ms
                        </div>
                    </div>
                    <div>
                        <div className="text-white/60 mb-1">Most Used</div>
                        <div className="text-xl font-bold text-green-400 flex items-center gap-1">
                            {deploymentStats.mostCommonTroopType ? (
                                <>
                                    {getTroopEmoji(deploymentStats.mostCommonTroopType)}
                                    <span className="text-sm">{deploymentStats.mostCommonTroopType}</span>
                                </>
                            ) : (
                                <span className="text-white/40">None</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-black/30 rounded-xl p-4 border border-cr-purple/20"
                    >
                        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Detection Settings
                        </h4>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <label className="text-white/80 block mb-1">Time Window (ms)</label>
                                <input
                                    type="number"
                                    value={configChanges.timeWindow ?? config.timeWindow}
                                    onChange={(e) => setConfigChanges(prev => ({
                                        ...prev,
                                        timeWindow: parseInt(e.target.value)
                                    }))}
                                    className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white"
                                    min="500"
                                    max="10000"
                                    step="500"
                                />
                            </div>

                            <div>
                                <label className="text-white/80 block mb-1">Proximity (px)</label>
                                <input
                                    type="number"
                                    value={configChanges.proximityThreshold ?? config.proximityThreshold}
                                    onChange={(e) => setConfigChanges(prev => ({
                                        ...prev,
                                        proximityThreshold: parseInt(e.target.value)
                                    }))}
                                    className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white"
                                    min="20"
                                    max="200"
                                    step="10"
                                />
                            </div>

                            <div>
                                <label className="text-white/80 block mb-1">Min Detections</label>
                                <input
                                    type="number"
                                    value={configChanges.minDetections ?? config.minDetections}
                                    onChange={(e) => setConfigChanges(prev => ({
                                        ...prev,
                                        minDetections: parseInt(e.target.value)
                                    }))}
                                    className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white"
                                    min="2"
                                    max="10"
                                />
                            </div>

                            <div>
                                <label className="text-white/80 block mb-1">Max Detections</label>
                                <input
                                    type="number"
                                    value={configChanges.maxDetections ?? config.maxDetections}
                                    onChange={(e) => setConfigChanges(prev => ({
                                        ...prev,
                                        maxDetections: parseInt(e.target.value)
                                    }))}
                                    className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-white"
                                    min="5"
                                    max="30"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setConfigChanges({});
                                    setShowSettings(false);
                                }}
                                className="px-3 py-1 rounded bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyConfigChanges}
                                className="px-3 py-1 rounded bg-cr-purple text-white hover:bg-cr-purple/80 transition-colors"
                            >
                                Apply
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recent deployments */}
            {recentDeployments.length > 0 && (
                <div className="bg-black/30 rounded-xl p-4 border border-cr-purple/20">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Recent Deployments ({recentDeployments.length})
                    </h4>

                    <div className="space-y-2 max-h-48 overflow-y-auto thin-scrollbar">
                        <AnimatePresence>
                            {recentDeployments.map((deployment) => (
                                <motion.div
                                    key={deployment.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-black/20 rounded-lg p-3 border border-white/10"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex">
                                                {deployment.troopTypes.slice(0, 3).map((troopType, index) => (
                                                    <span key={index} className="text-lg">
                                                        {getTroopEmoji(troopType)}
                                                    </span>
                                                ))}
                                                {deployment.troopTypes.length > 3 && (
                                                    <span className="text-white/60 text-sm ml-1">
                                                        +{deployment.troopTypes.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-white/80 text-sm">
                                                {deployment.troopTypes.slice(0, 2).join(', ')}
                                                {deployment.troopTypes.length > 2 && '...'}
                                            </span>
                                        </div>
                                        <span className="text-white/60 text-xs">
                                            {formatTimeAgo(deployment.timestamp)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 text-xs text-white/60">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            ({Math.round(deployment.centerX)}, {Math.round(deployment.centerY)})
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Target className="w-3 h-3" />
                                            {deployment.detectionCount} objects
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {deployment.duration}ms
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-white/10 rounded-full h-1">
                                                <div
                                                    className="bg-cr-purple h-1 rounded-full transition-all duration-300"
                                                    style={{ width: `${deployment.confidence * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-white/60">
                                                {(deployment.confidence * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* No deployments message */}
            {recentDeployments.length === 0 && isDetectionEnabled && (
                <div className="bg-black/30 rounded-xl p-6 border border-cr-purple/20 text-center">
                    <AlertCircle className="w-8 h-8 text-white/40 mx-auto mb-2" />
                    <p className="text-white/60">No troop deployments detected recently</p>
                    <p className="text-white/40 text-sm mt-1">
                        Deploy troops in Clash Royale to see them tracked here
                    </p>
                </div>
            )}

            {/* Detection disabled message */}
            {!isDetectionEnabled && (
                <div className="bg-black/30 rounded-xl p-6 border border-red-500/20 text-center">
                    <Pause className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-red-400">Troop deployment detection is paused</p>
                    <button
                        onClick={toggleDetection}
                        className="mt-2 px-4 py-2 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50 transition-colors"
                    >
                        Resume Detection
                    </button>
                </div>
            )}
        </div>
    );
};

export default TroopDeploymentPanel;