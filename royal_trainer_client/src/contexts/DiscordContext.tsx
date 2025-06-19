// royal_trainer_client/src/contexts/DiscordContext.tsx - FIXED VERSION
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { discordApi, DiscordApiError } from '../utils/discordApi';
import type { DiscordUser, DiscordAuthState, DiscordConfig } from '../types/discord';

interface DiscordContextType extends DiscordAuthState {
    login: () => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    config: DiscordConfig;
}

const DiscordContext = createContext<DiscordContextType | null>(null);

type DiscordAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_USER'; payload: DiscordUser | null }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_AUTHENTICATED'; payload: boolean }
    | { type: 'IMMEDIATE_AUTH_SUCCESS'; payload: DiscordUser } // NEW: For immediate updates
    | { type: 'RESET' };

const initialState: DiscordAuthState = {
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
};

function discordReducer(state: DiscordAuthState, action: DiscordAction): DiscordAuthState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_USER':
            return {
                ...state,
                user: action.payload,
                isAuthenticated: action.payload !== null,
                error: null,
                isLoading: false,
            };
        case 'IMMEDIATE_AUTH_SUCCESS': // NEW: Handle immediate auth success
            return {
                ...state,
                user: action.payload,
                isAuthenticated: true,
                error: null,
                isLoading: false,
            };
        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };
        case 'SET_AUTHENTICATED':
            return {
                ...state,
                isAuthenticated: action.payload,
                user: action.payload ? state.user : null,
                error: null,
                isLoading: false,
            };
        case 'RESET':
            return { ...initialState, isLoading: false };
        default:
            return state;
    }
}

export const DiscordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(discordReducer, initialState);
    const [config, setConfig] = React.useState<DiscordConfig>({
        configured: false,
        server_id: '',
        server_name: '',
        client_id: '',
        redirect_uri: ''
    });

    const checkAuthStatus = useCallback(async () => {
        try {
            console.log('🔍 Checking Discord authentication status...');
            const authStatus = await discordApi.checkAuthStatus();

            if (authStatus.authenticated && authStatus.user) {
                console.log('✅ User authenticated:', authStatus.user.username, 'Server member:', authStatus.user.is_in_server);
                dispatch({ type: 'SET_USER', payload: authStatus.user });
            } else {
                console.log('ℹ️ User not authenticated');
                dispatch({ type: 'SET_USER', payload: null });
            }
        } catch (error) {
            console.error('❌ Auth status check failed:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to check authentication status' });
        }
    }, []);

    const loadConfig = useCallback(async () => {
        try {
            const configData = await discordApi.getConfig();
            setConfig(configData);
            console.log('⚙️ Discord config loaded:', configData);
        } catch (error) {
            console.error('Failed to load Discord config:', error);
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        console.log('🔐 Initializing Discord authentication...');
        checkAuthStatus();
        loadConfig();
    }, [checkAuthStatus, loadConfig]);

    // Periodic auth check (every 10 minutes instead of 5)
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('🔄 Periodic Discord auth check...');
            checkAuthStatus();
        }, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [checkAuthStatus]);

    // FIXED: Handle OAuth popup messages with immediate state update
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            // Security check
            if (event.origin !== window.location.origin) {
                console.warn('⚠️ Ignored message from different origin:', event.origin);
                return;
            }

            console.log('📨 Received popup message:', event.data);

            if (event.data.type === 'DISCORD_AUTH_SUCCESS') {
                console.log('✅ Discord authentication successful - immediately updating state!');

                // FIXED: Immediately update state with user data from popup
                if (event.data.user) {
                    dispatch({ type: 'IMMEDIATE_AUTH_SUCCESS', payload: event.data.user });
                    console.log('🚀 Immediately set user:', event.data.user.username, 'Server member:', event.data.user.is_in_server);
                }

                // Skip the immediate double-check since we already have the correct user data
                // The periodic check will handle any discrepancies later
                console.log('✅ Skipping immediate double-check since we have fresh user data from popup');

            } else if (event.data.type === 'DISCORD_AUTH_ERROR') {
                console.error('❌ Discord authentication failed:', event.data.error);
                dispatch({ type: 'SET_ERROR', payload: event.data.error || 'Authentication failed' });
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        console.log('🎧 Setting up popup message listener...');
        window.addEventListener('message', handleMessage);
        return () => {
            console.log('🎧 Removing popup message listener...');
            window.removeEventListener('message', handleMessage);
        };
    }, [checkAuthStatus]);

    const login = useCallback(async () => {
        if (!config.configured) {
            dispatch({ type: 'SET_ERROR', payload: 'Discord authentication not configured on server' });
            return;
        }

        try {
            console.log('🔐 Starting Discord login process...');
            dispatch({ type: 'SET_LOADING', payload: true });
            dispatch({ type: 'SET_ERROR', payload: null });

            const authUrl = await discordApi.getLoginUrl();
            console.log('🔗 Opening Discord auth popup...');

            // Open popup for OAuth flow
            const popup = window.open(
                authUrl,
                'discord-auth',
                'width=500,height=700,scrollbars=yes,resizable=yes'
            );

            if (!popup) {
                throw new Error('Failed to open authentication popup. Please allow popups for this site.');
            }

            // Monitor popup for closure
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    console.log('🪟 Discord auth popup closed');

                    // Only set loading to false if we haven't already received success/error
                    if (state.isLoading) {
                        dispatch({ type: 'SET_LOADING', payload: false });
                    }
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Login failed:', error);
            const errorMessage = error instanceof DiscordApiError
                ? error.message
                : 'Failed to initiate Discord login';
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
        }
    }, [config.configured, state.isLoading]);

    const logout = useCallback(async () => {
        try {
            console.log('🚪 Logging out of Discord...');
            dispatch({ type: 'SET_LOADING', payload: true });
            await discordApi.logout();
            dispatch({ type: 'RESET' });
            console.log('✅ Logged out successfully');
        } catch (error) {
            console.error('❌ Logout failed:', error);
            // Even if logout fails on server, clear local state
            dispatch({ type: 'RESET' });
        }
    }, []);

    const refreshUser = useCallback(async () => {
        if (!state.isAuthenticated) return;

        try {
            console.log('🔄 Refreshing Discord user data...');
            const user = await discordApi.getCurrentUser();
            dispatch({ type: 'SET_USER', payload: user });
            console.log('✅ User data refreshed');
        } catch (error) {
            console.error('❌ Failed to refresh user:', error);
            if (error instanceof DiscordApiError && error.status === 401) {
                // User is no longer authenticated
                console.log('🚪 User session expired, logging out...');
                dispatch({ type: 'RESET' });
            }
        }
    }, [state.isAuthenticated]);

    const value: DiscordContextType = {
        ...state,
        login,
        logout,
        refreshUser,
        config,
    };

    return (
        <DiscordContext.Provider value={value}>
            {children}
        </DiscordContext.Provider>
    );
};

export const useDiscord = (): DiscordContextType => {
    const context = useContext(DiscordContext);
    if (!context) {
        throw new Error('useDiscord must be used within a DiscordProvider');
    }
    return context;
};