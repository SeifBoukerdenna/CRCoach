// royal_trainer_client/src/hooks/useDiscordAuth.ts
import { useDiscord } from "../contexts/DiscordContext";
import type { DiscordUser } from "../types/discord";

interface UseDiscordAuthReturn {
  // Auth state
  isAuthenticated: boolean;
  user: DiscordUser | null;
  isLoading: boolean;
  error: string | null;

  // Auth actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Helper functions
  isUserInServer: () => boolean;
  getUserId: () => string | null;
  getUsername: () => string | null;
  getDisplayName: () => string | null;
  getAvatarUrl: (size?: number) => string | null;

  // Config
  isDiscordConfigured: boolean;
  serverId: string | null;
}

/**
 * Custom hook for Discord authentication with helper utilities
 */
export const useDiscordAuth = (): UseDiscordAuthReturn => {
  const discord = useDiscord();

  const isUserInServer = () => {
    return discord.user?.is_in_server ?? false;
  };

  const getUserId = () => {
    return discord.user?.id ?? null;
  };

  const getUsername = () => {
    return discord.user?.username ?? null;
  };

  const getDisplayName = () => {
    return discord.user?.server_nickname || discord.user?.username || null;
  };

  const getAvatarUrl = (size: number = 64) => {
    if (!discord.user) return null;

    if (!discord.user.avatar) {
      return `https://cdn.discordapp.com/embed/avatars/${
        parseInt(discord.user.discriminator, 10) % 5
      }.png`;
    }

    return `https://cdn.discordapp.com/avatars/${discord.user.id}/${discord.user.avatar}.png?size=${size}`;
  };

  return {
    // Auth state
    isAuthenticated: discord.isAuthenticated,
    user: discord.user,
    isLoading: discord.isLoading,
    error: discord.error,

    // Auth actions
    login: discord.login,
    logout: discord.logout,
    refreshUser: discord.refreshUser,

    // Helper functions
    isUserInServer,
    getUserId,
    getUsername,
    getDisplayName,
    getAvatarUrl,

    // Config
    isDiscordConfigured: discord.config.configured,
    serverId: discord.config.server_id || null,
  };
};
