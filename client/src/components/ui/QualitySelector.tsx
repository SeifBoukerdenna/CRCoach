import React from "react";
import { StreamQuality } from "../../types/broadcast";
import { formatQualityLabel } from "../../utils/formatters";
import "./QualitySelector.css";

// Quality option interface
interface QualityOption {
    value: StreamQuality;
    label: string;
    description: string;
}

// Quality options data
const qualityOptions: QualityOption[] = [
    {
        value: "low",
        label: "Low",
        description: "Ultra-low latency (10-20ms), minimal bandwidth",
    },
    {
        value: "medium",
        label: "Medium",
        description: "Balanced quality (15-30ms), clear gameplay",
    },
    {
        value: "high",
        label: "High",
        description: "Maximum clarity (25-40ms), best visuals",
    },
];

// Component props
interface QualitySelectorProps {
    /** Current quality setting */
    currentQuality: StreamQuality;
    /** Handler for quality change */
    onChange: (quality: StreamQuality) => void;
    /** Whether currently connected to stream */
    isConnected: boolean;
    /** Additional CSS class */
    className?: string;
}

/**
 * QualitySelector component allows users to choose streaming quality
 */
export const QualitySelector: React.FC<QualitySelectorProps> = ({
    currentQuality,
    onChange,
    isConnected,
    className = "",
}) => {
    return (
        <div className={`quality-selector ${className}`}>
            <div className="quality-heading">
                <span>Stream Quality</span>
                <div className="quality-pip" data-quality={currentQuality}></div>
            </div>

            <div className="quality-options">
                {qualityOptions.map((option) => (
                    <button
                        key={option.value}
                        className={`quality-option ${currentQuality === option.value ? "active" : ""
                            }`}
                        onClick={() => onChange(option.value)}
                        disabled={!isConnected}
                    >
                        <div className="option-header">
                            <span className="option-label">{formatQualityLabel(option.value)}</span>
                            {currentQuality === option.value && (
                                <span className="current-badge">Current</span>
                            )}
                        </div>
                        <p className="option-description">{option.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QualitySelector;