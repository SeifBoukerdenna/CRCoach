import React, { useEffect, useState } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { Controls } from "./components/Controls";
import { Metrics } from "./components/Metrics";
import { VideoPlayer } from "./components/VideoPlayer";
import { ConnectionStatus } from "./types/webrtc";
import "./App.css";

/* ---- SVG Assets (inline) ---------------------------------- */
/* ---------------------------------------------------------------
   SUPER-CELL CROWN  (bold outline, inner bevel, subtle shine)
----------------------------------------------------------------*/
export const ClashRoyaleCrown: React.FC = () => (
  <svg
    className="crown-icon"
    viewBox="0 0 256 256"
    width="96"
    height="96"
  >
    <defs>
      {/* gold bevel */}
      <linearGradient id="crownFill" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffd750" />
        <stop offset="45%" stopColor="#ffc107" />
        <stop offset="100%" stopColor="#e3a600" />
      </linearGradient>
      {/* top shine */}
      <linearGradient id="crownHighlight" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="rgba(255,255,255,.7)" />
        <stop offset="0.4" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>

    {/* chunky outline */}
    <path
      d="M28 88 L78 148 L128 40 L178 148 L228 88 L228 200 L28 200 Z"
      fill="url(#crownFill)"
      stroke="#000"
      strokeWidth="10"
      strokeLinejoin="round"
    />
  </svg>
);

/* ---------------------------------------------------------------
   ELIXIR DROP  (glossy gradient + sparkle)
----------------------------------------------------------------*/
/* === CR-style ELIXIR DROP ==================================== */
export const ElixirLoader: React.FC = () => (
  <div className="elixir-loader">
    <svg viewBox="0 0 90 140" width="66" height="100">
      <defs>
        {/* main purple gradient */}
        <linearGradient id="elxMain" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d09bff" />
          <stop offset="45%" stopColor="#b066ff" />
          <stop offset="100%" stopColor="#7a3df7" />
        </linearGradient>
        {/* faint rim light on the left */}
        <linearGradient id="rim" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,.65)" />
          <stop offset=".35" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* OUTLINE (black, thick) */}
      <path
        d="M45 5
           Q78 43 78 88
           Q78 123 45 133
           Q12 123 12 88
           Q12 43 45 5 Z"
        fill="#000"
      />
      {/* MAIN FILL */}
      <path
        d="M45 12
           Q70 46 70 87
           Q70 116 45 124
           Q20 116 20 87
           Q20 46 45 12 Z"
        fill="url(#elxMain)"
      />
      {/* GLOSSY TOP */}
      <path
        d="M45 15
           Q62 42 56 60
           Q45 53 34 62
           Q30 45 45 15 Z"
        fill="rgba(255,255,255,.55)"
        filter="url(#blur1)"
      />
      {/* RIM LIGHT */}
      <path
        d="M23 46
           Q45 12 45 12"
        stroke="url(#rim)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />

      <filter id="blur1"><feGaussianBlur stdDeviation="1.5" /></filter>
    </svg>
  </div>
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

                /* ── handle typing ───────────────────────── */
                onChange={(e) => {
                  const val = e.target.value.slice(-1);               // last char typed
                  const newCode = code.slice(0, i) + val + code.slice(i + 1, 4);
                  handleInput(newCode);

                  // auto-advance to next slot
                  if (val && i < 3) {
                    const next = e.currentTarget.parentElement?.children[i + 1] as HTMLInputElement;
                    next?.focus();
                  }
                }}

                /* ── handle BACKSPACE delete ─────────────── */
                onKeyDown={(e) => {
                  if (e.key !== "Backspace") return;

                  // if current slot has content, simply clear it
                  if (code[i]) {
                    const newCode = code.slice(0, i) + "" + code.slice(i + 1);
                    handleInput(newCode);
                    return;                                           // stay on this slot
                  }

                  // if empty & not first slot → jump to previous and clear it
                  if (i > 0) {
                    const prevInput = (e.currentTarget.parentElement?.children[i - 1]) as HTMLInputElement;
                    prevInput?.focus();

                    const newCode = code.slice(0, i - 1) + "" + code.slice(i);
                    handleInput(newCode);
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
