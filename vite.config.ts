import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: 'auto', // CRÍTICO: Asegura que el instalador de la app se ejecute
      includeAssets: ["placeholder.svg"], // Solo incluimos el SVG que sabemos que tienes
      manifest: {
        name: "My Life NB",
        short_name: "MyLifeNB",
        description: "Sistema personal de optimización de vida y roadmap de objetivos",
        theme_color: "#ffffff", // Adaptado a tu nuevo modo claro
        background_color: "#ffffff",
        display: "standalone", // CRÍTICO: Elimina la barra de URL al abrirla como App
        orientation: "portrait",
        icons: [
          {
            src: "placeholder.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable"
          },
          {
            src: "placeholder.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));