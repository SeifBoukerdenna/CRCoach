// royal_trainer_client/src/hooks/useDiscordAuth.ts - Final Fixed Discord Authentication Hook

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
  const authPopupRef = useRef<Window | null>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(
    null
  );

  // Clear error
  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  // Update auth state
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    console.log("🔄 Updating auth state:", updates);
    setAuthState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Store tokens in localStorage
  const storeTokens = useCallback(
    (tokens: JWTTokens) => {
      console.log("💾 Storing tokens");
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
    console.log("🗑️ Clearing tokens");
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
      error: null,
    });
  }, [updateAuthState]);

  // Get stored tokens
  const getStoredTokens = useCallback((): JWTTokens | null => {
    const accessToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: Math.max(
        0,
        Math.floor((parseInt(expiryTime || "0") - Date.now()) / 1000)
      ),
    };
  }, []);

  // Make authenticated API request
  const makeAuthenticatedRequest = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const tokens = getStoredTokens();
      if (!tokens) {
        throw new Error("No authentication tokens");
      }

      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
      });
    },
    [getStoredTokens]
  );

  // Refresh access token
  const refreshToken = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      const tokens = getStoredTokens();
      if (!tokens?.refresh_token) {
        clearTokens();
        return;
      }

      const response = await fetch(getApiUrl("api/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      });

      if (!response.ok) {
        clearTokens();
        return;
      }

      const data = await response.json();
      storeTokens(data.tokens);

      console.log("🔄 Discord tokens refreshed successfully");
    } catch (error) {
      console.error("❌ Token refresh failed:", error);
      clearTokens();
    } finally {
      isRefreshingRef.current = false;
    }
  }, [getStoredTokens, clearTokens, storeTokens]);

  // Schedule automatic token refresh
  const scheduleTokenRefresh = useCallback(
    (tokens: JWTTokens) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      const refreshIn = Math.max(60000, (tokens.expires_in - 300) * 1000);

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

  // Clean up popup and event listeners
  const cleanupPopup = useCallback(() => {
    console.log("🧹 Cleaning up popup");

    if (authPopupRef.current) {
      authPopupRef.current.close();
      authPopupRef.current = null;
    }

    if (messageHandlerRef.current) {
      window.removeEventListener("message", messageHandlerRef.current);
      messageHandlerRef.current = null;
    }
  }, []);

  // Handle authentication callback from popup
  const handleAuthCallback = useCallback(
    async (params: AuthCallbackParams) => {
      console.log("🎯 Handling auth callback:", params);
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
          expires_in: parseInt(params.expires_in || "3600"),
        };

        storeTokens(tokens);

        // Get user info
        const userInfo = await getCurrentUser();
        if (!userInfo) {
          throw new Error("Failed to get user information");
        }

        updateAuthState({
          isAuthenticated: true,
          user: userInfo.user,
          isInRequiredGuild: userInfo.is_in_required_guild,
          guilds: userInfo.guilds,
          tokens,
          isLoading: false,
          error: null,
        });

        scheduleTokenRefresh(tokens);

        console.log("✅ Discord authentication successful");

        // Clean up URL params without page reload
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } catch (error) {
        console.error("❌ Authentication callback failed:", error);
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

  // Check authentication status
  const checkAuth = useCallback(async () => {
    console.log("🔍 Checking authentication status");
    updateAuthState({ isLoading: true, error: null });

    try {
      const tokens = getStoredTokens();
      if (!tokens) {
        console.log("❌ No stored tokens found");
        updateAuthState({ isLoading: false });
        return;
      }

      console.log("🎫 Found stored tokens, checking validity");
      // Try to get current user info
      const userInfo = await getCurrentUser();
      if (!userInfo) {
        console.log("❌ Failed to get user info, clearing tokens");
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

  // Initiate Discord login with popup flow
  const login = useCallback(async () => {
    console.log("🚀 Initiating Discord login");
    updateAuthState({ isLoading: true, error: null });

    try {
      // Clean up any existing popup
      cleanupPopup();

      const response = await fetch(getApiUrl("api/auth/login"));

      if (!response.ok) {
        throw new Error("Failed to get login URL");
      }

      const data = await response.json();

      if (!data.oauth_url) {
        throw new Error("Discord authentication is not configured");
      }

      console.log("🔐 Opening Discord OAuth popup...");

      // Open popup window for Discord OAuth
      const popup = window.open(
        data.oauth_url,
        "discord-auth",
        "width=500,height=700,scrollbars=yes,resizable=yes,left=" +
          (screen.width / 2 - 250) +
          ",top=" +
          (screen.height / 2 - 350)
      );

      authPopupRef.current = popup;

      if (!popup) {
        throw new Error(
          "Popup was blocked. Please allow popups for this site."
        );
      }

      // Listen for messages from popup
      const messageHandler = (event: MessageEvent) => {
        console.log("📨 Received message from popup:", event);

        // Verify origin for security
        if (event.origin !== window.location.origin) {
          console.warn("⚠️ Message from wrong origin:", event.origin);
          return;
        }

        if (event.data.type === "DISCORD_AUTH_SUCCESS") {
          console.log("✅ Received auth success from popup");

          // Clean up first
          cleanupPopup();

          // Handle successful authentication
          handleAuthCallback({
            access_token: event.data.tokens.access_token,
            refresh_token: event.data.tokens.refresh_token,
            expires_in: event.data.tokens.expires_in,
            in_guild: event.data.tokens.in_guild,
          });
        } else if (event.data.type === "DISCORD_AUTH_ERROR") {
          console.error("❌ Received auth error from popup:", event.data.error);

          // Clean up first
          cleanupPopup();

          updateAuthState({
            isLoading: false,
            error: event.data.error || "Authentication failed",
          });
        }
      };

      messageHandlerRef.current = messageHandler;
      window.addEventListener("message", messageHandler);

      // Handle popup being closed manually
      const checkClosed = setInterval(() => {
        if (!popup || popup.closed) {
          console.log("🔒 Popup was closed");
          clearInterval(checkClosed);
          cleanupPopup();

          // Only update state if we're still loading (user didn't complete auth)
          if (authState.isLoading) {
            updateAuthState({
              isLoading: false,
              error: "Authentication was cancelled",
            });
          }
        }
      }, 1000);

      // Cleanup interval after 10 minutes (fallback)
      setTimeout(() => {
        clearInterval(checkClosed);
      }, 600000);
    } catch (error) {
      console.error("❌ Login initiation failed:", error);
      cleanupPopup();
      updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      });
    }
  }, [updateAuthState, handleAuthCallback, authState.isLoading, cleanupPopup]);

  // Logout user
  const logout = useCallback(async () => {
    console.log("👋 Logging out user");
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

    // Clean up popup and event listeners
    cleanupPopup();

    // Clear local storage and state
    clearTokens();
    updateAuthState({ isLoading: false });
  }, [makeAuthenticatedRequest, clearTokens, updateAuthState, cleanupPopup]);

  // Check for auth callback on mount (for direct URL access)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthParams =
      urlParams.get("access_token") || urlParams.get("error");

    if (hasAuthParams) {
      console.log("🔗 Found auth params in URL, handling callback");
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
      console.log("🧹 Component unmounting, cleaning up");
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      cleanupPopup();
    };
  }, [cleanupPopup]);

  return {
    ...authState,
    login,
    logout,
    refreshAuth: refreshToken,
    checkAuth,
    clearError,
  };
};
