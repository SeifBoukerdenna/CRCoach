export type ConnectionState = "offline" | "connecting" | "live";

export interface StreamStats {
  fps?: number;
  bitrate?: number;
  resolution?: string;
  latency?: number;
}

export interface ConnectionError {
  message: string;
  code?: string;
  timestamp: Date;
}
