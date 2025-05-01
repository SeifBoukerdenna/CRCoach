import React from 'react';
import { useBroadcast } from '../../../context/BroadcastContext';
import { ShieldIcon } from '../../../assets/icons';
import { useSettings } from '../../../context/SettingsContext';
import BroadcastControls from '../broadcast/BroadcastControls';
import Metrics from '../Metrics';
import SessionCodeInput from '../SessionCodeInput';
import { useLayoutContext } from '../../../context/LayoutContext';
import CollapseButton from '../../core/CollapseButton';

/**
 * CollapsibleConnectionPanel component with Clash Royale-styled toggle button
 */
export const CollapsibleConnectionPanel: React.FC = () => {
    // Get broadcast context
    const {
        status,
        isConnected,
        isConnecting,
        isCodeValid,
        sessionCode,
        stats,
        setSessionCode,
        connect,
        disconnect,
        reset,
    } = useBroadcast();

    // Get settings context
    const { openSettings } = useSettings();

    // Get layout context
    const { isRightCollapsed, setIsRightCollapsed } = useLayoutContext();

    // Function to toggle expanded/collapsed state
    const togglePanel = () => {
        setIsRightCollapsed(!isRightCollapsed);
    };

    // Function to handle connect/disconnect
    const handleConnectClick = async () => {
        if (isConnected) {
            disconnect();
        } else {
            if (status === "invalid") {
                reset();
            }
            await connect();
        }
    };

    // Handle session code change
    const handleCodeChange = (code: string) => {
        if (status === "invalid") {
            reset();
        }
        setSessionCode(code);
    };

    return (
        <section className={`cr-column cr-controls-column ${isRightCollapsed ? 'collapsed' : ''}`}>
            <div className="cr-column-header">
                <div className="cr-column-title">
                    <ShieldIcon width={24} height={24} className="cr-title-icon" />
                    {!isRightCollapsed && <h2>CONNECTION</h2>}
                </div>

                {/* Stylized Clash Royale Toggle Button */}
                <CollapseButton
                    isCollapsed={isRightCollapsed}
                    onClick={togglePanel}
                    label="connection"
                />
            </div>

            {isRightCollapsed ? (
                <div className="collapsed-controls">
                    {/* Live status indicator */}
                    <div
                        className={`status-indicator ${isConnected ? 'live' : 'offline'}`}
                        role="status"
                        aria-label={isConnected ? "Live connection" : "Offline"}
                    >
                        {isConnected ? 'LIVE' : 'OFF'}
                    </div>

                    {/* Connect/disconnect button */}
                    <button
                        className={`icon-button ${isConnected ? 'connected' : ''}`}
                        onClick={handleConnectClick}
                        disabled={isConnecting || status === "invalid" || (!isCodeValid && status !== "connected")}
                        aria-label={isConnected ? "Stop connection" : "Start connection"}
                    >
                        {isConnecting ? (
                            <span className="mini-loader" aria-hidden="true" />
                        ) : isConnected ? (
                            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                                <rect x="6" y="6" width="12" height="12" rx="1" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                        )}
                    </button>

                    {/* Settings button */}
                    <button
                        className="icon-button settings-btn"
                        onClick={openSettings}
                        aria-label="Open settings"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                        </svg>
                    </button>
                </div>
            ) : (
                <div id="connection-panel-content" className="cr-controls-content">
                    {/* Status indicator (LIVE or OFFLINE) */}
                    <div className="cr-pills">
                        <span className={`cr-pill ${isConnected ? "cr-pill-live" : "cr-pill-off"}`}>
                            {isConnected ? "LIVE" : "OFFLINE"}
                        </span>
                    </div>

                    {/* Session code label */}
                    <div className="cr-code-label">SESSION CODE</div>

                    {/* Session code input or display */}
                    <SessionCodeInput
                        isConnected={isConnected}
                        initialCode={sessionCode}
                        onChange={(code) => handleCodeChange(code)}
                    />

                    {/* Connect/Disconnect button */}
                    <BroadcastControls
                        status={status}
                        connecting={isConnecting}
                        codeReady={isCodeValid}
                        onConnect={handleConnectClick}
                    />

                    {/* Metrics display */}
                    <Metrics
                        resolution={stats.resolution}
                        fps={stats.fps}
                        rtt={stats.rtt}
                        quality={stats.quality}
                    />

                    {/* Settings button */}
                    <button
                        className="cr-settings-button"
                        onClick={openSettings}
                        title="Open Settings"
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                            <path d="M12 15.5c1.93 0 3.5-1.57 3.5-3.5S13.93 8.5 12 8.5 8.5 10.07 8.5 12s1.57 3.5 3.5 3.5zm0-5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z" />
                            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                        </svg>
                    </button>
                </div>
            )}
        </section>
    );
};

export default CollapsibleConnectionPanel;