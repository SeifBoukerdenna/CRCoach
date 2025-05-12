import React, { useEffect, useState } from 'react';
import { useBroadcast } from '../../../context/BroadcastContext';
import './GameTimerDisplay.css';

interface GameTimerProps {
    sessionCode?: string;
    className?: string;
}

interface TimerData {
    time_text: string | null;
    seconds: number | null;
    OT: boolean;
    confidence: number;
    method: string;
}

/**
 * GameTimerDisplay component shows the current game timer
 * extracted from the broadcast frames
 */
export const GameTimerDisplay: React.FC<GameTimerProps> = ({
    sessionCode,
    className = ""
}) => {
    const { isConnected } = useBroadcast();
    const [timerData, setTimerData] = useState<TimerData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        let isActive = true;

        const fetchTimer = async () => {
            if (!sessionCode || !isConnected || loading) return;

            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/analysis/${sessionCode}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch analysis data: ${response.status}`);
                }

                const data = await response.json();

                if (data.time_left) {
                    if (isActive) {
                        setTimerData(data.time_left as TimerData);
                    }
                } else {
                    if (isActive) {
                        setError('No timer data available');
                    }
                }
            } catch (err) {
                if (isActive) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch timer data');
                    console.error('Timer fetch error:', err);
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        if (isConnected && sessionCode) {
            // Fetch immediately
            fetchTimer();

            // Fetch every 100ms (10 times per second)
            intervalId = setInterval(fetchTimer, 100);
        }

        return () => {
            isActive = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [sessionCode, isConnected, loading]);

    // Don't render if not connected
    if (!isConnected) {
        return null;
    }

    // Show loading state for initial load
    if (loading && !timerData) {
        return (
            <div className={`game-timer-display loading ${className}`}>
                <div className="timer-value">--:--</div>
            </div>
        );
    }

    // Show error state
    if (error && !timerData) {
        return (
            <div className={`game-timer-display error ${className}`}>
                <div className="timer-value">--:--</div>
            </div>
        );
    }

    // Show timer data
    return (
        <div className={`game-timer-display ${timerData?.OT ? 'overtime' : ''} ${className}`}>
            <div className="timer-container">
                {timerData?.OT && (
                    <div className="overtime-indicator">OT</div>
                )}
                <div className="timer-value">
                    {timerData?.time_text || '--:--'}
                </div>
            </div>

            {/* Optional debug info */}
            {process.env.NODE_ENV === 'development' && timerData && (
                <div className="timer-debug">
                    <div>Confidence: {timerData.confidence.toFixed(2)}</div>
                    <div>Method: {timerData.method}</div>
                </div>
            )}
        </div>
    );
};

export default GameTimerDisplay;