import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";

const basePath = process.env.VITE_APP_BASE_PATH?.trim() || "/";

export default defineConfig({
  root: "staging",
  base: basePath.endsWith("/") ? basePath : `${basePath}/`,
  publicDir: "../public",
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "../src/routes",
      generatedRouteTree: "../src/routeTree.gen.ts",
      routeTreeFileFooter: [
        "",
        "import type { getRouter } from './router.tsx'",
        "import type { startInstance } from './start.ts'",
        "declare module '@tanstack/react-start' {",
        "  interface Register {",
        "    ssr: true",
        "    router: Awaited<ReturnType<typeof getRouter>>",
        "    config: Awaited<ReturnType<typeof startInstance.getOptions>>",
        "  }",
        "}",
      ],
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  build: {
    outDir: "../dist-staging",
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
  },
});
