import React, { useReducer, useEffect, useRef } from 'react';
import { useBroadcast } from '../../../../context/BroadcastContext';
import './StreamMetrics.css';

// Define types for the component
interface StreamMetricsProps {
    className?: string;
}

// Define the server stats type that we'll receive from the API
interface ServerStats {
    active: boolean;
    code: string;
    last_upload: number | null;
    total_frames?: number;
    processed_frames?: number;
    processing_ratio?: number;
    processing_time_ms?: number;
    throttle_interval_ms?: number;
    dropped_frames?: {
        count: number;
        reason: string | null;
        reasons?: Record<string, number>;
    };
    game_timer?: {
        time_text: string | null;
        seconds: number | null;
        overtime: boolean;
    };
}

// Define the health status type
interface HealthStatus {
    text: string;
    className: string;
}

// Define the metrics state type
interface MetricsState {
    showExpanded: boolean;
    serverStats: ServerStats | null;
    lastUpdate: number;
    localFps: string;
    frameCounter: number;
    lastFrameTime: number;
    pingTime: number | null;
    updateCounter: number;
}

// Define action types for the reducer
type MetricsAction =
    | { type: 'TOGGLE_EXPANDED' }
    | { type: 'UPDATE_SERVER_STATS'; payload: ServerStats }
    | { type: 'UPDATE_PING_TIME'; payload: number }
    | { type: 'UPDATE_COUNTER'; payload: number }
    | { type: 'INCREMENT_FRAME_COUNTER' }
    | { type: 'UPDATE_FPS'; payload: { fps: number; timestamp: number } }
    | { type: 'RESET_FRAME_COUNTER'; payload: number }
    | { type: 'RESET_METRICS' };

// Initial state for the metrics
const initialMetricsState: MetricsState = {
    showExpanded: false,
    serverStats: null,
    lastUpdate: 0,
    localFps: '-- FPS',
    frameCounter: 0,
    lastFrameTime: performance.now(),
    pingTime: null,
    updateCounter: 0,
};

// Reducer function to handle all state changes
function metricsReducer(state: MetricsState, action: MetricsAction): MetricsState {
    switch (action.type) {
        case 'TOGGLE_EXPANDED':
            return { ...state, showExpanded: !state.showExpanded };

        case 'UPDATE_SERVER_STATS':
            return {
                ...state,
                serverStats: action.payload,
                lastUpdate: Date.now(),
            };

        case 'UPDATE_PING_TIME':
            return { ...state, pingTime: action.payload };

        case 'UPDATE_COUNTER':
            return { ...state, updateCounter: action.payload };

        case 'INCREMENT_FRAME_COUNTER':
            return { ...state, frameCounter: state.frameCounter + 1 };

        case 'UPDATE_FPS':
            return {
                ...state,
                localFps: `${action.payload.fps} FPS`,
                frameCounter: 0,
                lastFrameTime: action.payload.timestamp,
            };

        case 'RESET_FRAME_COUNTER':
            return {
                ...state,
                frameCounter: 0,
                lastFrameTime: action.payload,
            };

        case 'RESET_METRICS':
            return {
                ...initialMetricsState,
                lastFrameTime: performance.now(),
            };

        default:
            return state;
    }
}

/**
 * StreamMetrics component displays real-time information about the stream
 * including connection status, frame rate, latency, and server statistics.
 */
const StreamMetrics: React.FC<StreamMetricsProps> = ({ className = "" }) => {
    const { isConnected, sessionCode, stats } = useBroadcast();

    // Use reducer for state management instead of multiple useState calls
    const [state, dispatch] = useReducer(metricsReducer, initialMetricsState);

    // Reference for animation frame ID
    const frameIdRef = useRef<number | null>(null);

    // Fetch server statistics
    useEffect(() => {
        if (!isConnected || !sessionCode) {
            dispatch({ type: 'RESET_METRICS' });
            return () => { };
        }

        // Update counter for controlling stats fetch frequency
        const intervalId = setInterval(() => {
            dispatch({ type: 'UPDATE_COUNTER', payload: state.updateCounter + 1 });

            // Every 4th update (2 seconds), fetch server statistics
            if (state.updateCounter % 4 === 0) {
                const fetchStats = async () => {
                    try {
                        const startTime = performance.now();
                        const response = await fetch(`/api/stream-stats/${sessionCode}`);
                        const endTime = performance.now();

                        // Calculate round-trip time
                        dispatch({ type: 'UPDATE_PING_TIME', payload: Math.round(endTime - startTime) });

                        if (response.ok) {
                            const data = await response.json() as ServerStats;
                            dispatch({ type: 'UPDATE_SERVER_STATS', payload: data });
                        }
                    } catch (error) {
                        console.error("Error fetching stream stats:", error);
                    }
                };

                fetchStats();
            }
        }, 500);

        return () => clearInterval(intervalId);
    }, [isConnected, sessionCode, state.updateCounter]);

    // Calculate local FPS using requestAnimationFrame
    useEffect(() => {
        if (!isConnected) {
            return () => { };
        }

        // Measure FPS every second
        const fpsIntervalId = setInterval(() => {
            const now = performance.now();
            const elapsed = now - state.lastFrameTime;

            if (elapsed >= 1000) {
                const fps = Math.round((state.frameCounter / elapsed) * 1000);
                dispatch({ type: 'UPDATE_FPS', payload: { fps, timestamp: now } });
            }
        }, 1000);

        // Function to count frames
        const countFrame = () => {
            dispatch({ type: 'INCREMENT_FRAME_COUNTER' });
            frameIdRef.current = requestAnimationFrame(countFrame);
        };

        // Start counting frames
        frameIdRef.current = requestAnimationFrame(countFrame);

        return () => {
            clearInterval(fpsIntervalId);
            if (frameIdRef.current !== null) {
                cancelAnimationFrame(frameIdRef.current);
                frameIdRef.current = null;
            }
        };
    }, [isConnected, state.frameCounter, state.lastFrameTime]);

    // Function to determine health status
    const getHealthStatus = (): HealthStatus => {
        if (!state.serverStats) return { text: "Unknown", className: "unknown" };

        // Calculate health based on processing ratio
        const ratio = state.serverStats.processing_ratio || 0;

        if (ratio < 50) return { text: "Poor", className: "poor" };
        if (ratio < 70) return { text: "Fair", className: "fair" };
        if (ratio < 85) return { text: "Good", className: "good" };
        return { text: "Excellent", className: "excellent" };
    };

    const healthStatus = getHealthStatus();

    // Don't display if not connected
    if (!isConnected) return null;

    return (
        <div className={`stream-metrics ${className} ${state.showExpanded ? 'expanded' : 'collapsed'}`}>
            <div
                className="stream-metrics-header"
                onClick={() => dispatch({ type: 'TOGGLE_EXPANDED' })}
            >
                <div className="metrics-title">Stream Performance</div>
                <div className={`health-indicator ${healthStatus.className}`}>
                    {healthStatus.text}
                </div>
                <div className="expand-toggle">
                    {state.showExpanded ? '▼' : '▲'}
                </div>
            </div>

            {state.showExpanded && (
                <div className="stream-metrics-body">
                    <div className="metrics-row">
                        <div className="metric-label">Connection</div>
                        <div className="metric-value">{isConnected ? "Connected" : "Disconnected"}</div>
                    </div>

                    <div className="metrics-row">
                        <div className="metric-label">Code</div>
                        <div className="metric-value">{sessionCode}</div>
                    </div>

                    <div className="metrics-row">
                        <div className="metric-label">Local FPS</div>
                        <div className="metric-value">{state.localFps}</div>
                    </div>

                    <div className="metrics-row">
                        <div className="metric-label">Resolution</div>
                        <div className="metric-value">{stats.resolution}</div>
                    </div>

                    <div className="metrics-row">
                        <div className="metric-label">Quality</div>
                        <div className="metric-value">{stats.quality}</div>
                    </div>

                    <div className="metrics-row">
                        <div className="metric-label">Server Ping</div>
                        <div className="metric-value">{state.pingTime ? `${state.pingTime}ms` : '-- ms'}</div>
                    </div>

                    {state.serverStats && (
                        <>
                            <div className="metrics-row">
                                <div className="metric-label">Processing</div>
                                <div className="metric-value">{state.serverStats.processing_ratio}%</div>
                            </div>

                            {state.serverStats.processing_time_ms && (
                                <div className="metrics-row">
                                    <div className="metric-label">Server Time</div>
                                    <div className="metric-value">{state.serverStats.processing_time_ms}ms</div>
                                </div>
                            )}

                            {state.serverStats.dropped_frames && (
                                <div className="metrics-row">
                                    <div className="metric-label">Dropped</div>
                                    <div className="metric-value">
                                        {state.serverStats.dropped_frames.count} frames
                                        {state.serverStats.dropped_frames.reason &&
                                            <span className="drop-reason">({state.serverStats.dropped_frames.reason})</span>
                                        }
                                    </div>
                                </div>
                            )}

                            {state.serverStats.game_timer && (
                                <div className="metrics-row">
                                    <div className="metric-label">Game Timer</div>
                                    <div className="metric-value timer">
                                        {state.serverStats.game_timer.time_text || '--:--'}
                                        {state.serverStats.game_timer.overtime &&
                                            <span className="overtime-badge">OT</span>
                                        }
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="metrics-updated">
                        Last updated: {state.lastUpdate ? new Date(state.lastUpdate).toLocaleTimeString() : 'Never'}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StreamMetrics;