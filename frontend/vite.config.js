import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configure React compilation, production output, and local API forwarding.
export default defineConfig({
  // Transform JSX using Vite's official React plugin.
  plugins: [react()],
  // Django serves compiled frontend assets below /static/.
  base: "/static/",
  build: {
    // Place production files where Django's template/static settings expect them.
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    // Forward development API calls to the local Django server.
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
