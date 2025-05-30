// royal_trainer_client/src/components/ConnectionSection.tsx - Compact version for sidebar

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, AlertCircle, Crown, Smartphone, Zap, Square } from 'lucide-react';
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

    const generateRandomCode = () => {
        const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
        const newDigits = randomCode.split('');
        setDigits(newDigits);
        onSessionCodeChange(randomCode);
    };

    return (
        <motion.div
            className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 shadow-2xl"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.1 }}
        >
            {/* Compact Header */}
            <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        Connect
                    </h3>
                </div>
                <p className="text-white/70 text-sm">Enter 4-digit session code</p>
            </div>

            {/* Compact Code Input */}
            <div className="mb-4">
                <div className="flex justify-center gap-2 mb-3">
                    {digits.map((digit, index) => (
                        <div key={index} className="relative">
                            <input
                                id={`digit-${index}`}
                                type="text"
                                value={digit}
                                onChange={(e) => handleDigitChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                onFocus={() => setFocusedIndex(index)}
                                onBlur={() => setFocusedIndex(null)}
                                className={`w-10 h-10 text-lg font-bold text-center bg-slate-700/50 border-2 rounded-lg text-white focus:outline-none transition-all duration-150 ${focusedIndex === index
                                    ? 'border-yellow-400 bg-slate-600/50 scale-110'
                                    : digit
                                        ? 'border-green-500 bg-slate-600/30'
                                        : 'border-slate-600 hover:border-slate-500'
                                    }`}
                                maxLength={1}
                                disabled={connectionState === 'live'}
                            />
                        </div>
                    ))}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex justify-center gap-2 mb-3">
                    <button
                        onClick={clearCode}
                        className="px-3 py-1 text-xs text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        disabled={connectionState === 'live'}
                    >
                        Clear
                    </button>
                    <button
                        onClick={generateRandomCode}
                        className="px-3 py-1 text-xs text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                        disabled={connectionState === 'live'}
                    >
                        Random
                    </button>
                </div>
            </div>

            {/* Connection Button */}
            <div className="space-y-3">
                {connectionState !== 'live' ? (
                    <motion.button
                        onClick={onConnect}
                        disabled={sessionCode.length !== 4 || isConnecting}
                        className={`w-full py-3 px-4 rounded-lg font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 border-2 shadow-lg ${sessionCode.length === 4 && !isConnecting
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 border-yellow-400 hover:shadow-xl hover:scale-105 active:scale-95'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed border-slate-600'
                            }`}
                        whileHover={sessionCode.length === 4 && !isConnecting ? { scale: 1.02 } : {}}
                        whileTap={sessionCode.length === 4 && !isConnecting ? { scale: 0.98 } : {}}
                    >
                        {isConnecting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Wifi className="w-4 h-4" />
                                Connect Stream
                            </>
                        )}
                    </motion.button>
                ) : (
                    <motion.button
                        onClick={onDisconnect}
                        className="w-full py-3 px-4 rounded-lg font-bold text-sm bg-gradient-to-r from-red-600 to-red-700 text-white border-2 border-red-500 shadow-lg hover:shadow-xl transition-all duration-150 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Square className="w-4 h-4" />
                        Disconnect
                    </motion.button>
                )}
            </div>

            {/* Status Indicator */}
            <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full transition-all ${connectionState === 'live' ? 'bg-green-500 animate-pulse' :
                    connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                        'bg-gray-500'
                    }`} />
                <span className="text-white/60">
                    <span className="capitalize font-medium text-white/80">{connectionState}</span>
                </span>
            </div>

            {/* Error Display */}
            <AnimatePresence>
                {connectionError && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg backdrop-blur-sm"
                    >
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-red-300 font-semibold text-sm">{connectionError.message}</p>
                                {connectionError.code && (
                                    <p className="text-red-400/70 text-xs mt-1">Error: {connectionError.code}</p>
                                )}
                                <p className="text-red-400/50 text-xs mt-1">
                                    {connectionError.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Guide - Only when offline */}
            {connectionState === 'offline' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 p-3 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg backdrop-blur-sm"
                >
                    <h4 className="font-bold text-blue-300 mb-2 flex items-center gap-2 text-sm">
                        <Smartphone className="w-4 h-4" />
                        Quick Start
                    </h4>
                    <div className="space-y-1.5">
                        {[
                            { icon: "📱", text: "Open Royal Trainer app", step: "1" },
                            { icon: "🎮", text: "Start broadcasting", step: "2" },
                            { icon: "🔢", text: "Get 4-digit code", step: "3" },
                            { icon: "🚀", text: "Connect here", step: "4" }
                        ].map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                                className="flex items-center gap-2 text-white/70 text-xs"
                            >
                                <div className="w-5 h-5 bg-gradient-to-r from-purple-400 to-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {item.step}
                                </div>
                                <span className="text-sm">{item.icon}</span>
                                <span className="text-sm">{item.text}</span>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-3 p-2 bg-black/20 rounded-lg border border-yellow-500/30">
                        <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium mb-1">
                            <Zap className="w-3 h-3" />
                            Pro Tip
                        </div>
                        <p className="text-white/60 text-xs">
                            Use same WiFi network for best performance
                        </p>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default ConnectionSection;