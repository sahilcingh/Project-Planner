import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, type Context } from "@project-planner/api";
import { createClient } from "@/lib/supabase/server";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async (): Promise<Context> => {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      return { userId: data.user?.id ?? null };
    },
  });

export { handler as GET, handler as POST };
