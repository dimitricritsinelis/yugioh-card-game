/// <reference path="./vite.config.d.ts" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = ".";

function copyPublicAssets() {
  return {
    name: "copy-public-assets",
    apply: "build" as const,
    async closeBundle() {
      const distDir = resolve(projectRoot, "dist");

      await mkdir(distDir, { recursive: true });
      await Promise.all([
        cp(resolve(projectRoot, "public", "yugioh_cards"), resolve(distDir, "yugioh_cards"), { recursive: true }),
        cp(resolve(projectRoot, "public", "audio"), resolve(distDir, "audio"), { recursive: true }),
        cp(resolve(projectRoot, "public", "board-bg.jpg"), resolve(distDir, "board-bg.jpg")),
      ]);
    },
  };
}

export default defineConfig({
  plugins: [react(), copyPublicAssets()],
  build: {
    copyPublicDir: false,
  },
  server: {
    fs: {
      allow: ["."],
    },
  },
});
