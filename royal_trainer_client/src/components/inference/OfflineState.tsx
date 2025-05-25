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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                {[
                    { icon: '⚔️', title: 'Characters', desc: 'Knights, Archers, Giants' },
                    { icon: '🏰', title: 'Buildings', desc: 'Towers, Cannons, Tesla' },
                    { icon: '🔥', title: 'Spells', desc: 'Fireball, Lightning, Freeze' },
                    { icon: '💧', title: 'Resources', desc: 'Elixir, Crown Towers' }
                ].map((item, index) => (
                    <motion.div
                        key={item.title}
                        className="p-4 bg-black/20 rounded-xl border border-white/10"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className="text-3xl mb-2">{item.icon}</div>
                        <div className="text-sm font-medium text-white/70">{item.title}</div>
                        <div className="text-xs text-white/50 mt-1">{item.desc}</div>
                    </motion.div>
                ))}
            </div>

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