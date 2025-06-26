import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";

// vite.config.ts - Updated for both local proxy and remote deployment
export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), "");

  // Check if we should force remote URL (for testing remote connection locally)
  const forceRemoteUrl = env.VITE_FORCE_REMOTE_URL === "true";
  const isProduction = mode === "production";
  const useProxy = !isProduction && !forceRemoteUrl;

  console.log("🔧 Vite Config:", {
    mode,
    command,
    forceRemoteUrl,
    isProduction,
    useProxy,
    remoteHost: env.VITE_REMOTE_HOST || "35.208.133.112",
    remotePort: env.VITE_REMOTE_PORT || "8080",
  });

  // Base target URL for proxy
  const proxyTarget = `http://${env.VITE_REMOTE_HOST || "35.208.133.112"}:${
    env.VITE_REMOTE_PORT || "8080"
  }`;

  // Proxy configuration
  const proxyConfig: Record<string, ProxyOptions> = {
    // 🔄 WebSocket → Remote FastAPI Server
    "/ws": {
      target: proxyTarget,
      ws: true,
      changeOrigin: true,
      secure: false,
      timeout: 60000, // 60 second timeout for WebSocket connections
      configure: (proxy, _options) => {
        proxy.on("error", (err, _req, _res) => {
          console.log("🔴 WebSocket proxy error:", err);
        });
        proxy.on("proxyReq", (_, req, _res) => {
          console.log("🔄 WebSocket proxy request:", req.method, req.url);
        });
      },
    },

    // 🧠 API endpoints for inference → Remote Server
    "/api": {
      target: proxyTarget,
      changeOrigin: true,
      secure: false,
      ws: true,
      timeout: 30000, // 30 second timeout for API calls
      configure: (proxy, _options) => {
        proxy.on("error", (err, _req, _res) => {
          console.log("🔴 API proxy error:", err);
        });
        proxy.on("proxyReq", (_, req, _res) => {
          console.log("🚀 API proxy request:", req.method, req.url);
        });
      },
    },

    // 🏥 Health check endpoint → Remote Server
    "/health": {
      target: proxyTarget,
      changeOrigin: true,
      secure: false,
      timeout: 10000, // 10 second timeout for health checks
      configure: (proxy, _options) => {
        proxy.on("error", (err, _req, _res) => {
          console.log("🔴 Health check proxy error:", err);
        });
      },
    },

    // 📁 Static files → Remote Server
    "/static": {
      target: proxyTarget,
      changeOrigin: true,
      secure: false,
      timeout: 15000, // 15 second timeout for static files
      configure: (proxy, _options) => {
        proxy.on("error", (err, _req, _res) => {
          console.log("🔴 Static files proxy error:", err);
        });
      },
    },
  };

  return {
    plugins: [react()],

    // ✅ CRITICAL: Explicitly configure public directory handling
    publicDir: "public",

    // Environment variables
    define: {
      __REMOTE_SERVER_URL__: JSON.stringify(proxyTarget),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __IS_PRODUCTION__: JSON.stringify(isProduction),
      __USE_PROXY__: JSON.stringify(useProxy),
    },

    server: {
      port: 3000,
      host: true, // Allow external connections
      // Conditionally add proxy only when needed
      ...(useProxy && { proxy: proxyConfig }),
      // CORS configuration for development
      cors: {
        origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
        credentials: true,
      },
    },

    // ✅ ENHANCED: Build configuration for production with proper asset handling
    build: {
      outDir: "dist",
      assetsDir: "assets",

      // ✅ CRITICAL: Ensure public directory is copied to dist
      copyPublicDir: true,

      // ✅ CRITICAL: Don't inline any assets to prevent path issues
      assetsInlineLimit: 0,

      // Optimize for production
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: false, // Keep console logs for security monitoring
          drop_debugger: true,
        },
      },

      // Source maps for debugging (disable in production for security)
      sourcemap: false,

      // Chunk size warnings
      chunkSizeWarningLimit: 1000,

      // ✅ ENHANCED: Rollup options for proper asset handling
      rollupOptions: {
        output: {
          // Ensure proper asset handling
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split(".") || [];
            const ext = info[info.length - 1];

            // Keep images in their original structure when possible
            if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }

            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
        },
      },
    },

    // Preview configuration (for production builds)
    preview: {
      port: 3000,
      host: true,
      // No proxy for preview - it should use the environment configuration
    },
  };
});
