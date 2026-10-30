import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  const routes = [
    "/",
    "/app",
    "/app/evidence",
    "/app/excavate",
    "/app/excavations",
    "/app/roadmap",
    "/app/settings",
  ];

  for (const route of routes) {
    it(`matches an explicit page for ${route} instead of falling back to root/not-found`, () => {
      const matches = router.matchRoutes(route);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    });
  }
});
