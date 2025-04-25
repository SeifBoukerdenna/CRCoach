import React, { ButtonHTMLAttributes } from 'react';
import './Button.css';

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'gold';

/**
 * Button size types
 */
export type ButtonSize = 'small' | 'medium' | 'large';

/**
 * Props for the Button component
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Button variant/style */
    variant?: ButtonVariant;
    /** Button size */
    size?: ButtonSize;
    /** Whether the button is currently active */
    active?: boolean;
    /** Whether the button is in a loading state */
    loading?: boolean;
    /** Whether the button is full width */
    fullWidth?: boolean;
    /** Icon to display before the button text */
    startIcon?: React.ReactNode;
    /** Icon to display after the button text */
    endIcon?: React.ReactNode;
    /** Additional CSS class */
    className?: string;
}

/**
 * Button component styled for the Clash Royale theme
 */
export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'medium',
    active = false,
    loading = false,
    fullWidth = false,
    startIcon,
    endIcon,
    className = '',
    children,
    disabled,
    ...props
}) => {
    // Combine class names
    const buttonClasses = [
        'cr-button',
        `cr-button-${variant}`,
        `cr-button-${size}`,
        active ? 'cr-button-active' : '',
        loading ? 'cr-button-loading' : '',
        fullWidth ? 'cr-button-full-width' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            className={buttonClasses}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <span className="cr-button-loader" />}

            {startIcon && !loading && (
                <span className="cr-button-start-icon">{startIcon}</span>
            )}

            <span className="cr-button-text">{children}</span>

            {endIcon && !loading && (
                <span className="cr-button-end-icon">{endIcon}</span>
            )}
        </button>
    );
};

export default Button;