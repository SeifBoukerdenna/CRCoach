/**
 * Application-wide constants
 */

export const API = {
  /** Base API URL */
  BASE_URL: import.meta.env.VITE_API_URL || "",
  /** Offer endpoint for WebRTC signaling */
  OFFER_ENDPOINT: "/offer",
  /** Upload endpoint for WebRTC signaling */
  UPLOAD_ENDPOINT: "/upload",
};

export const UI = {
  /** Maximum length for session code */
  SESSION_CODE_LENGTH: 4,
  /** Default video quality */
  DEFAULT_QUALITY: "medium" as const,
  /** UI theme colors */
  COLORS: {
    BLUE: {
      START: "#2f8cff",
      END: "#001a48",
      MEDIUM: "#00318c",
      DARK: "#001a48",
    },
    GOLD: {
      LIGHT: "#ffe36b",
      MEDIUM: "#ffc907",
      DARK: "#b58300",
    },
    RED: "#ff5252",
    GREEN: "#2cf476",
    PURPLE: "#a34cff",
  },
  /** Animation durations in ms */
  ANIMATION: {
    SHORT: 150,
    MEDIUM: 300,
    LONG: 500,
  },
  /** Corner radius values */
  RADIUS: {
    SMALL: "8px",
    MEDIUM: "12px",
    LARGE: "18px",
  },
};

export const WEBRTC = {
  /** Default ICE servers */
  ICE_SERVERS: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  /** Stats update interval in ms */
  STATS_INTERVAL: 1000,
  /** Connection timeout in ms */
  CONNECTION_TIMEOUT: 10000,
};

export const FEATURE_FLAGS = {
  /** Enable debug logging */
  DEBUG_LOGGING: import.meta.env.DEV || false,
  /** Enable quality selector */
  QUALITY_SELECTOR: true,
  /** Enable settings panel */
  SETTINGS_PANEL: true,
};

export default {
  API,
  UI,
  WEBRTC,
  FEATURE_FLAGS,
};
