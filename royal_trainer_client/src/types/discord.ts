// royal_trainer_client/src/types/discord.ts - FIXED VERSION
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  is_in_server: boolean;
  server_nickname?: string;
}

export interface DiscordAuthState {
  isAuthenticated: boolean;
  user: DiscordUser | null;
  isLoading: boolean;
  error: string | null;
}

export interface DiscordAuthResponse {
  status: string;
  user: DiscordUser;
  token: {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
}

export interface DiscordError {
  detail: string;
}

// FIXED: Updated DiscordConfig to match what we actually use
export interface DiscordConfig {
  configured: boolean;
  server_id?: string;
  server_name?: string;
  client_id?: string;
  redirect_uri?: string;
}
