export type ConnectionState = "offline" | "connecting" | "live";

export interface Detection {
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
  };
  confidence: number;
  class: string;
  class_id: number;
}

export interface StreamStats {
  fps?: number;
  bitrate?: number;
  resolution?: string;
  latency?: number;
}

export interface InferenceData {
  success: boolean;
  detections: Detection[];
  inference_time: number;
  image_shape?: {
    width: number;
    height: number;
  };
  annotated_frame?: string; // base64 encoded image
}

export interface InferenceStats {
  avgInferenceTime: number;
  detectionsPerSecond: number;
  totalDetections: number;
  accuracy: number;
  inferenceFPS?: number; // Add this optional property
  connectionAttempts?: number;
  isWebSocketConnected?: boolean;
  frameCount?: number;
  lastInferenceTime?: number;
  networkLatency?: number;
  modelLoadTime?: number;
  totalFramesProcessed?: number;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy: RTCIceTransportPolicy;
  bundlePolicy: RTCBundlePolicy;
  rtcpMuxPolicy: RTCRtcpMuxPolicy;
}

export interface ServerResponse {
  sdp: string;
  type: RTCSdpType;
}

export interface ConnectionError {
  message: string;
  code?: string;
  timestamp: Date;
}
