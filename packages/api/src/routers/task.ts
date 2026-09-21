import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db, projects, tasks } from "@project-planner/db";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const taskRouter = router({
  updateStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        status: z.enum(["todo", "in_progress", "done"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select({ ownerId: projects.ownerId })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(eq(tasks.id, input.taskId));

      if (!row || row.ownerId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [updated] = await db
        .update(tasks)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated;
    }),
});
