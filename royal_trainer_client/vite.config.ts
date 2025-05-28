import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// vite.config.ts - Updated with API proxy for inference endpoints
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // 🔄 WebSocket → FastAPI
      "/ws": {
        target: "http://localhost:8080",
        ws: true,
        changeOrigin: true,
        secure: false,
      },

      // 🧠 API endpoints for inference (NEW)
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        ws: true,
      },

      // REST endpoints (unchanged)
      "/health": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/static": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
