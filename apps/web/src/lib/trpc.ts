import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@project-planner/api";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
});
