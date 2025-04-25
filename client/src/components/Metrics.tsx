import React, { JSX } from 'react';
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
    // Get appropriate Clash Royale style icon for each quality level
    const getQualityIcon = (q: StreamQuality): JSX.Element => {
        switch (q) {
            case 'low':
                return (
                    <span className="cr-icon lightning" role="img" aria-label="Fast">
                        <svg viewBox="0 0 320 512" height="14" width="14" fill="currentColor">
                            <path d="M296 160H180.6l42.6-129.8C227.2 15 215.7 0 200 0H56C44 0 33.8 8.9 32.2 20.8l-32 240C-1.7 275.2 9.5 288 24 288h118.7L96.6 482.5c-3.6 15.2 8 29.5 23.3 29.5 8.4 0 16.4-4.4 20.8-12l176-304c9.3-15.9-2.2-36-20.7-36z" />
                        </svg>
                    </span>
                );
            case 'high':
                return (
                    <span className="cr-icon crown" role="img" aria-label="High Quality">
                        <svg viewBox="0 0 640 512" height="14" width="14" fill="currentColor">
                            <path d="M528 448H112c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h416c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zm64-320c-26.5 0-48 21.5-48 48 0 7.1 1.6 13.7 4.4 19.8L476 239.2c-15.4 9.2-35.3 4-44.2-11.6L350.3 85C361 76.2 368 63 368 48c0-26.5-21.5-48-48-48s-48 21.5-48 48c0 15 7 28.2 17.7 37l-81.5 142.6c-8.9 15.6-28.9 20.8-44.2 11.6l-72.3-43.4c2.7-6 4.4-12.7 4.4-19.8 0-26.5-21.5-48-48-48S0 149.5 0 176s21.5 48 48 48c2.6 0 5.2-.2 7.7-.6l74.9 136.2c1.4 2.6 3.1 5 4.9 7.4-3.7 2.3-7.1 5-10.2 8.2-10 10-16.4 22-19.8 34.5-.5 2.3-.9 4.7-1.3 7.1-.2 1.3-.4 2.3-.5 3-1 6.6 4.2 10.2 10.2 10.2h240c6 0 11.2-3.6 10.2-10.2-.1-.8-.3-1.7-.5-3-.3-2.4-.8-4.8-1.3-7.1-3.4-12.5-9.8-24.5-19.8-34.5-3.1-3.1-6.5-5.9-10.2-8.2 1.9-2.5 3.5-4.9 4.9-7.4l74.9-136.2c2.5.4 5.1.6 7.7.6 26.5 0 48-21.5 48-48 0-26.5-21.5-48-48-48z" />
                        </svg>
                    </span>
                );
            default: // medium
                return (
                    <span className="cr-icon balance" role="img" aria-label="Balanced">
                        <svg viewBox="0 0 640 512" height="14" width="14" fill="currentColor">
                            <path d="M256 336h-.02c0-16.18 1.34-8.73-85.05-181.51-17.65-35.29-68.19-35.36-85.87 0C-2.06 328.75.02 320.33.02 336H0c0 44.18 57.31 80 128 80s128-35.82 128-80zM128 176l72 144H56l72-144zm511.98 160c0-16.18 1.34-8.73-85.05-181.51-17.65-35.29-68.19-35.36-85.87 0-87.12 174.26-85.04 165.84-85.04 181.51H384c0 44.18 57.31 80 128 80s128-35.82 128-80h-.02zM440 320l72-144 72 144H440z" />
                        </svg>
                    </span>
                );
        }
    };

    // Format resolution display to be Clash Royale-like
    const formatResolution = (res: string): string => {
        // If it's the default "—×—", return it
        if (res === "—×—") return res;

        // Otherwise, format it as Clash Royale would
        return res.replace("×", "×");
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
            {/* Resolution display with Clash Royale styling */}
            <span className="metric-item res">
                {formatResolution(resolution)}
            </span>

            {/* FPS display with Clash Royale styling */}
            <span className="metric-item fps">
                {fps}
            </span>

            {/* Ping/RTT display with Clash Royale styling */}
            <span className="metric-item rtt">
                {rtt}
            </span>

            {/* Quality display with Clash Royale styling */}
            <span className={`metric-item quality ${getQualityColorClass(quality)}`}>
                {getQualityIcon(quality)} {quality.charAt(0).toUpperCase() + quality.slice(1)}
            </span>
        </div>
    );
};