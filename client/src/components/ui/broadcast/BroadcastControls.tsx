import React from "react";
import { ConnectionStatus } from "../../../types/broadcast";
import useTimer from "../../../hooks/useTimer";

// Timer subcomponent
interface TimerProps {
    /** Connection status */
    status: ConnectionStatus;
    /** Initial time in seconds */
    initialSeconds?: number;
}

export const Timer: React.FC<TimerProps> = ({ status, initialSeconds = 0 }) => {
    const { formattedTime } = useTimer({
        initialSeconds,
        autoStart: status === "connected",
        onTick: undefined,
    });

    return <>{formattedTime}</>;
};

// Main controls component
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

// Extended type for the component with Timer property
interface BroadcastControlsComponent
    extends React.FC<BroadcastControlsProps> {
    Timer: React.FC<TimerProps>;
}

/**
 * BroadcastControls component provides connection controls and timer
 */
const BroadcastControls: BroadcastControlsComponent = ({
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

    return (
        <button
            className={`connect-btn ${status === "connected" ? "connected" : ""} ${className}`}
            disabled={isDisabled}
            onClick={onConnect}
        >
            {connecting && <span className="cr-loader" />}
            {getButtonText()}
        </button>
    );
};

// Attach Timer as a property of the component
BroadcastControls.Timer = Timer;

export default BroadcastControls;