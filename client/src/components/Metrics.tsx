import React from 'react';

interface MetricsProps {
    resolution: string;
    fps: string;
    rtt: string;
    isHighLatency?: boolean;
}

export const Metrics: React.FC<MetricsProps> = ({
    resolution,
    fps,
    rtt,
    isHighLatency = false
}) => (
    <div className="metrics" data-lag={isHighLatency ? 'true' : 'false'}>
        <span>{resolution}</span>
        <span>{fps}</span>
        <span>{rtt}</span>
    </div>
);