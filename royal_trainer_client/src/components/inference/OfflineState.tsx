import React from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

interface OfflineStateProps {
    sessionCode: string;
    connectionStatus: string;
}

const OfflineState: React.FC<OfflineStateProps> = ({
    sessionCode,
    connectionStatus
}) => {
    return (
        <div className="p-12 text-center">
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse"
                }}
            >
                <Brain className="w-32 h-32 text-white/20 mx-auto mb-8" />
            </motion.div>

            <h4 className="text-2xl font-bold text-white/60 mb-4">AI Analysis Offline</h4>
            <p className="text-white/40 text-lg max-w-md mx-auto leading-relaxed mb-8">
                Connect to a live stream to enable real-time object detection and analysis.
                The AI will automatically start scanning for Clash Royale game elements.
            </p>

            <div className="mt-8 text-sm text-white/30">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    <span>Waiting for stream connection...</span>
                </div>
                <div>Session: {sessionCode} | Status: {connectionStatus}</div>
            </div>
        </div>
    );
};

export default OfflineState;