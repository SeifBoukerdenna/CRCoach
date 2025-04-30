import React from "react";

/**
 * Clash Royale style crown icon SVG
 */
export const ClashRoyaleCrown: React.FC<{
    width?: number | string;
    height?: number | string;
    className?: string;
}> = ({ width = 96, height = 96, className = "crown-icon" }) => (
    <svg
        className={className}
        viewBox="0 0 256 256"
        width={width}
        height={height}
    >
        <defs>
            {/* gold bevel gradient */}
            <linearGradient id="crownFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffd750" />
                <stop offset="45%" stopColor="#ffc107" />
                <stop offset="100%" stopColor="#e3a600" />
            </linearGradient>
            {/* top shine */}
            <linearGradient id="crownHighlight" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="rgba(255,255,255,.7)" />
                <stop offset="0.4" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
        </defs>

        {/* chunky outline */}
        <path
            d="M28 88 L78 148 L128 40 L178 148 L228 88 L228 200 L28 200 Z"
            fill="url(#crownFill)"
            stroke="#000"
            strokeWidth="10"
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Small crown icon for column headers
 */
export const SmallCrownIcon: React.FC<{
    width?: number | string;
    height?: number | string;
    className?: string;
}> = ({ width = 28, height = 28, className = "small-crown-icon" }) => (
    <svg
        className={className}
        viewBox="0 0 256 256"
        width={width}
        height={height}
    >
        <defs>
            <linearGradient id="smallCrownFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffd750" />
                <stop offset="45%" stopColor="#ffc107" />
                <stop offset="100%" stopColor="#e3a600" />
            </linearGradient>
        </defs>
        <path
            d="M28 88 L78 148 L128 40 L178 148 L228 88 L228 200 L28 200 Z"
            fill="url(#smallCrownFill)"
            stroke="#000"
            strokeWidth="10"
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Sword icon for battle view header
 */
export const SwordIcon: React.FC<{
    width?: number | string;
    height?: number | string;
    className?: string;
}> = ({ width = 28, height = 28, className = "sword-icon" }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        width={width}
        height={height}
    >
        <defs>
            <linearGradient id="swordBlade" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e0e0e0" />
                <stop offset="50%" stopColor="#bdbdbd" />
                <stop offset="100%" stopColor="#9e9e9e" />
            </linearGradient>
            <linearGradient id="swordHilt" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffd54f" />
                <stop offset="100%" stopColor="#ff9800" />
            </linearGradient>
        </defs>

        {/* Blade */}
        <path
            d="M14.5 2L6 10.5 7.5 12 15.5 4 14.5 2Z"
            fill="url(#swordBlade)"
            stroke="#424242"
            strokeWidth="0.5"
        />

        {/* Hilt */}
        <rect x="5" y="10.5" width="3" height="1.5" fill="url(#swordHilt)" stroke="#424242" strokeWidth="0.5" />
        <rect x="4" y="12" width="5" height="2" fill="url(#swordHilt)" stroke="#424242" strokeWidth="0.5" />

        {/* Shine effect */}
        <path d="M14 3L7 10" stroke="white" strokeWidth="0.5" strokeOpacity="0.7" />
    </svg>
);

/**
 * Shield icon for connection header
 */
export const ShieldIcon: React.FC<{
    width?: number | string;
    height?: number | string;
    className?: string;
}> = ({ width = 28, height = 28, className = "shield-icon" }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        width={width}
        height={height}
    >
        <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2196f3" />
                <stop offset="100%" stopColor="#0d47a1" />
            </linearGradient>
            <linearGradient id="shieldInner" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e3f2fd" />
                <stop offset="100%" stopColor="#90caf9" />
            </linearGradient>
        </defs>

        {/* Shield outer */}
        <path
            d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
            fill="url(#shieldGradient)"
            stroke="#0d47a1"
            strokeWidth="0.5"
        />

        {/* Shield inner */}
        <path
            d="M12 4L6 6.5V11c0 3.89 2.55 7.41 6 8.5 3.45-1.09 6-4.61 6-8.5V6.5L12 4z"
            fill="url(#shieldInner)"
            stroke="#1976d2"
            strokeWidth="0.3"
        />

        {/* Crest */}
        <path
            d="M9 15h6M12 8v7"
            stroke="#1565c0"
            strokeWidth="1.2"
            strokeLinecap="round"
        />
    </svg>
);

/**
 * Wizard character for empty feedback state
 */
export const WizardIcon: React.FC<{
    width?: number | string;
    height?: number | string;
    className?: string;
}> = ({ width = 120, height = 120, className = "wizard-icon" }) => (
    <svg
        className={className}
        viewBox="0 0 200 200"
        width={width}
        height={height}
    >
        <defs>
            <linearGradient id="wizardRobe" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3f51b5" />
                <stop offset="100%" stopColor="#1a237e" />
            </linearGradient>
            <linearGradient id="wizardBeard" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e0e0e0" />
                <stop offset="100%" stopColor="#9e9e9e" />
            </linearGradient>
            <linearGradient id="wizardHat" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7e57c2" />
                <stop offset="100%" stopColor="#4527a0" />
            </linearGradient>
            <linearGradient id="wizardStaff" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a1887f" />
                <stop offset="100%" stopColor="#5d4037" />
            </linearGradient>
            <radialGradient id="magicGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#b388ff" stopOpacity="1" />
                <stop offset="100%" stopColor="#7c4dff" stopOpacity="0" />
            </radialGradient>
        </defs>

        {/* Magic glow */}
        <circle cx="155" cy="70" r="15" fill="url(#magicGlow)" opacity="0.8">
            <animate attributeName="r" values="15;20;15" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.4;0.8" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Staff */}
        <path
            d="M150 160L160 70"
            stroke="url(#wizardStaff)"
            strokeWidth="5"
            strokeLinecap="round"
        />

        {/* Staff top */}
        <circle cx="155" cy="70" r="8" fill="#7c4dff" stroke="#4527a0" strokeWidth="1" />

        {/* Robe */}
        <path
            d="M60 80C60 80 70 150 100 150C130 150 140 80 140 80L120 90L100 80L80 90L60 80Z"
            fill="url(#wizardRobe)"
            stroke="#1a237e"
            strokeWidth="2"
        />

        {/* Beard */}
        <path
            d="M70 85C70 85 85 110 100 110C115 110 130 85 130 85L125 60L100 70L75 60L70 85Z"
            fill="url(#wizardBeard)"
            stroke="#9e9e9e"
            strokeWidth="1"
        />

        {/* Face */}
        <circle cx="100" cy="60" r="20" fill="#ffccbc" stroke="#ffab91" strokeWidth="1" />

        {/* Eyes */}
        <circle cx="90" cy="55" r="3" fill="#212121" />
        <circle cx="110" cy="55" r="3" fill="#212121" />

        {/* Hat */}
        <path
            d="M65 50L100 20L135 50C135 50 125 35 100 35C75 35 65 50 65 50Z"
            fill="url(#wizardHat)"
            stroke="#4527a0"
            strokeWidth="2"
        />

        {/* Hat brim */}
        <ellipse cx="100" cy="50" rx="40" ry="10" fill="#7e57c2" stroke="#4527a0" strokeWidth="2" />

        {/* Stars */}
        <path d="M85 40L87 35L89 40L94 42L89 44L87 49L85 44L80 42L85 40Z" fill="#ffeb3b" />
        <path d="M110 30L112 25L114 30L119 32L114 34L112 39L110 34L105 32L110 30Z" fill="#ffeb3b" />
    </svg>
);

/**
 * Elixir drop loading animation SVG
 */
export const ElixirLoader: React.FC<{
    width?: number | string;
    height?: number | string;
    className?: string;
}> = ({ width = 66, height = 100, className = "elixir-loader" }) => (
    <div className={className}>
        <svg viewBox="0 0 90 140" width={width} height={height}>
            <defs>
                {/* main purple gradient */}
                <linearGradient id="elxMain" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#d09bff" />
                    <stop offset="45%" stopColor="#b066ff" />
                    <stop offset="100%" stopColor="#7a3df7" />
                </linearGradient>
                {/* faint rim light on the left */}
                <linearGradient id="rim" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="rgba(255,255,255,.65)" />
                    <stop offset=".35" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
            </defs>

            {/* OUTLINE (black, thick) */}
            <path
                d="M45 5
           Q78 43 78 88
           Q78 123 45 133
           Q12 123 12 88
           Q12 43 45 5 Z"
                fill="#000"
            />
            {/* MAIN FILL */}
            <path
                d="M45 12
           Q70 46 70 87
           Q70 116 45 124
           Q20 116 20 87
           Q20 46 45 12 Z"
                fill="url(#elxMain)"
            />
            {/* GLOSSY TOP */}
            <path
                d="M45 15
           Q62 42 56 60
           Q45 53 34 62
           Q30 45 45 15 Z"
                fill="rgba(255,255,255,.55)"
                filter="url(#blur1)"
            />
            {/* RIM LIGHT */}
            <path
                d="M23 46
           Q45 12 45 12"
                stroke="url(#rim)"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
            />

            <filter id="blur1"><feGaussianBlur stdDeviation="1.5" /></filter>
        </svg>
    </div>
);

/**
 * Lightning icon for low latency indicator
 */
export const LightningIcon: React.FC<{
    size?: number | string;
    color?: string;
    className?: string;
}> = ({ size = 14, color = "currentColor", className = "" }) => (
    <svg
        viewBox="0 0 320 512"
        width={size}
        height={size}
        fill={color}
        className={className}
    >
        <path d="M296 160H180.6l42.6-129.8C227.2 15 215.7 0 200 0H56C44 0 33.8 8.9 32.2 20.8l-32 240C-1.7 275.2 9.5 288 24 288h118.7L96.6 482.5c-3.6 15.2 8 29.5 23.3 29.5 8.4 0 16.4-4.4 20.8-12l176-304c9.3-15.9-2.2-36-20.7-36z" />
    </svg>
);

/**
 * Crown icon for high quality indicator
 */
export const MiniCrownIcon: React.FC<{
    size?: number | string;
    color?: string;
    className?: string;
}> = ({ size = 14, color = "currentColor", className = "" }) => (
    <svg
        viewBox="0 0 640 512"
        width={size}
        height={size}
        fill={color}
        className={className}
    >
        <path d="M528 448H112c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h416c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zm64-320c-26.5 0-48 21.5-48 48 0 7.1 1.6 13.7 4.4 19.8L476 239.2c-15.4 9.2-35.3 4-44.2-11.6L350.3 85C361 76.2 368 63 368 48c0-26.5-21.5-48-48-48s-48 21.5-48 48c0 15 7 28.2 17.7 37l-81.5 142.6c-8.9 15.6-28.9 20.8-44.2 11.6l-72.3-43.4c2.7-6 4.4-12.7 4.4-19.8 0-26.5-21.5-48-48-48S0 149.5 0 176s21.5 48 48 48c2.6 0 5.2-.2 7.7-.6l74.9 136.2c1.4 2.6 3.1 5 4.9 7.4-3.7 2.3-7.1 5-10.2 8.2-10 10-16.4 22-19.8 34.5-.5 2.3-.9 4.7-1.3 7.1-.2 1.3-.4 2.3-.5 3-1 6.6 4.2 10.2 10.2 10.2h240c6 0 11.2-3.6 10.2-10.2-.1-.8-.3-1.7-.5-3-.3-2.4-.8-4.8-1.3-7.1-3.4-12.5-9.8-24.5-19.8-34.5-3.1-3.1-6.5-5.9-10.2-8.2 1.9-2.5 3.5-4.9 4.9-7.4l74.9-136.2c2.5.4 5.1.6 7.7.6 26.5 0 48-21.5 48-48 0-26.5-21.5-48-48-48z" />
    </svg>
);

/**
 * Balance icon for medium quality indicator
 */
export const BalanceIcon: React.FC<{
    size?: number | string;
    color?: string;
    className?: string;
}> = ({ size = 14, color = "currentColor", className = "" }) => (
    <svg
        viewBox="0 0 640 512"
        width={size}
        height={size}
        fill={color}
        className={className}
    >
        <path d="M256 336h-.02c0-16.18 1.34-8.73-85.05-181.51-17.65-35.29-68.19-35.36-85.87 0C-2.06 328.75.02 320.33.02 336H0c0 44.18 57.31 80 128 80s128-35.82 128-80zM128 176l72 144H56l72-144zm511.98 160c0-16.18 1.34-8.73-85.05-181.51-17.65-35.29-68.19-35.36-85.87 0-87.12 174.26-85.04 165.84-85.04 181.51H384c0 44.18 57.31 80 128 80s128-35.82 128-80h-.02zM440 320l72-144 72 144H440z" />
    </svg>
);