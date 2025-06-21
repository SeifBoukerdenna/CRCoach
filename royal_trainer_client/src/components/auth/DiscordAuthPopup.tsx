// royal_trainer_client/src/components/DiscordAuthPopup.tsx
import React, { useEffect, useState } from 'react';
import { useDiscordAuth } from '../../hooks/useDiscordAuth';


interface AuthPopupProps {
    isOpen: boolean;
    onClose: () => void;
    authRequired: boolean;
    guildRequired: boolean;
    discordInviteUrl?: string;
    errorMessage?: string;
    onLoginClick?: () => void;
}

export const DiscordAuthPopup: React.FC<AuthPopupProps> = ({
    isOpen,
    onClose,
    guildRequired,
    discordInviteUrl,
    errorMessage,
    onLoginClick
}) => {
    const { login, isAuthenticated, user, isInRequiredGuild } = useDiscordAuth();
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300);
    };

    const handleLogin = async () => {
        try {
            if (onLoginClick) {
                onLoginClick();
            } else {
                await login();
            }
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const handleJoinDiscord = () => {
        if (discordInviteUrl) {
            window.open(discordInviteUrl, '_blank');
        }
    };

    // Auto-close if user becomes authenticated and in guild
    useEffect(() => {
        if (isAuthenticated && (!guildRequired || isInRequiredGuild)) {
            handleClose();
        }
    }, [isAuthenticated, isInRequiredGuild, guildRequired]);

    if (!isOpen) return null;

    return (
        <div className={`
      fixed inset-0 z-50 flex items-center justify-center
      bg-black bg-opacity-50 backdrop-blur-sm
      transition-opacity duration-300
      ${isClosing ? 'opacity-0' : 'opacity-100'}
    `}>
            <div className={`
        bg-gradient-to-br from-indigo-600 to-purple-700
        rounded-2xl p-8 max-w-md w-full mx-4
        shadow-2xl border border-white/20
        transform transition-all duration-300
        ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
      `}>
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-4xl mb-3">🤖</div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Inference Access Required
                    </h2>
                    <p className="text-indigo-200 text-sm">
                        Authentication needed to use AI inference features
                    </p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                    <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3 mb-4">
                        <p className="text-red-100 text-sm">{errorMessage}</p>
                    </div>
                )}

                {/* Current Status */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                        <span className="text-white text-sm">Discord Login:</span>
                        <div className="flex items-center">
                            {isAuthenticated ? (
                                <>
                                    <span className="text-green-400 text-xs mr-2">✅</span>
                                    <span className="text-green-400 text-sm font-medium">
                                        {user?.username || 'Logged in'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-red-400 text-xs mr-2">❌</span>
                                    <span className="text-red-400 text-sm">Required</span>
                                </>
                            )}
                        </div>
                    </div>

                    {guildRequired && (
                        <div className="flex items-center justify-between">
                            <span className="text-white text-sm">Server Member:</span>
                            <div className="flex items-center">
                                {isInRequiredGuild ? (
                                    <>
                                        <span className="text-green-400 text-xs mr-2">✅</span>
                                        <span className="text-green-400 text-sm font-medium">Verified</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-red-400 text-xs mr-2">❌</span>
                                        <span className="text-red-400 text-sm">Required</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    {!isAuthenticated && (
                        <button
                            onClick={handleLogin}
                            className="
                w-full py-3 px-4 rounded-xl
                bg-indigo-500 hover:bg-indigo-400
                text-white font-medium
                transition-all duration-200
                transform hover:scale-105 active:scale-95
                flex items-center justify-center gap-2
              "
                        >
                            <span>🔐</span>
                            Login with Discord
                        </button>
                    )}

                    {isAuthenticated && guildRequired && !isInRequiredGuild && discordInviteUrl && (
                        <button
                            onClick={handleJoinDiscord}
                            className="
                w-full py-3 px-4 rounded-xl
                bg-purple-500 hover:bg-purple-400
                text-white font-medium
                transition-all duration-200
                transform hover:scale-105 active:scale-95
                flex items-center justify-center gap-2
              "
                        >
                            <span>🏠</span>
                            Join Discord Server
                        </button>
                    )}

                    <button
                        onClick={handleClose}
                        className="
              w-full py-2 px-4 rounded-xl
              bg-white/10 hover:bg-white/20
              text-white/80 hover:text-white
              transition-all duration-200
              text-sm
            "
                    >
                        Close
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-white/20">
                    <p className="text-indigo-200 text-xs text-center">
                        Inference features require Discord authentication for access control
                    </p>
                </div>
            </div>
        </div>
    );
};

// Hook for easier popup management
export const useAuthPopup = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [authData, setAuthData] = useState<{
        authRequired: boolean;
        guildRequired: boolean;
        discordInviteUrl?: string;
        errorMessage?: string;
    }>({
        authRequired: true,
        guildRequired: true
    });

    const showPopup = (data: {
        authRequired?: boolean;
        guildRequired?: boolean;
        discordInviteUrl?: string;
        errorMessage?: string;
    }) => {
        setAuthData({
            authRequired: data.authRequired ?? true,
            guildRequired: data.guildRequired ?? true,
            discordInviteUrl: data.discordInviteUrl,
            errorMessage: data.errorMessage
        });
        setIsOpen(true);
    };

    const hidePopup = () => {
        setIsOpen(false);
    };

    return {
        isOpen,
        authData,
        showPopup,
        hidePopup,
        AuthPopupComponent: (props: Partial<AuthPopupProps>) => (
            <DiscordAuthPopup
                isOpen={isOpen}
                onClose={hidePopup}
                authRequired={authData.authRequired}
                guildRequired={authData.guildRequired}
                discordInviteUrl={authData.discordInviteUrl}
                errorMessage={authData.errorMessage}
                {...props}
            />
        )
    };
};