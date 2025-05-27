import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // 🔄 WebSocket → FastAPI
      "/ws": {
        target: "http://localhost:8080", // ← HTTP, not WS
        ws: true,
        changeOrigin: true,
        secure: false, // ← dev-only
      },

      // REST endpoints (unchanged)
      "/health": { target: "http://localhost:8080", changeOrigin: true },
      "/static": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
});
