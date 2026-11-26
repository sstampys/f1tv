import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    // Preload a route's code on hover/focus so navigation feels instant. Data is
    // prefetched separately, through the browser data layer.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
