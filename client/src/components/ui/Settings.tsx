import React, { useState } from "react";
import { StreamQuality } from "../../types/broadcast";
import QualitySelector from "./QualitySelector";
import "./Settings.css";

// Settings props interface
interface SettingsProps {
    /** Whether settings panel is open */
    isOpen: boolean;
    /** Handler for panel close */
    onClose: () => void;
    /** Current stream quality */
    quality: StreamQuality;
    /** Handler for quality change */
    onQualityChange: (quality: StreamQuality) => void;
    /** Whether currently connected to stream */
    isConnected: boolean;
    /** Show debug information */
    showDebugInfo?: boolean;
    /** Additional CSS class */
    className?: string;
}

/**
 * Settings component for adjusting stream options
 */
export const Settings: React.FC<SettingsProps> = ({
    isOpen,
    onClose,
    quality,
    onQualityChange,
    isConnected,
    showDebugInfo = false,
    className = "",
}) => {
    // Local state for settings tabs
    const [activeTab, setActiveTab] = useState<"quality" | "connection" | "about">(
        "quality"
    );

    // If not open, don't render
    if (!isOpen) {
        return null;
    }

    return (
        <div className={`settings-panel ${className}`}>
            <div className="settings-header">
                <h2 className="settings-title">Settings</h2>
                <button className="settings-close" onClick={onClose}>
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path
                            d="M18 6L6 18M6 6l12 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>

            <div className="settings-tabs">
                <button
                    className={`settings-tab ${activeTab === "quality" ? "active" : ""}`}
                    onClick={() => setActiveTab("quality")}
                >
                    Quality
                </button>
                <button
                    className={`settings-tab ${activeTab === "connection" ? "active" : ""}`}
                    onClick={() => setActiveTab("connection")}
                >
                    Connection
                </button>
                <button
                    className={`settings-tab ${activeTab === "about" ? "active" : ""}`}
                    onClick={() => setActiveTab("about")}
                >
                    About
                </button>
            </div>

            <div className="settings-content">
                {activeTab === "quality" && (
                    <div className="settings-section">
                        <QualitySelector
                            currentQuality={quality}
                            onChange={onQualityChange}
                            isConnected={isConnected}
                        />
                    </div>
                )}

                {activeTab === "connection" && (
                    <div className="settings-section">
                        <h3 className="settings-subtitle">Connection Settings</h3>
                        <p className="settings-description">
                            Configure advanced connection settings for the broadcast.
                        </p>

                        <div className="settings-option">
                            <label>
                                <input type="checkbox" checked={true} readOnly />
                                <span>Auto-reconnect on disconnect</span>
                            </label>
                        </div>

                        <div className="settings-option">
                            <label>
                                <input type="checkbox" checked={true} readOnly />
                                <span>Low-latency mode</span>
                            </label>
                        </div>

                        {showDebugInfo && (
                            <div className="debug-info">
                                <h4>Debug Information</h4>
                                <pre>{JSON.stringify({ quality, isConnected }, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "about" && (
                    <div className="settings-section">
                        <h3 className="settings-subtitle">About Royal Trainer</h3>
                        <p className="settings-description">
                            Royal Trainer is your real-time coach for Clash Royale. Stream your gameplay
                            directly to your trainer for instant feedback and strategies.
                        </p>
                        <p className="settings-version">Version 1.0.0</p>
                        <div className="settings-credits">
                            <p>Created by ElMelz</p>
                            <p>© 2025 All Rights Reserved</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;