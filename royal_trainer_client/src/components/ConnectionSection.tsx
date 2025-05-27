import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle, Crown, Smartphone } from 'lucide-react';
import type { ConnectionError, ConnectionState } from '../types';

interface ConnectionSectionProps {
    sessionCode: string;
    onSessionCodeChange: (code: string) => void;
    connectionState: ConnectionState;
    onConnect: () => void;
    onDisconnect: () => void;
    isConnecting: boolean;
    connectionError: ConnectionError | null;
}

const ConnectionSection: React.FC<ConnectionSectionProps> = ({
    sessionCode,
    onSessionCodeChange,
    connectionState,
    onConnect,
    onDisconnect,
    isConnecting,
    connectionError
}) => {
    const [digits, setDigits] = useState(['', '', '', '']);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const handleDigitChange = (index: number, value: string) => {
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
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            const prevInput = document.getElementById(`digit-${index - 1}`) as HTMLInputElement;
            prevInput?.focus();
        }
        if (e.key === 'Enter' && sessionCode.length === 4) {
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
        setDigits(['', '', '', '']);
        onSessionCodeChange('');
        const firstInput = document.getElementById('digit-0') as HTMLInputElement;
        firstInput?.focus();
    };

    return (
        <motion.div
            className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl"
            whileHover={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {/* Compact Header */}
            <div className="text-center mb-6">
                <motion.div
                    className="flex items-center justify-center gap-3 mb-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    >
                        <Crown className="w-7 h-7 text-yellow-400" />
                    </motion.div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        Connect to Stream
                    </h2>
                </motion.div>
                <p className="text-white/80 text-base">Enter your 4-digit session code</p>
            </div>

            {/* Compact Code Input */}
            <div className="mb-6">
                <div className="flex justify-center gap-3 mb-4">
                    {digits.map((digit, index) => (
                        <motion.div
                            key={index}
                            className="relative"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <input
                                id={`digit-${index}`}
                                type="text"
                                value={digit}
                                onChange={(e) => handleDigitChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                onFocus={() => setFocusedIndex(index)}
                                onBlur={() => setFocusedIndex(null)}
                                className={`w-12 h-12 text-2xl font-bold text-center bg-slate-700/50 border-2 rounded-xl text-white focus:outline-none transition-all duration-300 ${focusedIndex === index
                                    ? 'border-yellow-400 bg-slate-600/50 shadow-lg shadow-yellow-400/25'
                                    : digit
                                        ? 'border-green-500 bg-slate-600/30'
                                        : 'border-slate-600 hover:border-slate-500'
                                    }`}
                                maxLength={1}
                                disabled={connectionState === 'live'}
                            />
                            {focusedIndex === index && (
                                <motion.div
                                    className="absolute inset-0 border-2 border-yellow-400 rounded-xl pointer-events-none"
                                    initial={{ opacity: 0, scale: 1.2 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.2 }}
                                    transition={{ duration: 0.2 }}
                                />
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Helper buttons */}
                <div className="flex justify-center gap-4">
                    <motion.button
                        onClick={clearCode}
                        className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={connectionState === 'live'}
                    >
                        Clear
                    </motion.button>
                </div>
            </div>

            {/* Compact Connection Button */}
            <div className="flex flex-col gap-3">
                {connectionState !== 'live' ? (
                    <motion.button
                        onClick={onConnect}
                        disabled={sessionCode.length !== 4 || isConnecting}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 border-2 shadow-lg ${sessionCode.length === 4 && !isConnecting
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 border-yellow-400 hover:shadow-xl hover:shadow-yellow-400/25 hover:scale-105 active:scale-95'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed border-slate-600'
                            }`}
                        whileHover={sessionCode.length === 4 && !isConnecting ? { y: -2 } : {}}
                        whileTap={sessionCode.length === 4 && !isConnecting ? { y: 0 } : {}}
                    >
                        {isConnecting ? (
                            <>
                                <motion.div
                                    className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Wifi className="w-5 h-5" />
                                Connect
                            </>
                        )}
                    </motion.button>
                ) : (
                    <motion.button
                        onClick={onDisconnect}
                        className="w-full py-3 px-4 rounded-xl font-bold text-base bg-gradient-to-r from-red-600 to-red-700 text-white border-2 border-red-500 shadow-lg hover:shadow-xl hover:shadow-red-500/25 transition-all duration-300 flex items-center justify-center gap-2"
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ y: 0, scale: 0.98 }}
                    >
                        <WifiOff className="w-5 h-5" />
                        Disconnect
                    </motion.button>
                )}
            </div>

            {/* Enhanced Error Display */}
            <AnimatePresence>
                {connectionError && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        className="mt-6 p-4 bg-red-900/30 border border-red-500/50 rounded-2xl backdrop-blur-sm"
                    >
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-red-300 font-semibold">{connectionError.message}</p>
                                {connectionError.code && (
                                    <p className="text-red-400/70 text-sm mt-1">Error Code: {connectionError.code}</p>
                                )}
                                <p className="text-red-400/50 text-xs mt-2">
                                    {connectionError.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Compact Instructions */}
            {connectionState === 'offline' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl backdrop-blur-sm"
                >
                    <h4 className="font-bold text-blue-300 mb-3 flex items-center gap-2 text-base">
                        <Smartphone className="w-4 h-4" />
                        Quick Start Guide
                    </h4>
                    <div className="space-y-2">
                        {[
                            { icon: "📱", text: "Open Royal Trainer app" },
                            { icon: "🎮", text: "Start broadcasting gameplay" },
                            { icon: "🔢", text: "Note the 4-digit code" },
                            { icon: "🚀", text: "Enter code and Connect" }
                        ].map((step, index) => (
                            <motion.div
                                key={index}
                                className="flex items-center gap-2 text-white/80 text-sm"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 + index * 0.1 }}
                            >
                                <span className="text-base">{step.icon}</span>
                                <span>{step.text}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Connection Status Indicator */}
            <motion.div
                className="mt-6 flex items-center justify-center gap-2 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
            >
                <div className={`w-2 h-2 rounded-full ${connectionState === 'live' ? 'bg-green-500 animate-pulse' :
                    connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                        'bg-gray-500'
                    }`} />
                <span className="text-white/60">
                    Status: <span className="capitalize font-medium">{connectionState}</span>
                </span>
            </motion.div>
        </motion.div>
    );
};

export default ConnectionSection;