import React from 'react';
import './CollapseButton.css';

interface CollapseButtonProps {
    isCollapsed: boolean;
    onClick: () => void;
    label: string;
}

/**
 * Clash Royale-styled collapse/expand button component
 */
export const CollapseButton: React.FC<CollapseButtonProps> = ({
    isCollapsed,
    onClick,
    label
}) => {
    return (
        <button
            className="panel-toggle-btn"
            onClick={onClick}
            aria-label={isCollapsed ? `Expand ${label} panel` : `Collapse ${label} panel`}
            aria-expanded={!isCollapsed}
        >
            <span className="panel-toggle-btn-text">
                {isCollapsed ? "Expand" : "Collapse"}
            </span>
            <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
            >
                {isCollapsed ? (
                    <path d="M6 12l4-4-4-4 1-1 5 5-5 5z" />
                ) : (
                    <path d="M10 12l-4-4 4-4-1-1-5 5 5 5z" />
                )}
            </svg>
            <span className="sr-only">
                {isCollapsed ? `Expand ${label} panel` : `Collapse ${label} panel`}
            </span>
        </button>
    );
};

export default CollapseButton;