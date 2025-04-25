import React, { useEffect, useState } from "react";
import { ConnectionStatus } from "../types/webrtc";


/* ── timer component ──────────────────── */
const TimerImpl: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
    const [secs, setSecs] = useState(0);

    useEffect(() => {
        if (status !== "connected") {
            setSecs(0);
            return;
        }
        const id = setInterval(() => setSecs((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [status]);

    const h = String(Math.floor(secs / 3600)).padStart(2, "0");
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return <>{`${h}:${m}:${s}`}</>;
};

/* ── main component ───────────────── */
interface ConnectButtonsProps {
    status: ConnectionStatus;
    onConnect: () => void;
    connecting: boolean;
    codeReady: boolean;
}

// Create a component with a Timer property
const ConnectButtonComponent: React.FC<ConnectButtonsProps> & {
    Timer: React.FC<{ status: ConnectionStatus }>
} = ({ status, onConnect, connecting, codeReady }) => {
    return (
        <button
            className={`connect-btn ${status === "connected" ? "connected" : ""}`}
            disabled={connecting || status === "invalid" || (!codeReady && status !== "connected")}
            onClick={onConnect}
        >
            {connecting ? (
                <>
                    Connecting...
                </>
            ) : status === "connected" ? (
                "Stop Connection"
            ) : status === "invalid" ? (
                "Invalid Code"
            ) : (
                "Connect"
            )}
        </button>
    );
};

// Add the Timer property to the component
ConnectButtonComponent.Timer = TimerImpl;

// Export the component
export const Controls = ConnectButtonComponent;