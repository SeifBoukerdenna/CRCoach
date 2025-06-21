// royal_trainer_client/src/components/auth/AuthCallback.tsx - Discord Auth Callback Handler

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

interface AuthCallbackProps {
    onComplete?: () => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({ onComplete }) => {
    const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = React.useState('Completing authentication...');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const hasAuthParams = urlParams.get('access_token') || urlParams.get('error');

        if (!hasAuthParams) {
            setStatus('error');
            setMessage('No authentication data received');
            return;
        }

        if (urlParams.get('error')) {
            setStatus('error');
            setMessage(urlParams.get('description') || urlParams.get('error') || 'Authentication failed');
            return;
        }

        if (urlParams.get('access_token')) {
            setStatus('success');
            setMessage('Authentication successful! Redirecting...');

            // Auto-redirect after success
            setTimeout(() => {
                onComplete?.();
            }, 2000);
        }
    }, [onComplete]);

    const getStatusIcon = () => {
        switch (status) {
            case 'loading':
                return <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />;
            case 'success':
                return <CheckCircle className="w-12 h-12 text-green-400" />;
            case 'error':
                return <XCircle className="w-12 h-12 text-red-400" />;
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
          max-w-md w-full p-8 rounded-2xl border backdrop-blur-sm
          bg-gray-800/80 shadow-2xl text-center
          ${getStatusColor()}
        `}
            >
                {/* Status Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex justify-center mb-6"
                >
                    {getStatusIcon()}
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-2xl font-bold text-white mb-4"
                >
                    {status === 'loading' && 'Authenticating...'}
                    {status === 'success' && 'Welcome!'}
                    {status === 'error' && 'Authentication Failed'}
                </motion.h1>

                {/* Message */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-gray-300 mb-8"
                >
                    {message}
                </motion.p>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="space-y-4"
                >
                    {status === 'error' && (
                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return to App
                        </button>
                    )}

                    {status === 'success' && (
                        <div className="text-sm text-gray-400">
                            Redirecting automatically...
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="text-sm text-gray-400">
                            Please wait while we complete your authentication
                        </div>
                    )}
                </motion.div>

                {/* Discord Branding */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="mt-8 pt-6 border-t border-gray-700/50"
                >
                    <p className="text-xs text-gray-500">
                        Powered by Discord OAuth 2.0
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default AuthCallback;