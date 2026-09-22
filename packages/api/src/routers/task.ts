import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db, milestones, projects, tasks } from "@project-planner/db";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const taskRouter = router({
  create: protectedProcedure
    .input(z.object({ milestoneId: z.string().uuid(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select({ projectId: milestones.projectId, ownerId: projects.ownerId })
        .from(milestones)
        .innerJoin(projects, eq(milestones.projectId, projects.id))
        .where(eq(milestones.id, input.milestoneId));
      if (!row || row.ownerId !== ctx.userId) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await db
        .select({ order: tasks.order })
        .from(tasks)
        .where(eq(tasks.milestoneId, input.milestoneId));
      const nextOrder = existing.reduce((max, t) => Math.max(max, t.order), -1) + 1;

      const [task] = await db
        .insert(tasks)
        .values({
          projectId: row.projectId,
          milestoneId: input.milestoneId,
          title: input.title,
          order: nextOrder,
        })
        .returning();

      return task;
    }),

  delete: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select({ ownerId: projects.ownerId })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(eq(tasks.id, input.taskId));
      if (!row || row.ownerId !== ctx.userId) throw new TRPCError({ code: "NOT_FOUND" });

      await db.delete(tasks).where(eq(tasks.id, input.taskId));
      return { taskId: input.taskId };
    }),

  update: protectedProcedure
    .input(z.object({ taskId: z.string().uuid(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select({ ownerId: projects.ownerId })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(eq(tasks.id, input.taskId));
      if (!row || row.ownerId !== ctx.userId) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await db
        .update(tasks)
        .set({ title: input.title, updatedAt: new Date() })
        .where(eq(tasks.id, input.taskId))
        .returning();

      return updated;
    }),

  reorder: protectedProcedure
    .input(z.object({ milestoneId: z.string().uuid(), taskIds: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .select({ ownerId: projects.ownerId })
        .from(milestones)
        .innerJoin(projects, eq(milestones.projectId, projects.id))
        .where(eq(milestones.id, input.milestoneId));
      if (!row || row.ownerId !== ctx.userId) throw new TRPCError({ code: "NOT_FOUND" });

      await db.transaction(async (tx) => {
        for (const [index, taskId] of input.taskIds.entries()) {
          await tx
            .update(tasks)
            .set({ order: index })
            .where(and(eq(tasks.id, taskId), eq(tasks.milestoneId, input.milestoneId)));
        }
      });

      return { milestoneId: input.milestoneId };
    }),

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
