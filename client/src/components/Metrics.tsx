import React from 'react';
import { StreamQuality } from '../hooks/useWebRTC';

interface MetricsProps {
    resolution: string;
    fps: string;
    rtt: string;
    quality?: StreamQuality;
    isHighLatency?: boolean;
}

export const Metrics: React.FC<MetricsProps> = ({
    resolution,
    fps,
    rtt,
    quality = 'medium',
    isHighLatency = false
}) => {
    // Get quality label with nice capitalization
    const getQualityLabel = (q: StreamQuality) => {
        switch (q) {
            case 'low': return 'Low';
            case 'high': return 'High';
            default: return 'Med';
        }
    };

    // Get color class based on quality
    const getQualityColorClass = (q: StreamQuality) => {
        switch (q) {
            case 'low': return 'quality-low';
            case 'high': return 'quality-high';
            default: return 'quality-medium';
        }
    };

    return (
        <div className="metrics" data-lag={isHighLatency ? 'true' : 'false'}>
            <span>{resolution}</span>
            <span>{fps}</span>
            <span>{rtt}</span>
            <span className={`quality-pill ${getQualityColorClass(quality)}`}>
                {getQualityLabel(quality)}
            </span>
        </div>
    );
};