import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Превью: всё в одном HTML-файле, без service worker и манифеста.
// Результат: dist-single/index.html (иконка встраивается как data: URI).
const inlineIcon = (): Plugin => ({
  name: "dietvika-inline-icon",
  transformIndexHtml(html) {
    const svg = readFileSync(new URL("./public/icon.svg", import.meta.url), "utf8").trim();
    return html
      .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(svg)}" />`)
      .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, "");
  },
});

export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [react(), inlineIcon(), viteSingleFile()],
  build: { outDir: "dist-single", emptyOutDir: true },
});
