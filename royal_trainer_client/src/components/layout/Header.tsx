// royal_trainer_client/src/components/layout/Header.tsx
import React from 'react';
import { motion } from 'framer-motion';
import DiscordAuth from '../discord/DiscordAuth';

const Header: React.FC = () => {
    return (
        <motion.header
            className="relative z-20 p-4"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* Logo/Brand */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">CR</span>
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Royal Trainer
                    </h1>
                </div>

                {/* Discord Authentication */}
                <DiscordAuth compact className="min-w-0 max-w-xs" />
            </div>
        </motion.header>
    );
};

export default Header;