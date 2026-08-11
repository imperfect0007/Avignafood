// @lovable.dev/vite-tanstack-config already includes TanStack/React/Tailwind plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  },
});
