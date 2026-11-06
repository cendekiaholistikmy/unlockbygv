import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The site is served from https://cendekiaholistikmy.github.io/unlockbygv/
// so every asset path is prefixed with /unlockbygv/.
export default defineConfig({
  base: "/unlockbygv/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
