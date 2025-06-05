// royal_trainer_client/src/components/WatermarkSettings.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Eye,
    EyeOff,
    AlertTriangle,
    Info,
    Monitor,
    Clock,
    Fingerprint,
    RefreshCw,
    Download,
    Trash2
} from 'lucide-react';
import { useWatermark } from '../hooks/useWatermark';

interface WatermarkSettingsProps {
    className?: string;
}

const WatermarkSettings: React.FC<WatermarkSettingsProps> = ({ className = '' }) => {
    const {
        watermarkSettings,
        deviceInfo,
        updateWatermarkSettings,
        toggleWatermark,
        resetToSecureDefaults
    } = useWatermark();

    const [isOpen, setIsOpen] = useState(false);
    const [showDeviceInfo, setShowDeviceInfo] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    const handleOpacityChange = (value: number) => {
        updateWatermarkSettings({ opacity: value / 100 });
    };

    const handleSizeChange = (size: 'small' | 'medium' | 'large') => {
        updateWatermarkSettings({ size });
    };

    const exportSecurityLogs = () => {
        const logs = localStorage.getItem('royal-trainer-security-logs') || '[]';
        const blob = new Blob([logs], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `royal-trainer-security-logs-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const clearSecurityLogs = () => {
        localStorage.removeItem('royal-trainer-security-logs');
        alert('Security logs cleared');
    };

    return (
        <div className={`relative ${className}`}>
            {/* Settings Trigger Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-3 rounded-xl border-2 transition-all duration-200 ${watermarkSettings.enabled
                    ? 'bg-green-600/20 border-green-500/50 text-green-400 hover:bg-green-600/30'
                    : 'bg-red-600/20 border-red-500/50 text-red-400 hover:bg-red-600/30'
                    } backdrop-blur-xl shadow-lg`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Anti-Piracy Settings"
            >
                <Shield className="w-5 h-5" />
            </motion.button>

            {/* Settings Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="absolute top-16 right-0 bg-slate-800/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl min-w-[350px] max-w-[400px] z-50"
                    >
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-red-400" />
                                    Anti-Piracy Protection
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-white/60 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Main Toggle */}
                                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                                    <div className="flex items-center gap-3">
                                        {watermarkSettings.enabled ? (
                                            <Eye className="w-5 h-5 text-green-400" />
                                        ) : (
                                            <EyeOff className="w-5 h-5 text-red-400" />
                                        )}
                                        <div>
                                            <div className="text-white font-semibold">Watermark Protection</div>
                                            <div className="text-white/60 text-sm">
                                                {watermarkSettings.enabled ? 'Active' : 'Disabled'}
                                            </div>
                                        </div>
                                    </div>
                                    <motion.button
                                        onClick={toggleWatermark}
                                        className={`relative w-14 h-7 rounded-full transition-all ${watermarkSettings.enabled
                                            ? 'bg-green-500'
                                            : 'bg-red-500'
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

                                {/* Watermark Settings */}
                                {watermarkSettings.enabled && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4"
                                    >
                                        {/* Opacity Control */}
                                        <div>
                                            <label className="text-white text-sm font-medium mb-2 block">
                                                Opacity: {Math.round(watermarkSettings.opacity * 100)}%
                                            </label>
                                            <input
                                                type="range"
                                                min="10"
                                                max="80"
                                                value={watermarkSettings.opacity * 100}
                                                onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
                                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                                            />
                                        </div>

                                        {/* Size Control */}
                                        <div>
                                            <label className="text-white text-sm font-medium mb-2 block">Size</label>
                                            <div className="flex gap-2">
                                                {(['small', 'medium', 'large'] as const).map((size) => (
                                                    <motion.button
                                                        key={size}
                                                        onClick={() => handleSizeChange(size)}
                                                        className={`px-3 py-2 text-sm rounded-lg border transition-colors capitalize ${watermarkSettings.size === size
                                                            ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                                                            : 'bg-slate-700/50 border-slate-600/50 text-white/70 hover:bg-slate-600/50'
                                                            }`}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        {size}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Information Display Toggles */}
                                        <div className="space-y-3">
                                            <label className="text-white text-sm font-medium block">Information Display</label>

                                            {[
                                                { key: 'showDeviceInfo', label: 'Device Information', icon: Monitor },
                                                { key: 'showTimestamp', label: 'Timestamp', icon: Clock },
                                                { key: 'showFingerprint', label: 'Device Fingerprint', icon: Fingerprint },
                                            ].map(({ key, label, icon: Icon }) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="w-4 h-4 text-white/70" />
                                                        <span className="text-white/80 text-sm">{label}</span>
                                                    </div>
                                                    <motion.button
                                                        onClick={() => updateWatermarkSettings({ [key]: !watermarkSettings[key as keyof typeof watermarkSettings] })}
                                                        className={`relative w-10 h-5 rounded-full transition-all ${watermarkSettings[key as keyof typeof watermarkSettings]
                                                            ? 'bg-green-500'
                                                            : 'bg-gray-500'
                                                            }`}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <motion.div
                                                            className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md"
                                                            animate={{
                                                                x: watermarkSettings[key as keyof typeof watermarkSettings] ? 20 : 2
                                                            }}
                                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                        />
                                                    </motion.button>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Device Information */}
                                <div>
                                    <motion.button
                                        onClick={() => setShowDeviceInfo(!showDeviceInfo)}
                                        className="w-full flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-600/30 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Info className="w-4 h-4 text-blue-400" />
                                            <span className="text-white text-sm">Device Information</span>
                                        </div>
                                        <motion.div
                                            animate={{ rotate: showDeviceInfo ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            ▼
                                        </motion.div>
                                    </motion.button>

                                    <AnimatePresence>
                                        {showDeviceInfo && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600/30 text-xs font-mono"
                                            >
                                                <div className="space-y-2 text-white/80">
                                                    <div><span className="text-purple-400">Discord:</span> {deviceInfo.discordHandle}</div>
                                                    <div><span className="text-blue-400">Browser:</span> {deviceInfo.browser}</div>
                                                    <div><span className="text-green-400">OS:</span> {deviceInfo.os}</div>
                                                    <div><span className="text-yellow-400">Device:</span> {deviceInfo.device}</div>
                                                    <div><span className="text-orange-400">Screen:</span> {deviceInfo.screen}</div>
                                                    <div><span className="text-cyan-400">Session:</span> {deviceInfo.sessionId}</div>
                                                    <div><span className="text-red-400">Fingerprint:</span> {deviceInfo.fingerprint}</div>
                                                    {deviceInfo.ipAddress && (
                                                        <div><span className="text-pink-400">IP:</span> {deviceInfo.ipAddress}</div>
                                                    )}
                                                    <div><span className="text-indigo-400">Timezone:</span> {deviceInfo.timezone}</div>
                                                    <div><span className="text-lime-400">Language:</span> {deviceInfo.language}</div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Security Actions */}
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <motion.button
                                            onClick={exportSecurityLogs}
                                            className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-colors text-sm"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Download className="w-4 h-4" />
                                            Export Logs
                                        </motion.button>

                                        <motion.button
                                            onClick={clearSecurityLogs}
                                            className="flex-1 flex items-center justify-center gap-2 p-2 bg-red-600/20 border border-red-500/40 rounded-lg text-red-300 hover:bg-red-600/30 transition-colors text-sm"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear Logs
                                        </motion.button>
                                    </div>

                                    <motion.button
                                        onClick={() => setConfirmReset(true)}
                                        className="w-full flex items-center justify-center gap-2 p-2 bg-purple-600/20 border border-purple-500/40 rounded-lg text-purple-300 hover:bg-purple-600/30 transition-colors text-sm"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Reset to Secure Defaults
                                    </motion.button>
                                </div>

                                {/* Warning Messages */}
                                <div className="space-y-3">
                                    {!watermarkSettings.enabled && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-red-900/40 border border-red-500/50 rounded-lg p-3"
                                        >
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-red-300 font-semibold text-sm">Security Warning</div>
                                                    <div className="text-red-200 text-xs mt-1">
                                                        Watermarks are disabled. This may violate your beta agreement and could result in access revocation.
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <div className="text-blue-300 font-semibold text-sm">Beta Software</div>
                                                <div className="text-blue-200 text-xs mt-1">
                                                    This is confidential beta software. All usage is monitored and logged.
                                                    Unauthorized distribution is prohibited.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reset Confirmation Modal */}
            <AnimatePresence>
                {confirmReset && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                        onClick={() => setConfirmReset(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h4 className="text-white font-bold text-lg mb-3">Reset to Secure Defaults</h4>
                            <p className="text-white/70 text-sm mb-6">
                                This will reset all watermark settings to the most secure configuration. Are you sure?
                            </p>
                            <div className="flex gap-3">
                                <motion.button
                                    onClick={() => setConfirmReset(false)}
                                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    onClick={() => {
                                        resetToSecureDefaults();
                                        setConfirmReset(false);
                                    }}
                                    className="flex-1 px-4 py-2 bg-purple-600 border border-purple-500 rounded-lg text-white hover:bg-purple-700 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Reset
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WatermarkSettings;