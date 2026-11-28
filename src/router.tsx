import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Search params are plain strings: `?season=2018`.
 *
 * The router's default serializer quotes any string that happens to parse as
 * JSON — a year does — so the address bar would read `?season=%222018%22`,
 * and a hand written `?season=2018` would come back as a number. Every
 * parameter in this app is a string, so they are written and read as they are.
 */
const stringifySearch = (search: Record<string, unknown>) => {
  const params = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.set(key, typeof value === "string" ? value : JSON.stringify(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
};

const parseSearch = (searchStr: string): Record<string, unknown> => {
  const query = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const parsed: Record<string, unknown> = {};
  query.forEach((value, key) => {
    parsed[key] = value;
  });
  return parsed;
};

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    // Preload a route's code on hover/focus so navigation feels instant. Data is
    // prefetched separately, through the browser data layer.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    stringifySearch,
    parseSearch,
  });

  return router;
};
