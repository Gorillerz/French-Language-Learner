import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt" so a new version waits for the app to close rather than
      // reloading the page in the middle of a study session.
      registerType: "prompt",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "French Learning",
        short_name: "French",
        description: "Private French vocabulary and grammar practice.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#1f3a8a",
        background_color: "#f6f7fb",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
