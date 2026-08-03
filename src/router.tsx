import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();
  const configuredBasePath = import.meta.env.VITE_APP_BASE_PATH?.trim();
  const basepath = configuredBasePath
    ? configuredBasePath.replace(/\/+$/, "") || "/"
    : undefined;

  const router = createRouter({
    routeTree,
    context: { queryClient },
    ...(basepath ? { basepath } : {}),
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
