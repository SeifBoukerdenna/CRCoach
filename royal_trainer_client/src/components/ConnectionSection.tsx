import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle, Crown } from 'lucide-react';
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
            className="bg-gradient-to-br from-cr-navy/90 to-cr-navy/70 backdrop-blur-xl border-4 border-cr-gold rounded-3xl p-8 shadow-2xl"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {/* Header */}
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Crown className="w-8 h-8 text-cr-gold" />
                    <h2 className="text-2xl font-bold text-cr-gold">Connect to Stream</h2>
                </div>
                <p className="text-white/80">Enter your 4-digit session code</p>
            </div>

            {/* Code Input */}
            <div className="mb-8">
                <div className="flex justify-center gap-3 mb-4">
                    {digits.map((digit, index) => (
                        <motion.input
                            key={index}
                            id={`digit-${index}`}
                            type="text"
                            value={digit}
                            onChange={(e) => handleDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            className="w-16 h-16 text-3xl font-bold text-center bg-black/30 border-3 border-cr-gold rounded-xl text-white focus:outline-none focus:border-white focus:shadow-lg focus:shadow-cr-gold/50 transition-all duration-200"
                            maxLength={1}
                            disabled={connectionState === 'live'}
                            whileFocus={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        />
                    ))}
                </div>

                {/* Helper buttons */}
                <div className="flex justify-center gap-2">
                    <motion.button
                        onClick={clearCode}
                        className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={connectionState === 'live'}
                    >
                        Clear
                    </motion.button>
                </div>
            </div>

            {/* Connection Button */}
            <div className="flex flex-col gap-4">
                {connectionState !== 'live' ? (
                    <motion.button
                        onClick={onConnect}
                        disabled={sessionCode.length !== 4 || isConnecting}
                        className={`
              w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3
              ${sessionCode.length === 4 && !isConnecting
                                ? 'bg-gold-gradient text-cr-brown border-3 border-cr-brown shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                                : 'bg-gray-600 text-gray-300 cursor-not-allowed border-3 border-gray-500'
                            }
            `}
                        whileHover={sessionCode.length === 4 && !isConnecting ? { y: -2 } : {}}
                        whileTap={sessionCode.length === 4 && !isConnecting ? { y: 0 } : {}}
                    >
                        {isConnecting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
                        className="w-full py-4 px-6 rounded-xl font-bold text-lg bg-red-gradient text-white border-3 border-red-800 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3"
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ y: 0, scale: 0.98 }}
                    >
                        <WifiOff className="w-5 h-5" />
                        Disconnect
                    </motion.button>
                )}
            </div>

            {/* Error Display */}
            {connectionError && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-red-900/50 border-2 border-red-500 rounded-xl flex items-start gap-3"
                >
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-red-200 font-medium">{connectionError.message}</p>
                        {connectionError.code && (
                            <p className="text-red-300/70 text-sm mt-1">Error: {connectionError.code}</p>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Instructions */}
            {connectionState === 'offline' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 p-4 bg-cr-purple/20 border-2 border-cr-purple rounded-xl"
                >
                    <h4 className="font-bold text-cr-purple mb-2 flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        How to Connect
                    </h4>
                    <ul className="text-sm text-white/80 space-y-1">
                        <li>• Open Royal Trainer app on your device</li>
                        <li>• Start broadcasting your gameplay</li>
                        <li>• Enter the 4-digit code shown on your screen</li>
                        <li>• Click Connect to start the live stream</li>
                    </ul>
                </motion.div>
            )}
        </motion.div>
    );
};

export default ConnectionSection;