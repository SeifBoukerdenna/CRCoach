import React from 'react';
import './QualitySelector.css'; // Assuming you have a CSS file for styles

export type QualityLevel = 'low' | 'medium' | 'high';

interface QualitySelectorProps {
    currentQuality: QualityLevel;
    onChange: (quality: QualityLevel) => void;
    isConnected: boolean;
}

interface QualityOption {
    value: QualityLevel;
    label: string;
    description: string;
}

const qualityOptions: QualityOption[] = [
    {
        value: 'low',
        label: 'Low',
        description: 'Ultra-low latency (10-20ms), minimal bandwidth'
    },
    {
        value: 'medium',
        label: 'Medium',
        description: 'Balanced quality (15-30ms), clear gameplay'
    },
    {
        value: 'high',
        label: 'High',
        description: 'Maximum clarity (25-40ms), best visuals'
    }
];

export const QualitySelector: React.FC<QualitySelectorProps> = ({
    currentQuality,
    onChange,
    isConnected
}) => {
    return (
        <div className="quality-selector">
            <div className="quality-heading">
                <span>Stream Quality</span>
                <div className="quality-pip" data-quality={currentQuality}></div>
            </div>

            <div className="quality-options">
                {qualityOptions.map((option) => (
                    <button
                        key={option.value}
                        className={`quality-option ${currentQuality === option.value ? 'active' : ''}`}
                        onClick={() => onChange(option.value)}
                        disabled={!isConnected}
                    >
                        <div className="option-header">
                            <span className="option-label">{option.label}</span>
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