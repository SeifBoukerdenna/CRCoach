// royal_trainer_client/src/components/layout/Header.tsx - Updated with Discord Auth

import React from 'react';
import { motion } from 'framer-motion';
import { DiscordAuth } from '../auth/DiscordAuthButton';
import { useDiscordAuth } from '../../hooks/useDiscordAuth';

const Header: React.FC = () => {
    const auth = useDiscordAuth();

    return (
        <motion.div
            className="text-center mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Main Title Section */}
            <div className="flex items-center justify-center gap-3 mb-4">
                <div className="text-3xl">👑</div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 bg-clip-text text-transparent tracking-tight">
                    Royal Trainer AI
                </h1>
                <div className="text-xs bg-red-600/20 border border-red-500/40 rounded-full px-2 py-1 text-red-300 font-bold">
                    BETA
                </div>
            </div>

            {/* Discord Auth Section */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex justify-center"
            >
                <DiscordAuth
                    isAuthenticated={auth.isAuthenticated}
                    user={auth.user}
                    isInRequiredGuild={auth.isInRequiredGuild}
                    guildCount={auth.guilds.length}
                    isLoading={auth.isLoading}
                    error={auth.error}
                    onLogin={auth.login}
                    onLogout={auth.logout}
                    onClearError={auth.clearError}
                    compact={true}
                    showGuildStatus={true}
                    className="max-w-md"
                />
            </motion.div>

            {/* Auth Status Indicator */}
            {auth.isAuthenticated && auth.user && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="mt-3 flex justify-center"
                >
                    <div className={`
                        text-xs px-3 py-1.5 rounded-full border font-medium
                        ${auth.isInRequiredGuild
                            ? 'bg-green-500/20 border-green-500/40 text-green-300'
                            : 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                        }
                    `}>
                        {auth.isInRequiredGuild
                            ? '✅ Authenticated & Verified'
                            : '⚠️ Authenticated (Server Access Required)'
                        }
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default Header;