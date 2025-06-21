// royal_trainer_client/src/hooks/useDiscordAuth.ts - Discord Authentication Hook

import { useState, useEffect, useCallback, useRef } from "react";
import { getApiUrl } from "../config/api";
import type {
  AuthState,
  JWTTokens,
  UserInfoResponse,
  AuthCallbackParams,
} from "../types/auth";

const TOKEN_STORAGE_KEY = "discord_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "discord_refresh_token";
const TOKEN_EXPIRY_STORAGE_KEY = "discord_token_expiry";

export const useDiscordAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isInRequiredGuild: false,
    guilds: [],
    tokens: null,
    isLoading: true,
    error: null,
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const isRefreshingRef = useRef(false);

  // Clear error
  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  // Update auth state
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Store tokens in localStorage
  const storeTokens = useCallback(
    (tokens: JWTTokens) => {
      localStorage.setItem(TOKEN_STORAGE_KEY, tokens.access_token);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);

      // Calculate expiry time
      const expiryTime = Date.now() + tokens.expires_in * 1000;
      localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, expiryTime.toString());

      updateAuthState({ tokens });
    },
    [updateAuthState]
  );

  // Clear stored tokens
  const clearTokens = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    updateAuthState({
      isAuthenticated: false,
      user: null,
      isInRequiredGuild: false,
      guilds: [],
      tokens: null,
    });
  }, [updateAuthState]);

  // Get stored tokens
  const getStoredTokens = useCallback((): JWTTokens | null => {
    const accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY);

    if (!accessToken || !refreshToken || !expiryTime) {
      return null;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: Math.max(
        0,
        Math.floor((parseInt(expiryTime) - Date.now()) / 1000)
      ),
    };
  }, []);

  // Check if token is expired or will expire soon
  const isTokenExpired = useCallback((_tokens: JWTTokens): boolean => {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY);
    if (!expiryTime) return true;

    // Consider expired if expires in next 5 minutes
    const timeUntilExpiry = parseInt(expiryTime) - Date.now();
    return timeUntilExpiry < 5 * 60 * 1000; // 5 minutes
  }, []);

  // Make authenticated API request
  const makeAuthenticatedRequest = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const tokens = getStoredTokens();
      if (!tokens) {
        throw new Error("No authentication tokens");
      }

      // Refresh token if expired
      if (isTokenExpired(tokens)) {
        await refreshToken();
        // Get updated tokens
        const newTokens = getStoredTokens();
        if (!newTokens) {
          throw new Error("Failed to refresh tokens");
        }
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${getStoredTokens()?.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        // Token is invalid, clear auth and redirect to login
        clearTokens();
        throw new Error("Authentication expired");
      }

      return response;
    },
    [getStoredTokens, isTokenExpired, clearTokens]
  );

  // Refresh access token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      return false;
    }

    const tokens = getStoredTokens();
    if (!tokens?.refresh_token) {
      clearTokens();
      return false;
    }

    isRefreshingRef.current = true;

    try {
      const response = await fetch(getApiUrl("api/auth/refresh"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: tokens.refresh_token,
        }),
      });

      if (!response.ok) {
        throw new Error("Refresh failed");
      }

      const data = await response.json();

      // Store new tokens
      storeTokens(data.tokens);

      // Update user info
      updateAuthState({
        isAuthenticated: true,
        user: data.user,
        isInRequiredGuild: data.is_in_required_guild,
        guilds: data.guilds,
        error: null,
      });

      // Schedule next refresh
      scheduleTokenRefresh(data.tokens);

      console.log("🔄 Discord tokens refreshed successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to refresh tokens:", error);
      clearTokens();
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [getStoredTokens, storeTokens, updateAuthState, clearTokens]);

  // Schedule automatic token refresh
  const scheduleTokenRefresh = useCallback(
    (tokens: JWTTokens) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Refresh 5 minutes before expiry
      const refreshIn = Math.max(0, (tokens.expires_in - 300) * 1000);

      refreshTimeoutRef.current = setTimeout(() => {
        console.log("🔄 Auto-refreshing Discord tokens...");
        refreshToken();
      }, refreshIn);

      console.log(
        `⏰ Token refresh scheduled in ${Math.round(
          refreshIn / 1000 / 60
        )} minutes`
      );
    },
    [refreshToken]
  );

  // Get current user info
  const getCurrentUser =
    useCallback(async (): Promise<UserInfoResponse | null> => {
      try {
        const response = await makeAuthenticatedRequest(
          getApiUrl("api/auth/me")
        );

        if (!response.ok) {
          throw new Error("Failed to get user info");
        }

        return await response.json();
      } catch (error) {
        console.error("❌ Failed to get current user:", error);
        return null;
      }
    }, [makeAuthenticatedRequest]);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    updateAuthState({ isLoading: true, error: null });

    try {
      const tokens = getStoredTokens();
      if (!tokens) {
        updateAuthState({ isLoading: false });
        return;
      }

      // Try to get current user info
      const userInfo = await getCurrentUser();
      if (!userInfo) {
        clearTokens();
        updateAuthState({ isLoading: false });
        return;
      }

      // Update auth state
      updateAuthState({
        isAuthenticated: true,
        user: userInfo.user,
        isInRequiredGuild: userInfo.is_in_required_guild,
        guilds: userInfo.guilds,
        tokens,
        isLoading: false,
        error: null,
      });

      // Schedule token refresh
      scheduleTokenRefresh(tokens);

      console.log("✅ Discord authentication verified");
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      clearTokens();
      updateAuthState({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Authentication check failed",
      });
    }
  }, [
    getStoredTokens,
    getCurrentUser,
    updateAuthState,
    clearTokens,
    scheduleTokenRefresh,
  ]);

  // Initiate Discord login
  const login = useCallback(async () => {
    updateAuthState({ isLoading: true, error: null });

    try {
      const response = await fetch(getApiUrl("api/auth/login"));

      if (!response.ok) {
        throw new Error("Failed to get login URL");
      }

      const data = await response.json();

      if (!data.oauth_url) {
        throw new Error("Discord authentication is not configured");
      }

      console.log("🔐 Redirecting to Discord OAuth...");

      // Redirect to Discord OAuth
      window.location.href = data.oauth_url;
    } catch (error) {
      console.error("❌ Login initiation failed:", error);
      updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
      });
    }
  }, [updateAuthState]);

  // Handle OAuth callback
  const handleAuthCallback = useCallback(
    async (params: AuthCallbackParams) => {
      updateAuthState({ isLoading: true, error: null });

      try {
        if (params.error) {
          throw new Error(params.description || params.error);
        }

        if (!params.access_token || !params.refresh_token) {
          throw new Error("Missing authentication tokens");
        }

        const tokens: JWTTokens = {
          access_token: params.access_token,
          refresh_token: params.refresh_token,
          token_type: "bearer",
          expires_in: parseInt(params.expires_in || "1800"), // Default 30 minutes
        };

        // Store tokens
        storeTokens(tokens);

        // Get user info
        const userInfo = await getCurrentUser();
        if (!userInfo) {
          throw new Error("Failed to get user information");
        }

        // Update auth state
        updateAuthState({
          isAuthenticated: true,
          user: userInfo.user,
          isInRequiredGuild: userInfo.is_in_required_guild,
          guilds: userInfo.guilds,
          tokens,
          isLoading: false,
          error: null,
        });

        // Schedule token refresh
        scheduleTokenRefresh(tokens);

        console.log("✅ Discord authentication successful");

        // Clear URL parameters
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url.toString());
      } catch (error) {
        console.error("❌ Auth callback failed:", error);
        clearTokens();
        updateAuthState({
          isLoading: false,
          error:
            error instanceof Error ? error.message : "Authentication failed",
        });
      }
    },
    [
      updateAuthState,
      storeTokens,
      getCurrentUser,
      scheduleTokenRefresh,
      clearTokens,
    ]
  );

  // Logout user
  const logout = useCallback(async () => {
    updateAuthState({ isLoading: true });

    try {
      // Call logout endpoint
      await makeAuthenticatedRequest(getApiUrl("api/auth/logout"), {
        method: "POST",
      });

      console.log("👋 Discord logout successful");
    } catch (error) {
      console.error("❌ Logout API call failed:", error);
      // Continue with local logout even if API call fails
    }

    // Clear local storage and state
    clearTokens();
    updateAuthState({ isLoading: false });
  }, [makeAuthenticatedRequest, clearTokens, updateAuthState]);

  // Check for auth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthParams =
      urlParams.get("access_token") || urlParams.get("error");

    if (hasAuthParams) {
      const params: AuthCallbackParams = {
        access_token: urlParams.get("access_token") || undefined,
        refresh_token: urlParams.get("refresh_token") || undefined,
        expires_in: urlParams.get("expires_in") || undefined,
        in_guild: urlParams.get("in_guild") || undefined,
        error: urlParams.get("error") || undefined,
        description: urlParams.get("description") || undefined,
      };

      handleAuthCallback(params);
    } else {
      // Check existing authentication
      checkAuth();
    }
  }, [handleAuthCallback, checkAuth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...authState,
    login,
    logout,
    refreshAuth: refreshToken,
    checkAuth,
    clearError,
  };
};
