// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/offer": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/upload": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      // Add these new proxy routes
      "/api/capture-frame": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/api/capture-stats": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8080", // Your Python server URL
        changeOrigin: true,
      },
    },
  },
});
