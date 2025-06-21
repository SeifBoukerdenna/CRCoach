// royal_trainer_client/src/types/index.ts - Complete fixed types with all missing definitions

// Connection and Stream types
export interface StreamStats {
  fps?: number;
  bitrate?: number;
  resolution?: string;
  latency?: number;
  endToEndLatency?: number;
  signalingLatency?: number;
  networkLatency?: number;
}

export interface ConnectionError {
  message: string;
  code?: string;
  timestamp: Date;
}

export interface LatencyMeasurement {
  frameId: string;
  captureTimestamp: number;
  displayTimestamp: number;
  endToEndLatency: number;
  signalingLatency?: number;
  networkLatency?: number;
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
  error_type?: string;
  expiry_reason?: string;
  created_at?: string;
  last_activity?: string;
}

// Fixed ConnectionState - simplified to just the state value
export type ConnectionStateValue =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "error"
  | "offline"
  | "live";

// Legacy interface for backwards compatibility (if needed elsewhere)
export interface ConnectionState {
  connectionState: ConnectionStateValue;
  isConnecting: boolean;
  isConnected: boolean;
}

// Detection and Inference types
export interface Detection {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
  class_id: number;
  class_name: string;
}

export interface DetectionData {
  detections: Detection[];
  timestamp: number;
  frameId: string;
  confidence_threshold: number;
  inference_time_ms: number;
  original_image_size: [number, number];
  processed_image_size: [number, number];
}

export interface InferenceStats {
  totalDetections: number;
  averageConfidence: number;
  inferenceTime: number;
  frameRate: number;
}

// Missing types that were accidentally removed
export interface InferenceData {
  detections: Detection[];
  timestamp: number;
  frameId: string;
  confidence_threshold: number;
  inference_time_ms: number;
  original_image_size: [number, number];
  processed_image_size: [number, number];
}

export interface DetectionHistoryItem {
  id: string;
  timestamp: number;
  frameId: string;
  detections: Detection[];
  confidence_threshold: number;
  inference_time_ms: number;
  original_image_size: [number, number];
  processed_image_size: [number, number];
  screenshot?: string; // Base64 encoded image
}

// Discord Authentication Types
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  email?: string;
  verified?: boolean;
  avatar?: string;
  banner?: string;
  accent_color?: number;
  locale?: string;
  mfa_enabled?: boolean;
  premium_type?: number;
  public_flags?: number;
  flags?: number;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
  features: string[];
}

export interface JWTTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse {
  user: DiscordUser;
  tokens: JWTTokens;
  is_in_required_guild: boolean;
  guilds: DiscordGuild[];
}

export interface UserInfoResponse {
  user: DiscordUser;
  is_in_required_guild: boolean;
  guilds: DiscordGuild[];
  session_info: {
    user_id: string;
    username: string;
    avatar_url?: string;
    is_in_required_guild: boolean;
    created_at: string;
    last_active: string;
    session_duration_minutes: number;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: DiscordUser | null;
  isInRequiredGuild: boolean;
  guilds: DiscordGuild[];
  tokens: JWTTokens | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export interface AuthCallbackParams {
  access_token?: string;
  refresh_token?: string;
  expires_in?: string;
  in_guild?: string;
  error?: string;
  description?: string;
}

export interface AuthConfig {
  discord_auth_available: boolean;
  guild_check_enabled: boolean;
  login_url?: string;
  frontend_url: string;
}

// Helper functions for Discord user info
export const getDiscordAvatarUrl = (
  user: DiscordUser,
  size: number = 128
): string => {
  if (!user.avatar) {
    // Default avatar based on discriminator
    const defaultAvatar = parseInt(user.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
  }

  // Check if avatar is animated (starts with a_)
  const extension = user.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=${size}`;
};

export const getDiscordDisplayName = (user: DiscordUser): string => {
  if (user.discriminator === "0") {
    // New username system
    return user.username;
  } else {
    // Legacy username#discriminator system
    return `${user.username}#${user.discriminator}`;
  }
};

export const getGuildIconUrl = (
  guild: DiscordGuild,
  size: number = 128
): string | null => {
  if (!guild.icon) {
    return null;
  }

  const extension = guild.icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${extension}?size=${size}`;
};
