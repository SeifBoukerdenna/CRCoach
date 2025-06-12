// royal_trainer_client/src/types/index.ts

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

export interface DetectionHistoryItem {
  id: string;
  timestamp: number;
  detections: Detection[];
  annotatedFrame: string;
  inferenceTime: number;
  sessionCode: string;
}

// YOLOv8 Detection Types
export interface Detection {
  class: string;
  class_id: number;
  confidence: number;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
  };
}

export interface SessionStatus {
  session_code: string;
  exists: boolean;
  has_broadcaster: boolean;
  viewer_count: number;
  max_viewers: number;
  available_for_viewer: boolean;
  available_for_broadcaster: boolean;
  message: string;
  error_type?: "session_not_found" | "session_expired" | "session_full" | null;
  expiry_reason?: string;
}

export interface InferenceData {
  detections: Detection[];
  inference_time: number;
  image_shape: {
    width: number;
    height: number;
  };
  annotated_frame: string; // base64 encoded image
  stats: {
    total_inferences: number;
    avg_inference_time: number;
    model_confidence_threshold: number;
  };
  timestamp: string;
  session_code: string;
}

export interface InferenceStats {
  avgInferenceTime: number;
  detectionsPerSecond: number;
  totalDetections: number;
  accuracy: number;
  inferenceFPS?: number;
  connectionAttempts?: number;
  isWebSocketConnected?: boolean;
  frameCount?: number;
  lastInferenceTime?: number;
  networkLatency?: number;
  modelLoadTime?: number;
  totalFramesProcessed?: number;
}

// YOLOv8 Service Status
export interface YoloServiceStatus {
  is_ready: boolean;
  model_path: string;
  total_inferences: number;
  avg_inference_time: number;
  last_inference_time: number;
  confidence_threshold: number;
  debug_mode: boolean;
  classes: string[];
}
