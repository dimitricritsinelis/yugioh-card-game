/// <reference path="./vite.config.d.ts" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { handleNodeGameApi } from "./api/game";
import { InMemoryGameStore, OnlineGameService } from "./src/online/server/gameService";

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

function localOnlineApi() {
  let localService: OnlineGameService | null = null;

  function getLocalService(): OnlineGameService {
    if (!localService) {
      localService = new OnlineGameService(new InMemoryGameStore(), {
        seatTokenSalt: "local-dev-seat-token-salt",
      });
    }

    return localService;
  }

  return {
    name: "local-online-api",
    apply: "serve" as const,
    configureServer(server: { middlewares: { use: (path: string, handler: (request: unknown, response: unknown) => void) => void } }) {
      server.middlewares.use("/api/game", (request: unknown, response: unknown) => {
        void handleNodeGameApi(request as never, response as never, {
          service: getLocalService(),
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localOnlineApi(), copyPublicAssets()],
  build: {
    copyPublicDir: false,
  },
  server: {
    fs: {
      allow: ["."],
    },
  },
});
