// royal_trainer_client/src/components/auth/PopupAuthCallback.tsx - Popup Callback Handler

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const PopupAuthCallback: React.FC = () => {
    const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = React.useState('Processing authentication...');

    useEffect(() => {
        const handleCallback = () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);

                // Check for error
                const error = urlParams.get('error');
                if (error) {
                    const errorDescription = urlParams.get('description') || urlParams.get('error_description') || error;
                    setStatus('error');
                    setMessage(errorDescription);

                    // Send error to parent window
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'DISCORD_AUTH_ERROR',
                            error: errorDescription
                        }, window.location.origin);
                    }
                    return;
                }

                // Extract tokens
                const accessToken = urlParams.get('access_token');
                const refreshToken = urlParams.get('refresh_token');
                const expiresIn = urlParams.get('expires_in');
                const inGuild = urlParams.get('in_guild');

                if (!accessToken || !refreshToken) {
                    setStatus('error');
                    setMessage('Missing authentication tokens');

                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'DISCORD_AUTH_ERROR',
                            error: 'Missing authentication tokens'
                        }, window.location.origin);
                    }
                    return;
                }

                setStatus('success');
                setMessage('Authentication successful!');

                // Send success and tokens to parent window
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'DISCORD_AUTH_SUCCESS',
                        tokens: {
                            access_token: accessToken,
                            refresh_token: refreshToken,
                            expires_in: expiresIn,
                            in_guild: inGuild
                        }
                    }, window.location.origin);
                }

                // Close popup after a short delay
                setTimeout(() => {
                    window.close();
                }, 1500);

            } catch (error) {
                console.error('❌ Popup callback error:', error);
                setStatus('error');
                setMessage('Authentication processing failed');

                if (window.opener) {
                    window.opener.postMessage({
                        type: 'DISCORD_AUTH_ERROR',
                        error: 'Authentication processing failed'
                    }, window.location.origin);
                }
            }
        };

        // Process callback immediately
        handleCallback();
    }, []);

    const getStatusIcon = () => {
        switch (status) {
            case 'loading':
                return <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />;
            case 'success':
                return <CheckCircle className="w-8 h-8 text-green-400" />;
            case 'error':
                return <XCircle className="w-8 h-8 text-red-400" />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'loading':
                return 'border-blue-500/50 bg-blue-500/10';
            case 'success':
                return 'border-green-500/50 bg-green-500/10';
            case 'error':
                return 'border-red-500/50 bg-red-500/10';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`
          max-w-sm w-full p-6 rounded-2xl border backdrop-blur-sm
          bg-gray-800/80 shadow-2xl text-center
          ${getStatusColor()}
        `}
            >
                {/* Status Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex justify-center mb-4"
                >
                    {getStatusIcon()}
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-lg font-bold text-white mb-2"
                >
                    {status === 'loading' && 'Processing...'}
                    {status === 'success' && 'Success!'}
                    {status === 'error' && 'Error'}
                </motion.h1>

                {/* Message */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-gray-300 text-sm"
                >
                    {message}
                </motion.p>

                {/* Auto-close notice */}
                {status === 'success' && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="text-xs text-gray-500 mt-3"
                    >
                        This window will close automatically...
                    </motion.p>
                )}

                {/* Manual close for errors */}
                {status === 'error' && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        onClick={() => window.close()}
                        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                        Close Window
                    </motion.button>
                )}
            </motion.div>
        </div>
    );
};

export default PopupAuthCallback;