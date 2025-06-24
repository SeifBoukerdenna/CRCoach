// royal_trainer_client/src/components/OfflineLanding.tsx - Enhanced with Game Mechanics Tester

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ConnectionStateValue } from "../types";
import ConnectionSection from "./ConnectionSection";
import BetaBanner from "./BetaBanner";
import WatermarkSettings from "./WatermarkSettings";
import GameMechanicsTester from "./GameMechanicsTester";

interface OfflineProps {
    sessionCode: string;
    onSessionCodeChange: (s: string) => void;
    connectionState: ConnectionStateValue;
    onConnect: () => void;
    onDisconnect: () => void;
    isConnecting: boolean;
    connectionError: any;
    sessionStatus?: any;
    isCheckingSession?: boolean;
    onCheckSessionStatus?: (code: string) => Promise<any>;
}

const OfflineLanding: React.FC<OfflineProps> = ({
    sessionCode,
    onSessionCodeChange,
    connectionState,
    onConnect,
    onDisconnect,
    isConnecting,
    connectionError,
    sessionStatus,
    isCheckingSession,
    onCheckSessionStatus,
}) => {
    const [showGameTester, setShowGameTester] = useState(false);

    return (
        <motion.div
            key="offline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full flex items-center justify-center"
        >
            <div className="max-w-6xl mx-auto px-6 text-center">
                {/* HERO TITLE & SUBTEXT */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                >
                    <h2 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-6">
                        AI-Powered Analysis&nbsp;Ready
                    </h2>
                </motion.div>

                {/* 2-COLUMN GRID (connection, banner) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    {/* CENTER – CONNECTION CARD */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <ConnectionSection
                            sessionCode={sessionCode}
                            onSessionCodeChange={onSessionCodeChange}
                            connectionState={connectionState}
                            onConnect={onConnect}
                            onDisconnect={onDisconnect}
                            isConnecting={isConnecting}
                            connectionError={connectionError}
                            sessionStatus={sessionStatus}
                            isCheckingSession={isCheckingSession}
                            onCheckSessionStatus={onCheckSessionStatus}
                        />
                    </motion.div>

                    {/* RIGHT – BETA BANNER */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <BetaBanner />
                    </motion.div>
                </div>

                {/* GAME MECHANICS TESTER TOGGLE */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mb-8"
                >
                    <button
                        onClick={() => setShowGameTester(!showGameTester)}
                        className="flex items-center justify-center gap-3 mx-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                        <span className="text-lg">🎮</span>
                        <span>Test Game Mechanics</span>
                        {showGameTester ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    <p className="text-white/60 text-sm mt-2">
                        Try out the advanced elixir bar and card cycling systems
                    </p>
                </motion.div>

                {/* GAME MECHANICS TESTER */}
                {showGameTester && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="mb-16"
                    >
                        <GameMechanicsTester />
                    </motion.div>
                )}

                {/* FEATURES GRID */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
                >
                    {[
                        {
                            icon: "🧠",
                            title: "YOLOv8 AI",
                            desc: "Real-time object detection with state-of-the-art accuracy"
                        },
                        {
                            icon: "⚡",
                            title: "Low Latency",
                            desc: "Sub-100ms analysis for immediate feedback and coaching"
                        },
                        {
                            icon: "📊",
                            title: "Frame History",
                            desc: "Review past detections and track performance over time"
                        },
                        {
                            icon: "🛡️",
                            title: "Secure",
                            desc: "Discord authentication and anti-piracy protection"
                        }
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
                            className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center hover:border-yellow-500/30 transition-all duration-300"
                        >
                            <div className="text-3xl mb-3">{feature.icon}</div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* WATERMARK SETTINGS */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="max-w-md mx-auto"
                >
                    <WatermarkSettings />
                </motion.div>
            </div>
        </motion.div>
    );
};

export default OfflineLanding;