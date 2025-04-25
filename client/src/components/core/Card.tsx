import React from 'react';
import './Card.css';

/**
 * Props for the Card component
 */
export interface CardProps {
    /** Card title */
    title?: React.ReactNode;
    /** Card subtitle */
    subtitle?: React.ReactNode;
    /** Card content */
    children: React.ReactNode;
    /** Whether to display the card shell with bolts and border */
    shell?: boolean;
    /** Whether to add the gold border */
    goldBorder?: boolean;
    /** Whether to add inner padding */
    padding?: boolean;
    /** Additional CSS class */
    className?: string;
    /** Custom header component */
    header?: React.ReactNode;
    /** Footer content */
    footer?: React.ReactNode;
}

/**
 * Card component following the Clash Royale design
 */
export const Card: React.FC<CardProps> = ({
    title,
    subtitle,
    children,
    shell = true,
    goldBorder = true,
    padding = true,
    className = '',
    header,
    footer,
}) => {
    // Build class names
    const cardClasses = [
        'cr-card',
        shell ? 'cr-card-shell' : '',
        goldBorder ? 'cr-card-gold-border' : '',
        padding ? 'cr-card-padding' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={cardClasses}>
            {/* Header - either custom or title/subtitle */}
            {(header || title || subtitle) && (
                <div className="cr-card-header">
                    {header || (
                        <>
                            {title && <div className="cr-card-title">{title}</div>}
                            {subtitle && <div className="cr-card-subtitle">{subtitle}</div>}
                        </>
                    )}
                </div>
            )}

            {/* Main content */}
            <div className="cr-card-content">{children}</div>

            {/* Optional footer */}
            {footer && <div className="cr-card-footer">{footer}</div>}
        </div>
    );
};

export default Card;