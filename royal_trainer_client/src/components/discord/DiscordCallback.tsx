// royal_trainer_client/src/components/discord/DiscordCallback.tsx - FIXED VERSION
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getApiUrl } from '../../config/api';

const DiscordCallback: React.FC = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Processing Discord authentication...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const error = urlParams.get('error');

                console.log('🔐 Discord callback received:', { code: code ? 'present' : 'missing', error });

                if (error) {
                    throw new Error(error === 'access_denied' ? 'Authentication cancelled' : `OAuth error: ${error}`);
                }

                if (!code) {
                    throw new Error('No authorization code received');
                }

                console.log('✅ Sending authorization code to backend...');
                setMessage('Exchanging authorization code...');

                // Call the backend callback endpoint
                const response = await fetch(getApiUrl(`/auth/discord/callback?code=${encodeURIComponent(code)}`), {
                    method: 'GET',
                    credentials: 'include', // Important for cookies
                });

                console.log('📡 Backend response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Backend callback failed:', errorText);
                    throw new Error(`Authentication failed: ${response.status}`);
                }

                const callbackData = await response.json();
                console.log('✅ Backend authentication successful:', callbackData);

                // FIXED: Immediately send success message to parent window with user data
                if (window.opener && !window.opener.closed) {
                    console.log('📤 Sending success message to parent window with user data:', callbackData.user);

                    // Send the message multiple times to ensure it's received
                    const sendMessage = () => {
                        window.opener.postMessage({
                            type: 'DISCORD_AUTH_SUCCESS',
                            user: callbackData.user,
                            timestamp: Date.now()
                        }, window.location.origin);
                    };

                    // Send immediately
                    sendMessage();

                    // Send again after a short delay to ensure it's caught
                    setTimeout(sendMessage, 100);
                    setTimeout(sendMessage, 300);

                    console.log('✅ Success messages sent to parent window');
                } else {
                    console.warn('⚠️ No parent window found or parent window is closed');
                }

                setStatus('success');
                setMessage('Authentication successful! You are now logged in.');

                // Auto-close after 2 seconds
                setTimeout(() => {
                    console.log('🪟 Closing Discord auth popup');
                    if (window.opener && !window.opener.closed) {
                        // Send one final message before closing
                        window.opener.postMessage({
                            type: 'DISCORD_AUTH_SUCCESS',
                            user: callbackData.user,
                            timestamp: Date.now(),
                            final: true
                        }, window.location.origin);
                    }
                    window.close();
                }, 2000);

            } catch (error) {
                console.error('❌ Discord callback error:', error);
                setStatus('error');
                setMessage(error instanceof Error ? error.message : 'Authentication failed');

                // Send error message to parent window
                if (window.opener && !window.opener.closed) {
                    console.log('📤 Sending error message to parent window');
                    window.opener.postMessage({
                        type: 'DISCORD_AUTH_ERROR',
                        error: error instanceof Error ? error.message : 'Authentication failed',
                        timestamp: Date.now()
                    }, window.location.origin);
                } else {
                    console.warn('⚠️ No parent window found for error message');
                }

                // Auto-close after 3 seconds even on error
                setTimeout(() => {
                    console.log('🪟 Closing Discord auth popup (error)');
                    window.close();
                }, 3000);
            }
        };

        handleCallback();
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md w-full text-center">
                <div className="mb-6">
                    {status === 'loading' && (
                        <Loader2 size={48} className="mx-auto animate-spin text-blue-400" />
                    )}
                    {status === 'success' && (
                        <CheckCircle size={48} className="mx-auto text-green-400" />
                    )}
                    {status === 'error' && (
                        <XCircle size={48} className="mx-auto text-red-400" />
                    )}
                </div>

                <h1 className="text-xl font-bold text-white mb-4">
                    {status === 'loading' && 'Processing...'}
                    {status === 'success' && 'Success!'}
                    {status === 'error' && 'Error'}
                </h1>

                <p className="text-slate-300 text-sm leading-relaxed">
                    {message}
                </p>

                {status === 'success' && (
                    <div className="mt-4 text-green-400 text-sm">
                        You should now see your Discord profile in the main window.
                        <br />
                        <span className="text-slate-400">This window will close automatically...</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="mt-4 text-red-400 text-sm">
                        Please try again or contact support if the problem persists.
                        <br />
                        <span className="text-slate-400">This window will close automatically...</span>
                    </div>
                )}

                {(status === 'success' || status === 'error') && (
                    <div className="mt-6">
                        <button
                            onClick={() => window.close()}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200"
                        >
                            Close Window
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiscordCallback;