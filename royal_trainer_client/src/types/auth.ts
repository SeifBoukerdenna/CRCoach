// royal_trainer_client/src/types/auth.ts - Discord Authentication Types

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
