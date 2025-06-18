// royal_trainer_client/src/components/discord/DiscordAuth.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiscord } from '../../contexts/DiscordContext';
import { LogIn, LogOut, User, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DiscordAuthProps {
    className?: string;
    compact?: boolean;
}

const DiscordAuth: React.FC<DiscordAuthProps> = ({ className = '', compact = false }) => {
    const { isAuthenticated, user, isLoading, error, login, logout, config } = useDiscord();

    const getAvatarUrl = (user: any) => {
        if (!user.avatar) {
            return `https://cdn.discordapp.com/embed/avatars/${user.discriminator % 5}.png`;
        }
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
    };

    if (!config.configured) {
        return (
            <motion.div
                className={`bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 ${className}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="flex items-center gap-3 text-amber-400">
                    <AlertCircle size={20} />
                    <span className="text-sm font-medium">Discord not configured</span>
                </div>
            </motion.div>
        );
    }

    if (isLoading) {
        return (
            <motion.div
                className={`bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 ${className}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="flex items-center gap-3">
                    <Loader2 size={20} className="animate-spin text-blue-400" />
                    <span className="text-sm font-medium text-slate-300">Checking Discord status...</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={`bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-xl ${compact ? 'p-3' : 'p-4'} ${className}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            <AnimatePresence mode="wait">
                {isAuthenticated && user ? (
                    <motion.div
                        key="authenticated"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                    >
                        {/* User Info */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img
                                    src={getAvatarUrl(user)}
                                    alt={`${user.username}'s avatar`}
                                    className="w-10 h-10 rounded-full border-2 border-slate-600"
                                    onError={(e) => {
                                        e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/0.png`;
                                    }}
                                />
                                <div
                                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800 ${user.is_in_server ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                    title={user.is_in_server ? 'In server' : 'Not in server'}
                                />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-blue-400 truncate">
                                        {user.username}
                                    </span>
                                    <User size={14} className="text-slate-500 flex-shrink-0" />
                                </div>
                                {user.server_nickname && (
                                    <div className="text-xs text-slate-400 truncate">
                                        aka {user.server_nickname}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Server Status */}
                        {!compact && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${user.is_in_server
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                {user.is_in_server ? (
                                    <>
                                        <CheckCircle size={14} />
                                        <span>Server Member</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={14} />
                                        <span>Not in Server</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Disconnect Button */}
                        <motion.button
                            onClick={logout}
                            className={`w-full flex items-center justify-center gap-2 ${compact ? 'px-3 py-2' : 'px-4 py-2'}
                         bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30
                         rounded-lg transition-all duration-200 text-sm font-medium group`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isLoading}
                        >
                            <LogOut size={16} className="group-hover:rotate-12 transition-transform duration-200" />
                            <span>Disconnect</span>
                        </motion.button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="unauthenticated"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                    >
                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-500/20 border border-red-500/30 rounded-lg p-3"
                                >
                                    <div className="flex items-center gap-2 text-red-400 text-xs">
                                        <XCircle size={14} />
                                        <span>{error}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Connect Button */}
                        <motion.button
                            onClick={login}
                            className={`w-full flex items-center justify-center gap-2 ${compact ? 'px-3 py-2' : 'px-4 py-3'}
                         bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30
                         rounded-lg transition-all duration-200 font-medium group disabled:opacity-50
                         disabled:cursor-not-allowed ${compact ? 'text-sm' : 'text-base'}`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 size={compact ? 16 : 20} className="animate-spin" />
                            ) : (
                                <LogIn size={compact ? 16 : 20} className="group-hover:translate-x-1 transition-transform duration-200" />
                            )}
                            <span>Connect with Discord</span>
                        </motion.button>

                        {!compact && (
                            <div className="text-xs text-slate-400 text-center">
                                Connect to access all features and join the community
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default DiscordAuth;