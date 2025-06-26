// royal_trainer_client/src/types/index.ts - Updated with Champion support

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
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
  };
  confidence: number;
  class_id: number;
  class: string; // Changed from class_name
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
  annotatedFrame?: string; // Base64 encoded image
}

// Enhanced Clash Royale Game State Types with Champion support
export interface ClashRoyaleCard {
  id: number;
  name: string;
  cost: number;
  rarity: "common" | "rare" | "epic" | "legendary" | "champion";
  isInHand: boolean;
  isNext: boolean;
  level?: number;
  cardKey?: string; // Internal game key
}

export interface ChampionState {
  activeChampion: ClashRoyaleCard | null;
  isChampionDeployed: boolean;
  canUseAbility: boolean;
  abilityCost: number;
  abilityCooldown?: number;
}

export interface ElixirState {
  current: number;
  max: number;
  regenerationRate?: number; // per second
  lastUpdated?: number;
}

export interface GameState {
  elixir: ElixirState;
  playerCards: ClashRoyaleCard[];
  opponentCards: ClashRoyaleCard[];
  championState: ChampionState;
  gameTime?: number;
  matchId?: string;
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

// Champion utility functions
export const isChampion = (card: ClashRoyaleCard): boolean => {
  return card.rarity === "champion";
};

export const getChampionAbilityCost = (championName: string): number => {
  // Different champions could have different ability costs
  switch (championName) {
    case "Golden Knight":
      return 2;
    case "Archer Queen":
      return 1;
    case "Skeleton King":
      return 2;
    default:
      return 2; // Default ability cost
  }
};

export const getCardRarityColor = (
  rarity: ClashRoyaleCard["rarity"]
): string => {
  switch (rarity) {
    case "common":
      return "#8B9DC3"; // Light blue-gray
    case "rare":
      return "#FF9500"; // Orange
    case "epic":
      return "#A843DC"; // Purple
    case "legendary":
      return "#FFD700"; // Gold
    case "champion":
      return "#FF4444"; // Red
    default:
      return "#8B9DC3";
  }
};
