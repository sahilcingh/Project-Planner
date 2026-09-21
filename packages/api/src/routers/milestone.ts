import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db, milestones, projects, tasks } from "@project-planner/db";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const milestoneRouter = router({
  create: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, ctx.userId)));
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await db
        .select({ order: milestones.order })
        .from(milestones)
        .where(eq(milestones.projectId, input.projectId));
      const nextOrder = existing.reduce((max, m) => Math.max(max, m.order), -1) + 1;

      const [milestone] = await db
        .insert(milestones)
        .values({ projectId: input.projectId, title: input.title, order: nextOrder })
        .returning();

      return milestone;
    }),

  delete: protectedProcedure
    .input(z.object({ milestoneId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select({ ownerId: projects.ownerId })
        .from(milestones)
        .innerJoin(projects, eq(milestones.projectId, projects.id))
        .where(eq(milestones.id, input.milestoneId));
      if (!row || row.ownerId !== ctx.userId) throw new TRPCError({ code: "NOT_FOUND" });

      await db.transaction(async (tx) => {
        await tx.delete(tasks).where(eq(tasks.milestoneId, input.milestoneId));
        await tx.delete(milestones).where(eq(milestones.id, input.milestoneId));
      });

      return { milestoneId: input.milestoneId };
    }),
});
