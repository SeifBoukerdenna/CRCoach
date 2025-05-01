import React, { JSX } from "react";
import { Feedback } from "./FeedbackPanel";
import "./FeedbackItem.css";

interface FeedbackItemProps {
    feedback: Feedback;
}

/**
 * Gets the appropriate icon for the feedback type
 */
const getFeedbackTypeIcon = (type: Feedback['type']): JSX.Element => {
    switch (type) {
        case 'elixir':
            return (
                <svg viewBox="0 0 90 140" className="cr-feedback-icon cr-feedback-icon-elixir">
                    <defs>
                        <linearGradient id="elxMain" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#d09bff" />
                            <stop offset="45%" stopColor="#b066ff" />
                            <stop offset="100%" stopColor="#7a3df7" />
                        </linearGradient>
                        <linearGradient id="rim" x1="0" x2="1" y1="0" y2="0">
                            <stop offset="0" stopColor="rgba(255,255,255,.65)" />
                            <stop offset=".35" stopColor="rgba(255,255,255,0)" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M45 5 Q78 43 78 88 Q78 123 45 133 Q12 123 12 88 Q12 43 45 5 Z"
                        fill="#000"
                    />
                    <path
                        d="M45 12 Q70 46 70 87 Q70 116 45 124 Q20 116 20 87 Q20 46 45 12 Z"
                        fill="url(#elxMain)"
                    />
                    <path
                        d="M45 15 Q62 42 56 60 Q45 53 34 62 Q30 45 45 15 Z"
                        fill="rgba(255,255,255,.55)"
                    />
                    <path
                        d="M23 46 Q45 12 45 12"
                        stroke="url(#rim)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="none"
                    />
                </svg>
            );
        case 'card':
            return (
                <svg viewBox="0 0 24 24" className="cr-feedback-icon cr-feedback-icon-card">
                    <rect x="2" y="2" width="20" height="20" rx="2" fill="#3498db" stroke="#2980b9" strokeWidth="2" />
                    <rect x="5" y="5" width="14" height="14" rx="1" fill="#f1c40f" stroke="#f39c12" strokeWidth="1" />
                    <path d="M12 8L15 12L12 16L9 12L12 8Z" fill="#e74c3c" stroke="#c0392b" strokeWidth="1" />
                </svg>
            );
        case 'placement':
            return (
                <svg viewBox="0 0 24 24" className="cr-feedback-icon cr-feedback-icon-placement">
                    <circle cx="12" cy="12" r="10" fill="#27ae60" stroke="#2ecc71" strokeWidth="2" fillOpacity="0.6" />
                    <path d="M12 2V22M2 12H22" stroke="#2c3e50" strokeWidth="2" strokeDasharray="2 1" />
                    <circle cx="12" cy="12" r="3" fill="#e74c3c" />
                </svg>
            );
        case 'defense':
            return (
                <svg viewBox="0 0 24 24" className="cr-feedback-icon cr-feedback-icon-defense">
                    <path d="M12 2L3 6v7.5C3 16.64 7.05 21.16 12 22c4.95-.84 9-5.36 9-8.5V6l-9-4z" fill="#3498db" stroke="#2980b9" strokeWidth="1" />
                    <path d="M12 5L6 8v5.5c0 2.21 2.73 5.25 6 5.5 3.27-.25 6-3.29 6-5.5V8l-6-3z" fill="#ecf0f1" stroke="#bdc3c7" strokeWidth="1" />
                </svg>
            );
        case 'attack':
            return (
                <svg viewBox="0 0 24 24" className="cr-feedback-icon cr-feedback-icon-attack">
                    <path d="M14 2L17 8H22L18 13L20 19L14 16L8 19L10 13L6 8H11L14 2Z" fill="#e74c3c" stroke="#c0392b" strokeWidth="1" />
                    <path d="M7 13L2 17M17 13L22 17" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" />
                </svg>
            );
        default: // general
            return (
                <svg viewBox="0 0 24 24" className="cr-feedback-icon cr-feedback-icon-general">
                    <circle cx="12" cy="12" r="10" fill="#9b59b6" stroke="#8e44ad" strokeWidth="1.5" />
                    <path d="M12 8V13H16" fill="none" stroke="#ecf0f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            );
    }
};

/**
 * Gets the appropriate CSS class for the feedback type
 */
const getFeedbackTypeClass = (type: Feedback['type']): string => {
    switch (type) {
        case 'elixir': return 'cr-feedback-elixir';
        case 'card': return 'cr-feedback-card';
        case 'placement': return 'cr-feedback-placement';
        case 'defense': return 'cr-feedback-defense';
        case 'attack': return 'cr-feedback-attack';
        default: return 'cr-feedback-general';
    }
};

/**
 * Formats the timestamp to show only the time
 */
const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * FeedbackItem component displays a single piece of coach feedback
 */
const FeedbackItem: React.FC<FeedbackItemProps> = ({ feedback }) => {
    const typeClass = getFeedbackTypeClass(feedback.type);
    const typeIcon = getFeedbackTypeIcon(feedback.type);
    const time = formatTimestamp(feedback.timestamp);

    return (
        <div className={`cr-feedback-item ${typeClass}`}>
            <div className="cr-feedback-item-header">
                <div className="cr-feedback-item-type">
                    {typeIcon}
                    <span className="cr-feedback-item-type-label">
                        {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)} Tip
                    </span>
                </div>
                <div className="cr-feedback-item-time">{time}</div>
            </div>
            <div className="cr-feedback-item-content">
                {feedback.message}
            </div>
        </div>
    );
};

export default FeedbackItem;