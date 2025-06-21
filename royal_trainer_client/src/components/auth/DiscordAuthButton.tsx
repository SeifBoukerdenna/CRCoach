// royal_trainer_client/src/components/auth/DiscordAuthButton.tsx - Discord Auth Components

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, Loader2, ShieldCheck, Shield, Crown, Users } from 'lucide-react';
import { getDiscordAvatarUrl, getDiscordDisplayName, type DiscordUser } from '../../types/auth';

// Discord Logo SVG Component
const DiscordLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

// Guild Status Badge Component
interface GuildStatusBadgeProps {
    isInRequiredGuild: boolean;
    guildCount: number;
}

const GuildStatusBadge: React.FC<GuildStatusBadgeProps> = ({ isInRequiredGuild, guildCount }) => (
    <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${isInRequiredGuild
            ? 'bg-green-500/20 border border-green-500/40 text-green-300'
            : 'bg-orange-500/20 border border-orange-500/40 text-orange-300'
            }`}
    >
        {isInRequiredGuild ? (
            <>
                <ShieldCheck className="w-3 h-3" />
                <span>Server Member</span>
            </>
        ) : (
            <>
                <Shield className="w-3 h-3" />
                <span>Not in Server</span>
            </>
        )}
        {guildCount > 0 && (
            <>
                <span className="text-white/50">•</span>
                <Users className="w-3 h-3" />
                <span>{guildCount}</span>
            </>
        )}
    </motion.div>
);

// Discord Login Button Component
interface DiscordLoginButtonProps {
    onClick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    className?: string;
}

export const DiscordLoginButton: React.FC<DiscordLoginButtonProps> = ({
    onClick,
    isLoading = false,
    disabled = false,
    className = ""
}) => (
    <motion.button
        onClick={onClick}
        disabled={disabled || isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
      group relative overflow-hidden rounded-xl px-6 py-3 font-semibold text-white
      bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 bg-pos-0
      hover:bg-pos-100 transition-all duration-300 ease-out
      border border-indigo-500/50 shadow-lg shadow-indigo-500/25
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
      ${className}
    `}
    >
        <div className="relative flex items-center justify-center gap-3">
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0, rotate: 0 }}
                        animate={{ opacity: 1, rotate: 360 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="discord"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <DiscordLogo />
                    </motion.div>
                )}
            </AnimatePresence>

            <span className="text-base">
                {isLoading ? 'Connecting...' : 'Connect with Discord'}
            </span>

            <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 -top-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </motion.button>
);

// Discord User Display Component
interface DiscordUserDisplayProps {
    user: DiscordUser;
    isInRequiredGuild: boolean;
    guildCount: number;
    onLogout: () => void;
    isLoggingOut?: boolean;
    compact?: boolean;
    showGuildStatus?: boolean;
    className?: string;
}

export const DiscordUserDisplay: React.FC<DiscordUserDisplayProps> = ({
    user,
    isInRequiredGuild,
    guildCount,
    onLogout,
    isLoggingOut = false,
    compact = false,
    showGuildStatus = true,
    className = ""
}) => {
    const avatarUrl = getDiscordAvatarUrl(user, 128);
    const displayName = getDiscordDisplayName(user);

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 ${className}`}
            >
                <div className="relative">
                    <img
                        src={avatarUrl}
                        alt={`${displayName}'s avatar`}
                        className="w-8 h-8 rounded-full border-2 border-white/20"
                    />
                    {isInRequiredGuild && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                            <Crown className="w-2 h-2 text-white" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                        {displayName}
                    </p>
                    {showGuildStatus && (
                        <p className={`text-xs ${isInRequiredGuild ? 'text-green-400' : 'text-orange-400'}`}>
                            {isInRequiredGuild ? 'Server Member' : 'Not in Server'}
                        </p>
                    )}
                </div>

                <motion.button
                    onClick={onLogout}
                    disabled={isLoggingOut}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                    {isLoggingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <LogOut className="w-4 h-4" />
                    )}
                </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
        bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm
        border border-gray-700/50 rounded-xl p-4 shadow-xl
        ${className}
      `}
        >
            <div className="flex items-start gap-4">
                <div className="relative">
                    <img
                        src={avatarUrl}
                        alt={`${displayName}'s avatar`}
                        className="w-16 h-16 rounded-full border-2 border-white/20 shadow-lg"
                    />
                    {isInRequiredGuild && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                            <Crown className="w-3 h-3 text-white" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-white truncate">
                                {displayName}
                            </h3>
                            {user.email && (
                                <p className="text-sm text-gray-400 truncate">
                                    {user.email}
                                </p>
                            )}
                        </div>

                        <motion.button
                            onClick={onLogout}
                            disabled={isLoggingOut}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            title="Logout"
                        >
                            {isLoggingOut ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <LogOut className="w-5 h-5" />
                            )}
                        </motion.button>
                    </div>

                    {showGuildStatus && (
                        <div className="mt-3">
                            <GuildStatusBadge
                                isInRequiredGuild={isInRequiredGuild}
                                guildCount={guildCount}
                            />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// Combined Discord Auth Component
interface DiscordAuthProps {
    isAuthenticated: boolean;
    user: DiscordUser | null;
    isInRequiredGuild: boolean;
    guildCount: number;
    isLoading: boolean;
    error: string | null;
    onLogin: () => void;
    onLogout: () => void;
    onClearError: () => void;
    compact?: boolean;
    showGuildStatus?: boolean;
    className?: string;
}

export const DiscordAuth: React.FC<DiscordAuthProps> = ({
    isAuthenticated,
    user,
    isInRequiredGuild,
    guildCount,
    isLoading,
    error,
    onLogin,
    onLogout,
    onClearError,
    compact = false,
    showGuildStatus = true,
    className = ""
}) => {
    return (
        <div className={className}>
            <AnimatePresence mode="wait">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span>{error}</span>
                            <button
                                onClick={onClearError}
                                className="text-red-400 hover:text-red-300 transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    </motion.div>
                )}

                {isAuthenticated && user ? (
                    <motion.div key="authenticated">
                        <DiscordUserDisplay
                            user={user}
                            isInRequiredGuild={isInRequiredGuild}
                            guildCount={guildCount}
                            onLogout={onLogout}
                            isLoggingOut={isLoading}
                            compact={compact}
                            showGuildStatus={showGuildStatus}
                        />
                    </motion.div>
                ) : (
                    <motion.div key="login">
                        <DiscordLoginButton
                            onClick={onLogin}
                            isLoading={isLoading}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};