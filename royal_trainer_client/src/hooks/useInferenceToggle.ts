// royal_trainer_client/src/hooks/useInferenceToggle.ts - Updated with Discord Auth Requirements

import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "../config/api";
import { useDiscordAuth } from "./useDiscordAuth";

interface ToggleResponse {
  status: string;
  inference_enabled: boolean;
  session_code: string;
  frame_capture_active?: boolean;
  authenticated_user?: string;
  message: string;
}

interface InferenceStatus {
  session_code: string;
  inference_enabled: boolean;
  has_yolo_service: boolean;
  service_stats: any;
  auth_status?: {
    authenticated: boolean;
    in_required_guild: boolean;
    username?: string;
    auth_required_for_inference: boolean;
  };
}

interface AuthCheckResponse {
  can_use_inference: boolean;
  authenticated: boolean;
  in_required_guild: boolean;
  username?: string;
  error_message?: string;
  discord_invite_url?: string;
  auth_requirements: {
    discord_login_required: boolean;
    guild_membership_required: boolean;
    guild_id?: string;
  };
}

interface AuthErrorDetail {
  message: string;
  auth_required: boolean;
  discord_invite_url?: string;
  user_authenticated: boolean;
  in_required_guild: boolean;
}

export const useInferenceToggle = (sessionCode: string | null) => {
  const [isInferenceEnabled, setIsInferenceEnabled] = useState(false);
  const [hasYoloService, setHasYoloService] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [lastCheckedSession, setLastCheckedSession] = useState<string | null>(
    null
  );
  const [retryCount, setRetryCount] = useState(0);
  const [authCheckResult, setAuthCheckResult] =
    useState<AuthCheckResponse | null>(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  const { isAuthenticated, isInRequiredGuild, tokens } = useDiscordAuth();

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  // ✅ Check authentication specifically for inference
  const checkInferenceAuth =
    useCallback(async (): Promise<AuthCheckResponse | null> => {
      try {
        const headers: HeadersInit = {
          Accept: "application/json",
        };

        // Add auth token if available
        if (tokens?.access_token) {
          headers["Authorization"] = `Bearer ${tokens.access_token}`;
        }

        const response = await fetch(getApiUrl("api/inference/auth/check"), {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          throw new Error(`Auth check failed: ${response.status}`);
        }

        const authResult: AuthCheckResponse = await response.json();
        setAuthCheckResult(authResult);

        console.log(`🔐 Inference auth check:`, {
          canUseInference: authResult.can_use_inference,
          authenticated: authResult.authenticated,
          inGuild: authResult.in_required_guild,
          username: authResult.username,
        });

        return authResult;
      } catch (error) {
        console.error("❌ Failed to check inference auth:", error);
        return null;
      }
    }, [tokens]);

  // ✅ Show authentication popup
  const showAuthenticationPopup = useCallback(
    (authResult: AuthCheckResponse) => {
      const messages = [];

      if (!authResult.authenticated) {
        messages.push(
          "🔐 You need to log in with Discord to use inference features."
        );
      } else if (!authResult.in_required_guild) {
        messages.push(
          "🏠 You must be a member of our Discord server to use inference features."
        );
      }

      if (authResult.discord_invite_url) {
        messages.push(`🔗 Join our Discord: ${authResult.discord_invite_url}`);
      }

      // Create popup content
      const popupContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Required</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          h1 {
            margin: 0 0 20px 0;
            font-size: 24px;
          }
          p {
            margin: 15px 0;
            line-height: 1.6;
            opacity: 0.9;
          }
          .buttons {
            margin-top: 30px;
            display: flex;
            gap: 10px;
            flex-direction: column;
          }
          button {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          .discord-btn {
            background: #5865F2;
            color: white;
          }
          .discord-btn:hover {
            background: #4752C4;
            transform: translateY(-2px);
          }
          .close-btn {
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }
          .close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 Inference Access Required</h1>
          ${messages.map((msg) => `<p>${msg}</p>`).join("")}
          <div class="buttons">
            ${
              authResult.discord_invite_url
                ? `<button class="discord-btn" onclick="window.open('${authResult.discord_invite_url}', '_blank')">
                🔗 Join Discord Server
              </button>`
                : ""
            }
            ${
              !authResult.authenticated
                ? `<button class="discord-btn" onclick="window.opener.postMessage({type: 'auth_required', action: 'login'}, '*'); window.close();">
                🔐 Login with Discord
              </button>`
                : ""
            }
            <button class="close-btn" onclick="window.close()">
              ❌ Close
            </button>
          </div>
        </div>
        <script>
          // Auto-close after 30 seconds
          setTimeout(() => window.close(), 30000);

          // Listen for messages from parent
          window.addEventListener('message', (event) => {
            if (event.data.type === 'close_popup') {
              window.close();
            }
          });
        </script>
      </body>
      </html>
    `;

      // Open popup
      const popup = window.open(
        "data:text/html;charset=utf-8," + encodeURIComponent(popupContent),
        "auth-required",
        "width=500,height=600,scrollbars=yes,resizable=yes,left=" +
          (screen.width / 2 - 250) +
          ",top=" +
          (screen.height / 2 - 300)
      );

      setShowAuthPopup(true);

      // Listen for messages from popup
      const handleMessage = (event: MessageEvent) => {
        if (
          event.data.type === "auth_required" &&
          event.data.action === "login"
        ) {
          // Trigger Discord login
          console.log("🔐 Triggering Discord login from auth popup");
          // You can call your Discord auth hook here
          popup?.close();
          setShowAuthPopup(false);
        }
      };

      window.addEventListener("message", handleMessage);

      // Clean up when popup closes
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          setShowAuthPopup(false);
          window.removeEventListener("message", handleMessage);
          clearInterval(checkClosed);
        }
      }, 1000);

      return popup;
    },
    []
  );

  // ✅ Enhanced toggle function with auth checks
  const toggleInference = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!sessionCode) {
        setToggleError("No session code available");
        return false;
      }

      setIsToggling(true);
      setToggleError(null);

      try {
        // ✅ Check authentication first
        console.log("🔐 Checking authentication before inference toggle...");
        const authResult = await checkInferenceAuth();

        if (!authResult?.can_use_inference) {
          console.log("❌ Authentication required for inference");
          showAuthenticationPopup(
            authResult || {
              can_use_inference: false,
              authenticated: false,
              in_required_guild: false,
              error_message: "Authentication required",
              discord_invite_url: "https://discord.gg/your-invite", // Replace with your actual invite
              auth_requirements: {
                discord_login_required: true,
                guild_membership_required: true,
              },
            }
          );

          setToggleError(
            authResult?.error_message ||
              "Authentication required to use inference"
          );
          return false;
        }

        console.log(
          `${retryCount > 0 ? "Retrying" : "Attempting"} to ${
            enabled ? "enable" : "disable"
          } inference for session ${sessionCode}`
        );

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        // ✅ Add auth token
        if (tokens?.access_token) {
          headers["Authorization"] = `Bearer ${tokens.access_token}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          getApiUrl(`api/inference/${sessionCode}/toggle`),
          {
            method: "POST",
            headers,
            body: JSON.stringify({ enabled }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          // ✅ Handle auth errors specifically
          if (response.status === 401) {
            try {
              const errorDetail: AuthErrorDetail = await response.json();
              console.log("🚫 Authentication error:", errorDetail);

              // Show auth popup with specific error
              showAuthenticationPopup({
                can_use_inference: false,
                authenticated: errorDetail.user_authenticated,
                in_required_guild: errorDetail.in_required_guild,
                error_message: errorDetail.message,
                discord_invite_url: errorDetail.discord_invite_url,
                auth_requirements: {
                  discord_login_required: true,
                  guild_membership_required: true,
                },
              });

              throw new Error(errorDetail.message);
            } catch (parseError) {
              throw new Error("Authentication required");
            }
          }

          let errorMessage = `Server error: ${response.status}`;
          try {
            const errorData = await response.text();
            if (errorData) {
              errorMessage += ` - ${errorData}`;
            }
          } catch (parseError) {
            console.warn("Could not parse error response", parseError);
          }
          throw new Error(errorMessage);
        }

        const data: ToggleResponse = await response.json();

        if (data.status !== "ok") {
          throw new Error(`Unexpected response status: ${data.status}`);
        }

        // Update state with server response
        setIsInferenceEnabled(data.inference_enabled);
        setRetryCount(0);

        console.log(
          `✅ Successfully ${
            data.inference_enabled ? "enabled" : "disabled"
          } inference for session ${sessionCode} (user: ${
            data.authenticated_user
          })`
        );

        return true;
      } catch (error) {
        console.error("❌ Error toggling inference:", error);

        let errorMessage = "Unknown error occurred";

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            errorMessage = "Request timed out. Please check your connection.";
          } else if (error.message.includes("Failed to fetch")) {
            errorMessage =
              "Network error. Please check if the server is running.";
          } else if (
            error.message.includes("Authentication") ||
            error.message.includes("Discord")
          ) {
            errorMessage = error.message; // Keep auth error messages as-is
          } else if (error.message.includes("404")) {
            errorMessage =
              "Inference service not found. Please check server configuration.";
          } else if (error.message.includes("500")) {
            errorMessage =
              "Server error. Please try again or check server logs.";
          } else {
            errorMessage = error.message;
          }
        }

        setToggleError(errorMessage);

        // ✅ Don't retry auth errors
        if (
          errorMessage.includes("Authentication") ||
          errorMessage.includes("Discord")
        ) {
          return false;
        }

        // Retry logic for non-auth errors
        if (retryCount < MAX_RETRIES) {
          setRetryCount((prev) => prev + 1);
          console.log(
            `🔄 Retrying in ${RETRY_DELAY}ms... (${
              retryCount + 1
            }/${MAX_RETRIES})`
          );

          setTimeout(() => {
            toggleInference(enabled);
          }, RETRY_DELAY);
        }

        return false;
      } finally {
        setIsToggling(false);
      }
    },
    [
      sessionCode,
      retryCount,
      tokens,
      checkInferenceAuth,
      showAuthenticationPopup,
    ]
  );

  // ✅ Enhanced status check with auth
  const checkInferenceStatus = useCallback(
    async (sessionCode: string): Promise<InferenceStatus | null> => {
      if (!sessionCode || sessionCode.length !== 4) return null;

      try {
        const headers: HeadersInit = {
          Accept: "application/json",
        };

        // Add auth token if available
        if (tokens?.access_token) {
          headers["Authorization"] = `Bearer ${tokens.access_token}`;
        }

        const response = await fetch(
          getApiUrl(`api/inference/${sessionCode}/status`),
          {
            method: "GET",
            headers,
            signal: AbortSignal.timeout(5000),
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(
              `Inference service not found for session ${sessionCode}`
            );
            return null;
          }
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data: InferenceStatus = await response.json();

        setIsInferenceEnabled(data.inference_enabled);
        setHasYoloService(data.has_yolo_service);
        setLastCheckedSession(sessionCode);
        setToggleError(null);

        console.log(`📊 Inference status for ${sessionCode}:`, {
          enabled: data.inference_enabled,
          yolo: data.has_yolo_service,
          auth: data.auth_status,
        });

        return data;
      } catch (error) {
        console.warn("Failed to get inference status:", error);

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            setToggleError("Status check timed out");
          } else if (error.message.includes("Failed to fetch")) {
            setToggleError("Cannot connect to server");
          }
        }

        return null;
      }
    },
    [tokens]
  );

  // ✅ Auto-check auth status when session code changes
  useEffect(() => {
    if (sessionCode && sessionCode !== lastCheckedSession) {
      console.log(
        `🔍 Checking inference status for new session: ${sessionCode}`
      );
      checkInferenceStatus(sessionCode);
      checkInferenceAuth();
    }
  }, [
    sessionCode,
    lastCheckedSession,
    checkInferenceStatus,
    checkInferenceAuth,
  ]);

  // ✅ Re-check auth when Discord auth state changes
  useEffect(() => {
    if (sessionCode) {
      console.log("🔄 Discord auth state changed, re-checking inference auth");
      checkInferenceAuth();
    }
  }, [
    isAuthenticated,
    isInRequiredGuild,
    tokens,
    sessionCode,
    checkInferenceAuth,
  ]);

  return {
    isInferenceEnabled,
    hasYoloService,
    isToggling,
    toggleError,
    retryCount,
    lastCheckedSession,
    authCheckResult,
    showAuthPopup,
    toggleInference,
    checkInferenceStatus,
    checkInferenceAuth,
    clearError: () => setToggleError(null),
  };
};
