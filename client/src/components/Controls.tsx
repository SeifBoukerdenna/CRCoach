import React, { useEffect, useState } from "react";

interface Props {
    status: string;            // from useWebRTC
    onConnect: () => void;
    connecting: boolean;
    codeReady: boolean;
}

/* ── label helper ───────────────────────────── */
const label = (status: string, connecting: boolean) => {
    if (status === "connected") return "Stop Connection";
    if (connecting) return "Connecting…";
    if (status === "invalid") return "Invalid Code";
    return "Connect";
};

/* ── main button component ───────────────────── */
export const Controls: React.FC<Props> & {
    Timer: React.FC<{ status: string }>;
} = ({ status, onConnect, connecting, codeReady }) => (
    <button
        className={`connect-btn ${status}`}
        disabled={
            connecting || status === "invalid" || (!codeReady && status !== "connected")
        }
        onClick={onConnect}
    >
        {label(status, connecting)}
    </button>
);

/* ── nested timer component ──────────────────── */
const TimerImpl: React.FC<{ status: string }> = ({ status }) => {
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

Controls.Timer = TimerImpl;
