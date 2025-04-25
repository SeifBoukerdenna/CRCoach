/**
 * Quality levels for the video stream
 */
export type StreamQuality = "low" | "medium" | "high";

/**
 * Connection status for the WebRTC connection
 */
export type ConnectionStatus =
  | "disconnected" // No connection attempt has been made
  | "connecting" // Connection is being established
  | "sending" // Sending offer to server
  | "connected" // Connection successfully established
  | "invalid" // Invalid session code
  | "error"; // Error during connection

/**
 * Performance statistics for the broadcast
 */
export interface BroadcastStats {
  /** Video resolution in format "width×height" */
  resolution: string;
  /** Round-trip time in milliseconds with "ms" suffix */
  rtt: string;
  /** Frames per second with "FPS" suffix */
  fps: string;
  /** Current stream quality */
  quality: StreamQuality;
}

/**
 * Configuration options for the broadcast
 */
export interface BroadcastConfig {
  /** API URL for signaling server */
  signalingUrl?: string;
  /** Ice servers configuration */
  iceServers?: RTCIceServer[];
  /** Enable logging for debugging */
  enableLogging?: boolean;
  /** Default video quality */
  defaultQuality?: StreamQuality;
}

/**
 * Session code validation
 */
export interface SessionCodeValidation {
  /** Whether the code is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
}
