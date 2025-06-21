// royal_trainer_client/src/components/auth/AuthSection.tsx - Dedicated Discord Auth Section

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Crown, AlertTriangle, CheckCircle } from 'lucide-react';
import { DiscordAuth } from './DiscordAuthButton';
import { useDiscordAuth } from '../../hooks/useDiscordAuth';

interface AuthSectionProps {
    className?: string;
    showTitle?: boolean;
    expanded?: boolean;
}

export const AuthSection: React.FC<AuthSectionProps> = ({
    className = "",
    showTitle = true,
    expanded = false
}) => {
    const auth = useDiscordAuth();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
        bg-gradient-to-br from-gray-800/40 to-gray-900/60 backdrop-blur-sm
        border border-gray-700/50 rounded-xl p-6 shadow-xl
        ${className}
      `}
        >
            {/* Section Header */}
            {showTitle && (
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <Shield className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            Discord Authentication
                        </h3>
                        <p className="text-sm text-gray-400">
                            Connect with Discord for enhanced features
                        </p>
                    </div>
                </div>
            )}

            {/* Auth Component */}
            <div className="mb-6">
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
                    compact={!expanded}
                    showGuildStatus={true}
                />
            </div>

            {/* Authentication Benefits */}
            <AnimatePresence>
                {!auth.isAuthenticated && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                    >
                        <div className="text-sm text-gray-300 font-medium mb-3">
                            Why connect with Discord?
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                <span>Persistent login sessions</span>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                <span>Server membership verification</span>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                <span>Personalized experience</span>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                <span>Access to exclusive features</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {auth.isAuthenticated && auth.user && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                    >
                        {/* Server Status */}
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <div className="flex items-center gap-3">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-300">Server Status</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {auth.isInRequiredGuild ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        <span className="text-sm text-green-400">Verified Member</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                                        <span className="text-sm text-orange-400">Not in Server</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Guild Count */}
                        {auth.guilds.length > 0 && (
                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <Crown className="w-4 h-4 text-yellow-400" />
                                    <span className="text-sm text-gray-300">Discord Servers</span>
                                </div>
                                <span className="text-sm text-yellow-400 font-medium">
                                    {auth.guilds.length}
                                </span>
                            </div>
                        )}

                        {/* Additional Info */}
                        {expanded && (
                            <div className="pt-3 border-t border-gray-700/50">
                                <div className="text-xs text-gray-500 space-y-1">
                                    <div>Stay logged in across sessions</div>
                                    <div>Automatic token refresh</div>
                                    <div>Secure session management</div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default AuthSection;