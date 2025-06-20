// royal_trainer_client/src/components/ConnectionSection.tsx - Fixed with read-only connected state

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, AlertCircle, Crown, Square, Users, Check, X, Loader2, Clock, RefreshCw } from 'lucide-react';
import type { ConnectionError, ConnectionState, SessionStatus } from '../types';

interface ConnectionSectionProps {
    sessionCode: string;
    onSessionCodeChange: (code: string) => void;
    connectionState: ConnectionState;
    onConnect: () => void;
    onDisconnect: () => void;
    isConnecting: boolean;
    connectionError: ConnectionError | null;
    sessionStatus?: SessionStatus | null;
    isCheckingSession?: boolean;
    onCheckSessionStatus?: (code: string) => Promise<SessionStatus | null>;
}

const ConnectionSection: React.FC<ConnectionSectionProps> = ({
    sessionCode,
    onSessionCodeChange,
    connectionState,
    onConnect,
    onDisconnect,
    isConnecting,
    connectionError,
    sessionStatus,
    isCheckingSession = false,
    onCheckSessionStatus
}) => {
    const [digits, setDigits] = useState(['', '', '', '']);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [lastCheckedCode, setLastCheckedCode] = useState('');

    // Update digits when sessionCode changes externally or when connecting
    useEffect(() => {
        if (sessionCode.length === 4) {
            setDigits(sessionCode.split(''));
        } else if (sessionCode.length === 0) {
            setDigits(['', '', '', '']);
        }
    }, [sessionCode]);

    // Check session status when code changes (only when not connected)
    useEffect(() => {
        if (connectionState === 'live') return; // Don't check when connected

        const code = digits.join('');
        if (code.length === 4 && code !== lastCheckedCode && onCheckSessionStatus) {
            setLastCheckedCode(code);
            onCheckSessionStatus(code);
        }
    }, [digits, lastCheckedCode, onCheckSessionStatus, connectionState]);

    const handleDigitChange = (index: number, value: string) => {
        // Prevent changes when connected
        if (connectionState === 'live') return;

        if (value.length > 1) return;
        if (value && !/^\d$/.test(value)) return;

        const newDigits = [...digits];
        newDigits[index] = value;
        setDigits(newDigits);

        const code = newDigits.join('');
        onSessionCodeChange(code);

        // Auto-focus next input
        if (value && index < 3) {
            const nextInput = document.getElementById(`digit-${index + 1}`) as HTMLInputElement;
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        // Prevent any keyboard interaction when connected
        if (connectionState === 'live') {
            e.preventDefault();
            return;
        }

        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            const prevInput = document.getElementById(`digit-${index - 1}`) as HTMLInputElement;
            prevInput?.focus();
        }
        if (e.key === 'Enter' && canConnect()) {
            onConnect();
        }
        if (e.key === 'ArrowLeft' && index > 0) {
            const prevInput = document.getElementById(`digit-${index - 1}`) as HTMLInputElement;
            prevInput?.focus();
        }
        if (e.key === 'ArrowRight' && index < 3) {
            const nextInput = document.getElementById(`digit-${index + 1}`) as HTMLInputElement;
            nextInput?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        // Prevent paste when connected
        if (connectionState === 'live') {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        const paste = e.clipboardData.getData('text');
        const numbers = paste.replace(/\D/g, '').slice(0, 4);

        if (numbers.length === 4) {
            const newDigits = numbers.split('');
            setDigits(newDigits);
            onSessionCodeChange(numbers);
        }
    };

    const clearCode = () => {
        // Prevent clearing when connected
        if (connectionState === 'live') return;

        setDigits(['', '', '', '']);
        onSessionCodeChange('');
        setLastCheckedCode('');
        const firstInput = document.getElementById('digit-0') as HTMLInputElement;
        firstInput?.focus();
    };

    // Determine if connection is possible
    const canConnect = () => {
        if (connectionState === 'live') return false;
        if (isConnecting) return false;
        if (sessionCode.length !== 4) return false;
        if (isCheckingSession) return false;
        if (sessionStatus && !sessionStatus.available_for_viewer) return false;
        return true;
    };

    // Get session status display with enhanced error handling
    const getSessionStatusDisplay = () => {
        if (connectionState === 'live') return null; // Don't show status when connected
        if (sessionCode.length !== 4) return null;

        if (isCheckingSession) {
            return (
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking session...
                </div>
            );
        }

        if (!sessionStatus) return null;

        if (sessionStatus.error_type === 'session_not_found') {
            return (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                    <X className="w-4 h-4" />
                    Session not found
                </div>
            );
        }

        if (sessionStatus.error_type === 'session_expired') {
            return (
                <div className="flex items-center gap-2 text-orange-400 text-sm">
                    <Clock className="w-4 h-4" />
                    Session expired
                </div>
            );
        }

        if (sessionStatus.error_type === 'session_full') {
            return (
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <Users className="w-4 h-4" />
                    Session full
                </div>
            );
        }

        if (sessionStatus.available_for_viewer) {
            return (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                    <Check className="w-4 h-4" />
                    Session available • Broadcaster online
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                Broadcaster offline
            </div>
        );
    };

    return (
        <motion.div
            className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <div>
                        <h3 className="text-lg font-bold text-white">Connect</h3>
                        {connectionState !== 'live' && (
                            <p className="text-white/60 text-sm">Enter 4-digit session code</p>
                        )}
                    </div>
                </div>
                {connectionState !== 'live' && sessionCode.length > 0 && (
                    <button
                        onClick={clearCode}
                        className="p-1 text-white/50 hover:text-white transition-colors"
                        title="Clear"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Code Input/Display */}
            <div className="mb-4">
                <div className="flex justify-center gap-3 mb-3">
                    {digits.map((digit, index) => (
                        <div key={index} className="relative">
                            {connectionState === 'live' ? (
                                // Read-only display when connected
                                <div className="w-12 h-12 text-xl font-bold text-center bg-green-900/30 border-2 border-green-500 rounded-xl text-green-400 flex items-center justify-center">
                                    {digit}
                                </div>
                            ) : (
                                // Interactive input when not connected
                                <input
                                    id={`digit-${index}`}
                                    type="text"
                                    value={digit}
                                    onChange={(e) => handleDigitChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    onFocus={() => setFocusedIndex(index)}
                                    onBlur={() => setFocusedIndex(null)}
                                    className={`w-12 h-12 text-xl font-bold text-center bg-slate-700/50 border-2 rounded-xl text-white focus:outline-none transition-all duration-150 ${focusedIndex === index
                                        ? 'border-yellow-400 bg-slate-600/50 scale-105'
                                        : digit
                                            ? sessionStatus?.error_type
                                                ? 'border-red-500 bg-slate-600/30'
                                                : sessionStatus?.available_for_viewer
                                                    ? 'border-green-500 bg-slate-600/30'
                                                    : 'border-orange-500 bg-slate-600/30'
                                            : 'border-slate-600 hover:border-slate-500'
                                        }`}
                                    maxLength={1}
                                    placeholder="0"
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Session Status Display */}
                <AnimatePresence>
                    {getSessionStatusDisplay() && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 flex justify-center"
                        >
                            <div className={`px-3 py-2 rounded-lg border text-center ${sessionStatus?.error_type === 'session_not_found'
                                ? 'bg-red-900/20 border-red-500/30'
                                : sessionStatus?.error_type === 'session_expired'
                                    ? 'bg-orange-900/20 border-orange-500/30'
                                    : sessionStatus?.error_type === 'session_full'
                                        ? 'bg-yellow-900/20 border-yellow-500/30'
                                        : sessionStatus?.available_for_viewer
                                            ? 'bg-green-900/20 border-green-500/30'
                                            : 'bg-slate-900/20 border-slate-500/30'
                                }`}>
                                {getSessionStatusDisplay()}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Connected Status Banner */}
                {connectionState === 'live' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg"
                    >
                        <div className="flex items-center gap-2 text-green-400 justify-center">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="font-medium">Session available! • Broadcaster online</span>
                        </div>
                    </motion.div>
                )}

                {/* Clear Button */}
                {connectionState !== 'live' && sessionCode.length > 0 && (
                    <div className="text-center mb-3">
                        <button
                            onClick={clearCode}
                            className="text-white/60 hover:text-white text-sm transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Connection Button */}
            <AnimatePresence mode="wait">
                {connectionState === 'live' ? (
                    <motion.button
                        key="disconnect"
                        onClick={onDisconnect}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border border-red-500/30"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Square className="w-4 h-4" />
                        Disconnect
                    </motion.button>
                ) : (
                    <motion.button
                        key="connect"
                        onClick={onConnect}
                        disabled={!canConnect()}
                        className={`w-full font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${canConnect()
                            ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500/30'
                            : 'bg-slate-700/50 text-white/50 cursor-not-allowed border border-slate-600/30'
                            }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        whileHover={canConnect() ? { scale: 1.02 } : {}}
                        whileTap={canConnect() ? { scale: 0.98 } : {}}
                    >
                        {isConnecting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Wifi className="w-4 h-4" />
                                Connect
                            </>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Live Status Indicator */}
            {connectionState === 'live' && (
                <motion.div
                    className="mt-3 flex items-center justify-center gap-2 text-green-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Live</span>
                </motion.div>
            )}

            {/* Connection Error */}
            <AnimatePresence>
                {connectionError && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg"
                    >
                        <div className="flex items-start gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="font-medium">Connection Failed</div>
                                <div className="text-red-400/80">{connectionError.message}</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ConnectionSection;