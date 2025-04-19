import React from 'react';
import { useDetectionEvents } from '../hooks/useDetectionEvents';
import './DetectionEvents.css';

interface DetectionEventsProps {
    sessionCode: string;
    isConnected: boolean;
}

export const DetectionEvents: React.FC<DetectionEventsProps> = ({
    sessionCode,
    isConnected
}) => {
    const { currentEvent, isActive, clearEvent } = useDetectionEvents(sessionCode, isConnected);

    if (!isActive || !currentEvent) {
        return null;
    }

    // Determine icon and styles based on event type
    let icon = "🔍"; // Default icon
    if (currentEvent.type === 'supercell_logo') {
        icon = "⭐"; // Star icon for Supercell logo
    }

    return (
        <div className="detection-event" data-event-type={currentEvent.type}>
            <div className="event-icon">
                <span className="event-icon-symbol">{icon}</span>
                <span className="event-pulse"></span>
            </div>
            <div className="event-content">
                <h3 className="event-title">
                    {currentEvent.type === 'supercell_logo'
                        ? 'Supercell Logo Detected!'
                        : 'Event Detected'}
                </h3>
                <p className="event-timestamp">
                    {new Date(currentEvent.timestamp * 1000).toLocaleTimeString()}
                </p>
            </div>
            <button className="event-close" onClick={clearEvent}>×</button>
        </div>
    );
};