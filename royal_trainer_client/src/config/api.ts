// royal_trainer_client/src/config/api.ts
interface ApiConfig {
  baseUrl: string;
  wsUrl: string;
  isProduction: boolean;
}

const getApiConfig = (): ApiConfig => {
  const isProduction = import.meta.env.PROD;
  // const isDevelopment = import.meta.env.DEV;

  // Force remote server URL from environment variable if set
  const forceRemoteUrl = import.meta.env.VITE_FORCE_REMOTE_URL === "true";

  if (isProduction || forceRemoteUrl) {
    // Production/Vercel: Direct connection to remote server
    const remoteHost = import.meta.env.VITE_REMOTE_HOST || "35.208.133.112";
    const remotePort = import.meta.env.VITE_REMOTE_PORT || "8080";
    const protocol =
      import.meta.env.VITE_USE_HTTPS === "true" ? "https" : "http";
    const wsProtocol = import.meta.env.VITE_USE_HTTPS === "true" ? "wss" : "ws";
    console.log(
      `The protocol is ${protocol} and the wsProtocol is ${wsProtocol}`
    );
    console.log(
      `import.meta.env.VITE_USE_HTTPS: `,
      import.meta.env.VITE_USE_HTTPS
    );
    return {
      baseUrl: `${protocol}://${remoteHost}:${remotePort}`,
      wsUrl: `${wsProtocol}://${remoteHost}:${remotePort}`,
      isProduction: true,
    };
  } else {
    // Development: Use local proxy
    return {
      baseUrl: "", // Empty string means relative URLs (proxied by Vite)
      wsUrl: `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
        window.location.host
      }`,
      isProduction: false,
    };
  }
};

export const apiConfig = getApiConfig();

// Helper functions for API calls
export const getApiUrl = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  if (apiConfig.baseUrl) {
    return `${apiConfig.baseUrl}/${cleanPath}`;
  } else {
    return `/${cleanPath}`;
  }
};

export const getWebSocketUrl = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  return `${apiConfig.wsUrl}/${cleanPath}`;
};

// Debug logging
console.log("🔧 API Configuration:", {
  mode: import.meta.env.MODE,
  isProduction: apiConfig.isProduction,
  baseUrl: apiConfig.baseUrl || "(using proxy)",
  wsUrl: apiConfig.wsUrl,
  forceRemote: import.meta.env.VITE_FORCE_REMOTE_URL,
});
