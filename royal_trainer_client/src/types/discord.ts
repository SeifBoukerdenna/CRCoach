// royal_trainer_client/src/types/discord.ts
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

export interface DiscordConfig {
  server_id?: string;
  configured: boolean;
}
