import React from "react";
import { ConnectionStatus } from "../../../types/broadcast";
import "./BroadcastControls.css";

interface BroadcastControlsProps {
    /** Current connection status */
    status: ConnectionStatus;
    /** Whether a connection attempt is in progress */
    connecting?: boolean;
    /** Whether the session code is ready/valid */
    codeReady?: boolean;
    /** Handler for connect/disconnect button click */
    onConnect: () => void;
    /** Additional CSS class */
    className?: string;
}

/**
 * Clash Royale styled broadcast controls button
 */
export const BroadcastControls: React.FC<BroadcastControlsProps> = ({
    status,
    connecting = false,
    codeReady = false,
    onConnect,
    className = "",
}) => {
    // Determine if button should be disabled
    const isDisabled =
        connecting || status === "invalid" || (!codeReady && status !== "connected");

    // Determine button text based on state
    const getButtonText = () => {
        if (connecting) return "Connecting...";
        if (status === "connected") return "Stop Connection";
        if (status === "invalid") return "Invalid Code";
        return "Connect";
    };

    // Button classes
    const buttonClasses = [
        "cr-connect-btn",
        status === "connected" ? "connected" : "",
        connecting ? "connecting" : "",
        className,
    ].filter(Boolean).join(" ");

    return (
        <button
            className={buttonClasses}
            disabled={isDisabled}
            onClick={onConnect}
            aria-label={getButtonText()}
        >
            {connecting ? (
                <div className="cr-loader-container">
                    <span className="cr-button-loader" />
                    <span>{getButtonText()}</span>
                </div>
            ) : (
                <>
                    <div className="cr-button-glow"></div>
                    <div className="cr-button-content">
                        {status === "connected" ? (
                            <svg viewBox="0 0 24 24" width="24" height="24" className="cr-button-icon">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="24" height="24" className="cr-button-icon">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                        <span className="cr-button-text">{getButtonText()}</span>
                    </div>
                </>
            )}
        </button>
    );
};

export default BroadcastControls;