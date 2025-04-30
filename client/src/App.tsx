import React from "react";
import { BroadcastProvider, useBroadcast } from "./context/BroadcastContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import VideoPlayer from "./components/ui/VideoPlayer";
import BroadcastControls from "./components/ui/BroadcastControls";
import SessionCodeInput from "./components/ui/SessionCodeInput";
import Metrics from "./components/ui/Metrics";
import Settings from "./components/ui/Settings";
import FeedbackPanel from "./components/ui/FeedbackPanel";
import {
  ClashRoyaleCrown,
  ElixirLoader,
} from "./assets/icons";
import "./styles/App.css";

/**
 * Main application content component
 */
const AppContent: React.FC = () => {
  // Get broadcast context
  const {
    status,
    isConnected,
    isConnecting,
    isCodeValid,
    sessionCode,
    stats,
    videoRef,
    setSessionCode,
    connect,
    disconnect,
    reset,
  } = useBroadcast();

  // Get settings context
  const {
    quality,
    setQuality,
    isSettingsOpen,
    openSettings,
    closeSettings,
  } = useSettings();

  // Handle connect/disconnect button click
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
    <main className="cr-layout">
      {/* Left Column - Feedback Panel */}
      <section className="cr-column cr-feedback-column">
        <div className="cr-column-header">
          <div className="cr-column-title">
            <h2>TRAINER FEEDBACK</h2>
          </div>
        </div>
        <FeedbackPanel isConnected={isConnected} />
      </section>

      {/* Middle Column - Video Player */}
      <section className="cr-column cr-video-column">
        <div className="cr-column-header">
          <div className="cr-column-title">
            <h2>BATTLE VIEW</h2>
          </div>
        </div>
        <VideoPlayer
          videoRef={videoRef}
          isConnected={isConnected}
          CrownIcon={ClashRoyaleCrown}
          LoadingIcon={ElixirLoader}
        />
      </section>

      {/* Right Column - Controls */}
      <section className="cr-column cr-controls-column">
        <div className="cr-column-header">
          <div className="cr-column-title">
            {/* <img src="/assets/shield-icon.png" alt="" className="cr-title-icon" /> */}
            <h2>CONNECTION</h2>
          </div>
        </div>

        <div className="cr-controls-content">
          {/* Status indicators */}
          <div className="cr-pills">
            <span className={`cr-pill ${isConnected ? "cr-pill-live" : "cr-pill-off"}`}>
              {isConnected ? "LIVE" : "OFFLINE"}
            </span>
            <span className="cr-pill cr-pill-timer">
              <BroadcastControls.Timer status={status} />
            </span>
          </div>

          {/* Session code label */}
          <div className="cr-code-label">SESSION CODE</div>

          {/* Session code input */}
          <SessionCodeInput
            isConnected={isConnected}
            initialCode={sessionCode}
            onChange={(code) => handleCodeChange(code)}
          />

          {/* Quality selector button (before broadcast) */}
          {!isConnected && (
            <button
              className="cr-quality-button"
              onClick={openSettings}
              title="Stream Quality Settings"
            >
              <div className="cr-quality-pip" data-quality={quality}></div>
              <span>Quality: {quality.charAt(0).toUpperCase() + quality.slice(1)}</span>
              <i className="cr-chevron-right"></i>
            </button>
          )}

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
      </section>

      {/* Settings modal */}
      <Settings
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        quality={quality}
        onQualityChange={setQuality}
        isConnected={isConnected}
      />
    </main>
  );
};

/**
 * Main App component with providers
 */
export const App: React.FC = () => {
  return (
    <SettingsProvider>
      <BroadcastProvider>
        <AppContent />
      </BroadcastProvider>
    </SettingsProvider>
  );
};

export default App;