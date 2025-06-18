// royal_trainer_client/src/utils/discordApi.ts
import { getApiUrl } from "../config/api";
import type {
  DiscordUser,
  DiscordConfig,
  DiscordError,
} from "../types/discord";

const API_BASE = "/auth/discord";

class DiscordApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DiscordApiError";
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData: DiscordError = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // If we can't parse error JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new DiscordApiError(response.status, errorMessage);
  }

  const data = await response.json();
  return data;
}

export const discordApi = {
  /**
   * Check current authentication status
   */
  async checkAuthStatus(): Promise<{
    authenticated: boolean;
    user?: DiscordUser;
  }> {
    try {
      const response = await fetch(getApiUrl(`${API_BASE}/status`), {
        credentials: "include",
        cache: "no-cache",
      });

      if (response.ok) {
        const data = await response.json();
        return {
          authenticated: true,
          user: data.user,
        };
      } else {
        return { authenticated: false };
      }
    } catch (error) {
      console.error("Failed to check auth status:", error);
      return { authenticated: false };
    }
  },

  /**
   * Get Discord login URL
   */
  async getLoginUrl(): Promise<string> {
    const response = await fetch(getApiUrl(`${API_BASE}/login`), {
      credentials: "include",
    });

    const data = await handleResponse<{ auth_url: string }>(response);
    return data.auth_url;
  },

  /**
   * Get current user info (requires authentication)
   */
  async getCurrentUser(): Promise<DiscordUser> {
    const response = await fetch(getApiUrl(`${API_BASE}/me`), {
      credentials: "include",
    });

    return handleResponse<DiscordUser>(response);
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const response = await fetch(getApiUrl(`${API_BASE}/logout`), {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new DiscordApiError(response.status, "Logout failed");
    }
  },

  /**
   * Get Discord configuration status
   */
  async getConfig(): Promise<DiscordConfig> {
    try {
      const response = await fetch("/health");
      if (response.ok) {
        const data = await response.json();
        return data.discord_auth || { configured: false };
      }
      return { configured: false };
    } catch (error) {
      console.error("Failed to get Discord config:", error);
      return { configured: false };
    }
  },

  /**
   * Handle OAuth callback (used internally by popup)
   */
  async handleCallback(
    code: string
  ): Promise<{ authenticated: boolean; user?: DiscordUser }> {
    try {
      const response = await fetch(
        getApiUrl(`${API_BASE}/callback?code=${encodeURIComponent(code)}`),
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          authenticated: true,
          user: data.user,
        };
      } else {
        return { authenticated: false };
      }
    } catch (error) {
      console.error("Failed to handle OAuth callback:", error);
      return { authenticated: false };
    }
  },
};

export { DiscordApiError };
