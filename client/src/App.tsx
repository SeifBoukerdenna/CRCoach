import React, { useEffect, useState } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { Controls } from "./components/Controls";
import { Metrics } from "./components/Metrics";
import { VideoPlayer } from "./components/VideoPlayer";
import { ConnectionStatus } from "./types/webrtc";
import "./App.css";

/* ---- SVG Assets (inline) ---------------------------------- */
export const ClashRoyaleCrown: React.FC = () => (
  <svg className="crown-icon" viewBox="0 0 320 320" fill="#ffc907">
    <path d="M160 48c-8.8 0-16 7.2-16 16s7.2 16 16 16 16-7.2 16-16-7.2-16-16-16zM43.2 120c-4.9 0-9.2 2.2-12 6-4.6 6-3.5 14.7 2.5 19.3l70 53.3c3.9 3 9.1 3.8 13.8 2s8.3-6.3 9-11.3l16-112c-18-16-62.3 42.7-99.3 42.7zM160 72c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24zM276.8 120c-37 0-81.3-58.7-99.3-42.7l16 112c.7 5 4.3 9.5 9 11.3s9.9 1 13.8-2l70-53.3c6-4.6 7.1-13.3 2.5-19.3-2.8-3.8-7.1-6-12-6zM32 168c-8.8 0-16 7.2-16 16s7.2 16 16 16h9l20 96H259l20-96h9c8.8 0 16-7.2 16-16s-7.2-16-16-16h-9l-27 24h-36l-27-24h-72l-27 24H54l-27-24h-9z" />
  </svg>
);

export const App: React.FC = () => {
  const {
    status,
    resolution,
    rtt,
    fps,
    quality,
    connect,
    reset,
    videoElement,
    disconnect,
  } = useWebRTC();

  const [code, setCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [prevStatus, setPrevStatus] = useState<ConnectionStatus>(status);

  const codeReady = code.length === 4;
  const isConnected = status === "connected";

  /* ------------- effects ----------------------------------- */
  useEffect(() => {
    if (prevStatus === "connected" && status === "disconnected") setCode("");
    setPrevStatus(status);
  }, [prevStatus, status]);

  /* ------------- handlers ---------------------------------- */
  const handleInput = (raw: string) => {
    const cleaned = raw.replace(/\D/g, "").slice(0, 4);
    if (status === "invalid") reset();
    setCode(cleaned);
  };

  const handleConnect = async () => {
    if (isConnected) {
      disconnect();
      return;
    }
    if (!codeReady) return;

    setConnecting(true);
    try {
      await connect(code);
    } finally {
      setConnecting(false);
    }
  };

  /* ------------- render ------------------------------------ */
  return (
    <main className="layout">
      {/* ---------- video ----------- */}
      <VideoPlayer
        videoRef={videoElement}
        isConnected={isConnected}
        CrownIcon={ClashRoyaleCrown}
      />

      {/* ---------- sidebar --------- */}
      <aside className="sidebar card-shell">
        {/* status pills */}
        <div className="pills">
          <span className={`pill ${isConnected ? "pill-live" : "pill-off"}`}>
            {isConnected ? "LIVE" : "OFFLINE"}
          </span>
          <span className="pill pill-timer">
            <Controls.Timer status={status} />
          </span>
        </div>

        {/* session code */}
        <div className="code-label">SESSION&nbsp;CODE</div>

        {isConnected ? (
          <div className="code-display">{code}</div>
        ) : (
          <div className="code-slot-wrapper">
            {Array.from({ length: 4 }).map((_, i) => (
              <input
                key={i}
                className="code-slot"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={code[i] || ""}
                onChange={(e) => {
                  const val = e.target.value.slice(-1); // last char typed
                  const newCode =
                    code.slice(0, i) + val + code.slice(i + 1, 4);
                  handleInput(newCode);
                  // auto-focus next slot
                  if (val && i < 3) {
                    const next =
                      e.currentTarget.parentElement?.children[
                      i + 1
                      ] as HTMLInputElement;
                    next?.focus();
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* connect / stop */}
        <Controls
          status={status}
          onConnect={handleConnect}
          connecting={connecting}
          codeReady={codeReady}
        />

        {/* metrics */}
        <Metrics
          resolution={resolution}
          fps={fps}
          rtt={rtt}
          quality={quality}
        />
      </aside>
    </main>
  );
};
