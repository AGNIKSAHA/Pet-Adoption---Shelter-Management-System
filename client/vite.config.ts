import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom") ||
              id.includes("react-redux") ||
              id.includes("@reduxjs/toolkit")
            ) {
              return "vendor-react";
            }
            if (id.includes("lucide-react") || id.includes("clsx")) {
              return "vendor-ui";
            }
            if (
              id.includes("axios") ||
              id.includes("@tanstack/react-query") ||
              id.includes("zod") ||
              id.includes("@hookform")
            ) {
              return "vendor-utils";
            }
            // Other node_modules
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
