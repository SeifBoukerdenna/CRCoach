import { StreamQuality } from "../types/broadcast";
import { rtcLogger, LogLevel } from "../utils/logger";

/**
 * RTCClientConfig provides configuration options for the WebRTC client
 */
export interface RTCClientConfig {
  /** API URL for signaling server */
  signalingUrl?: string;
  /** Ice servers configuration */
  iceServers?: RTCIceServer[];
  /** Enable logging for debugging */
  enableLogging?: boolean;
  /** Log level for the WebRTC client */
  logLevel?: LogLevel;
  /** Default video quality */
  defaultQuality?: StreamQuality;
}

/**
 * Connection state for the WebRTC client
 */
export type ConnectionStatus =
  | "disconnected" // No connection attempt has been made
  | "connecting" // Connection is being established
  | "sending" // Sending offer to server
  | "connected" // Connection successfully established
  | "invalid" // Invalid session code
  | "error"; // Error during connection

/**
 * RTCStats provides performance statistics for the WebRTC connection
 */
export interface RTCStats {
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
 * RTCClient handles the WebRTC connection to the broadcast server
 */
export class RTCClient {
  private pc: RTCPeerConnection | null = null;
  private config: RTCClientConfig;
  private videoElement: HTMLVideoElement | null = null;
  private statsInterval: number | null = null;
  private onStatusChangeCallback: ((status: ConnectionStatus) => void) | null =
    null;
  private onStatsUpdateCallback: ((stats: RTCStats) => void) | null = null;

  private _status: ConnectionStatus = "disconnected";
  private _stats: RTCStats = {
    resolution: "—×—",
    rtt: "— ms",
    fps: "— FPS",
    quality: "medium",
  };

  /**
   * Create a new RTCClient instance
   * @param config Configuration options for the WebRTC client
   */
  constructor(config: RTCClientConfig = {}) {
    this.config = {
      signalingUrl: "/offer",
      iceServers: [],
      enableLogging: false,
      logLevel: LogLevel.INFO,
      defaultQuality: "medium",
      ...config,
    };

    this._stats.quality = this.config.defaultQuality || "medium";

    // Initialize the logger if logging is enabled
    if (this.config.enableLogging && this.config.logLevel !== undefined) {
      rtcLogger.setLevel(this.config.logLevel);
      this.log("RTCClient initialized", "debug");
    }
  }

  /**
   * Get the current connection status
   */
  get status(): ConnectionStatus {
    return this._status;
  }

  /**
   * Get the current connection statistics
   */
  get stats(): RTCStats {
    return { ...this._stats };
  }

  /**
   * Set the video element to display the remote stream
   * @param element HTML video element
   */
  setVideoElement(element: HTMLVideoElement | null): void {
    this.videoElement = element;
  }

  /**
   * Register a callback for status changes
   * @param callback Function to call when status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.onStatusChangeCallback = callback;
  }

  /**
   * Register a callback for stats updates
   * @param callback Function to call when stats update
   */
  onStatsUpdate(callback: (stats: RTCStats) => void): void {
    this.onStatsUpdateCallback = callback;
  }

  /**
   * Update the connection status and trigger callback
   * @param status New connection status
   */
  private updateStatus(status: ConnectionStatus): void {
    this._status = status;
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status);
    }
  }

  /**
   * Update connection statistics and trigger callback
   * @param stats Updated statistics
   */
  private updateStats(stats: Partial<RTCStats>): void {
    this._stats = { ...this._stats, ...stats };
    if (this.onStatsUpdateCallback) {
      this.onStatsUpdateCallback(this._stats);
    }
  }

  /**
   * Log a message if logging is enabled
   * @param message Message to log
   * @param level Optional log level
   */
  private log(
    message: string,
    level: "info" | "warn" | "error" | "debug" = "info"
  ): void {
    if (!this.config.enableLogging) return;

    // Set the logger level based on configuration
    if (this.config.logLevel !== undefined) {
      rtcLogger.setLevel(this.config.logLevel);
    }

    // Log the message with the appropriate level
    switch (level) {
      case "debug":
        rtcLogger.debug(message);
        break;
      case "warn":
        rtcLogger.warn(message);
        break;
      case "error":
        rtcLogger.error(message);
        break;
      default:
        rtcLogger.info(message);
    }
  }

  /**
   * Start collecting statistics from the peer connection
   */
  private startStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    if (!this.pc) return;

    this.statsInterval = window.setInterval(async () => {
      if (!this.pc || this.pc.connectionState !== "connected") {
        this.stopStatsCollection();
        return;
      }

      const stats = await this.pc.getStats();

      stats.forEach((report) => {
        // Round-trip time stats
        if (
          report.type === "candidate-pair" &&
          report.state === "succeeded" &&
          report.currentRoundTripTime
        ) {
          this.updateStats({
            rtt: `${Math.round(report.currentRoundTripTime * 1000)} ms`,
          });
        }

        // FPS stats
        if (
          report.type === "inbound-rtp" &&
          report.kind === "video" &&
          report.framesPerSecond
        ) {
          this.updateStats({
            fps: `${Math.round(report.framesPerSecond)} FPS`,
          });
        }
      });
    }, 1000);
  }

  /**
   * Stop collecting statistics
   */
  private stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Reset stats to default values
   */
  private resetStats(): void {
    this.updateStats({
      resolution: "—×—",
      rtt: "— ms",
      fps: "— FPS",
      quality: this.config.defaultQuality || "medium",
    });
  }

  /**
   * Detect quality level based on resolution
   * @param width Video width in pixels
   */
  private detectQualityFromResolution(width: number): StreamQuality {
    if (width <= 240) {
      return "low";
    } else if (width <= 320) {
      return "medium";
    } else {
      return "high";
    }
  }

  /**
   * Connect to the broadcast server with the given session code
   * @param code 4-digit session code
   */
  async connect(code: string): Promise<void> {
    try {
      // Reset any existing connection
      this.disconnect();
      this.resetStats();

      this.updateStatus("connecting");
      this.log(`Connecting with code: ${code}`);

      // Create new RTCPeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: this.config.iceServers,
      });

      // Set up connection state change handler
      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState;
        this.log(`Connection state changed: ${state}`);

        if (state === "connected") {
          this.updateStatus("connected");
        } else if (
          state === "failed" ||
          state === "closed" ||
          state === "disconnected"
        ) {
          this.updateStatus("disconnected");
          this.stopStatsCollection();
        }
      };

      // Set up ICE connection state change handler
      this.pc.oniceconnectionstatechange = () => {
        const iceState = this.pc?.iceConnectionState;
        this.log(`ICE connection state changed: ${iceState}`);

        if (
          iceState === "disconnected" ||
          iceState === "closed" ||
          iceState === "failed"
        ) {
          this.updateStatus("disconnected");
          this.stopStatsCollection();
        }
      };

      // Add video transceiver for receiving only
      this.pc.addTransceiver("video", { direction: "recvonly" });

      // Handle incoming tracks
      this.pc.ontrack = ({ track, streams }) => {
        if (track.kind !== "video") return;

        this.log("Received video track");

        if (this.videoElement) {
          this.videoElement.srcObject = streams[0];

          // Update resolution when metadata is loaded
          this.videoElement.onloadedmetadata = () => {
            if (!this.videoElement) return;

            const width = this.videoElement.videoWidth;
            const height = this.videoElement.videoHeight;
            const resolution = `${width}×${height}`;

            this.updateStats({
              resolution,
              quality: this.detectQualityFromResolution(width),
            });

            this.log(`Video resolution: ${resolution}`);

            // Attempt to play the video
            this.videoElement.play().catch((error) => {
              this.log(`Error playing video: ${error.message}`, "error");
            });
          };
        }
      };

      // Create and set local offer
      const offer = await this.pc.createOffer({ offerToReceiveVideo: true });
      await this.pc.setLocalDescription(offer);

      this.updateStatus("sending");

      // Send offer to signaling server
      const response = await fetch(this.config.signalingUrl || "/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...this.pc.localDescription?.toJSON(),
          code,
        }),
      });

      // Handle error responses
      if (response.status === 404) {
        this.log(`Invalid session code: ${code}`, "warn");
        this.updateStatus("invalid");
        this.disconnect();
        return;
      }

      if (!response.ok) {
        this.log(`Server error: ${response.status}`, "error");
        this.updateStatus("error");
        this.disconnect();
        return;
      }

      // Set remote description from answer
      const answerData = await response.json();
      await this.pc.setRemoteDescription(answerData);

      // Start collecting stats
      this.startStatsCollection();

      this.updateStatus("connected");
      this.log("Connection established successfully");
    } catch (error) {
      this.log(
        `Connection error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error"
      );
      this.updateStatus("error");
      this.disconnect();
    }
  }

  /**
   * Disconnect from the current broadcast
   */
  disconnect(): void {
    this.log("Disconnecting");

    // Stop stats collection
    this.stopStatsCollection();

    // Clean up video element
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    // Close peer connection
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.updateStatus("disconnected");
  }

  /**
   * Reset connection state from error or invalid state
   */
  reset(): void {
    if (this.status === "invalid" || this.status === "error") {
      this.updateStatus("disconnected");
    }
  }
}

// Create singleton instance
export const rtcClient = new RTCClient();

// Default export for easier imports
export default rtcClient;
