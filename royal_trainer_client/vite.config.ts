import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// vite.config.ts - Updated to proxy to remote server
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Allow external connections
    proxy: {
      // 🔄 WebSocket → Remote FastAPI Server
      "/ws": {
        target: "http://35.208.133.112:8080",
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
        target: "http://35.208.133.112:8080",
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
        target: "http://35.208.133.112:8080",
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
        target: "http://35.208.133.112:8080",
        changeOrigin: true,
        secure: false,
        timeout: 15000, // 15 second timeout for static files
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("🔴 Static files proxy error:", err);
          });
        },
      },

      // 🛡️ Security logging endpoint (if you add server-side logging)
      "/security": {
        target: "http://35.208.133.112:8080",
        changeOrigin: true,
        secure: false,
        timeout: 5000,
      },
    },
    // CORS configuration for development
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
    },
  },

  // Build configuration for production
  build: {
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
  },

  // Environment variables
  define: {
    __REMOTE_SERVER_URL__: JSON.stringify("http://35.208.133.112:8080"),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __IS_PRODUCTION__: JSON.stringify(process.env.NODE_ENV === "production"),
  },

  // Preview configuration (for production builds)
  preview: {
    port: 3000,
    host: true,
    proxy: {
      // Same proxy configuration for preview mode
      "/ws": {
        target: "http://35.208.133.112:8080",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "http://35.208.133.112:8080",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/health": {
        target: "http://35.208.133.112:8080",
        changeOrigin: true,
        secure: false,
      },
      "/static": {
        target: "http://35.208.133.112:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
