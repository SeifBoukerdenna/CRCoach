import React from 'react';

interface MetricsProps {
    resolution: string;
    fps: string;
    rtt: string;
}

export const Metrics: React.FC<MetricsProps> = ({ resolution, fps, rtt }) => (
    <div className="metrics">
        <span>{resolution}</span>
        <span>{fps}</span>
        <span>{rtt}</span>
    </div>
);