import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    show: boolean;
    sessionCode: string;
}

const ConnectionLoader: React.FC<Props> = ({ show, sessionCode }) => (
    <AnimatePresence>
        {show && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-lg flex items-center justify-center"
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-600/50 rounded-3xl p-12 text-center shadow-2xl max-w-md mx-4"
                >
                    <motion.div
                        className="text-8xl mb-8"
                        animate={{ rotateY: [0, 360], scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        🧠
                    </motion.div>

                    <motion.h2
                        className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent mb-4"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        Connecting AI Stream
                    </motion.h2>

                    <div className="mb-8">
                        <p className="text-white/70 text-lg mb-3">Session Code:</p>
                        <div className="flex justify-center gap-2">
                            {sessionCode.split('').map((d, i) => (
                                <motion.div
                                    key={i}
                                    className="w-12 h-12 bg-gradient-to-br from-purple-400/20 to-blue-500/20 border-2 border-purple-400/50 rounded-xl flex items-center justify-center text-2xl font-bold text-purple-400"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: i * 0.1, duration: 0.5 }}
                                >
                                    {d}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="relative mb-6 flex justify-center items-center">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            <motion.div
                                className="absolute w-20 h-20 border-4 border-white/20 rounded-full"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5 }}
                            />
                            <motion.div
                                className="absolute w-20 h-20 border-4 border-transparent border-t-purple-400 border-r-blue-500 rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                        </div>
                    </div>

                    <motion.div
                        className="text-white/80 text-lg mb-4"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        Initializing AI detection system
                    </motion.div>

                    <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3 mt-4">
                        <div className="text-red-300 text-sm">🛡️ Secure connection in progress…</div>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default ConnectionLoader;
