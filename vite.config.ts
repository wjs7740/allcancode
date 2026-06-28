import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    cssMinify: "lightningcss",
    rollupOptions: {
      input: "index.html",
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) {
            return "three";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "motion";
          }
          return undefined;
        }
      }
    }
  }
});
