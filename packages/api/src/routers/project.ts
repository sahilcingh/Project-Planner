import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { db, milestones, projects, stackDecisions, tasks } from "@project-planner/db";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { STACK_CATALOG } from "../stack-advisor/catalog";
import { getTop3, questionnaireSchema } from "../stack-advisor/questionnaire";
import {
  generateRationale,
  RationaleUnavailableError,
  type RankedOption,
} from "../stack-advisor/rationale";
import { generateStarterPlan } from "../stack-advisor/starter-plan";

const uuid = z.string().uuid();

async function requireOwnedProject(projectId: string, ownerId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });
  return project;
}

export const projectRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        questionnaire: questionnaireSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const top3 = getTop3(input.questionnaire);

      const [project] = await db
        .insert(projects)
        .values({
          ownerId: ctx.userId,
          name: input.name,
          description: input.description,
        })
        .returning();

      const [decision] = await db
        .insert(stackDecisions)
        .values({
          projectId: project.id,
          version: 1,
          questionnaireAnswers: input.questionnaire,
          rankedOptions: top3.map(({ slug, score, reasons }) => ({
            slug,
            score,
            reasons,
          })),
        })
        .returning();

      return { projectId: project.id, decisionId: decision.id, top3 };
    }),

  generateRationale: protectedProcedure
    .input(z.object({ projectId: uuid, decisionId: uuid }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedProject(input.projectId, ctx.userId);

      const [decision] = await db
        .select()
        .from(stackDecisions)
        .where(
          and(
            eq(stackDecisions.id, input.decisionId),
            eq(stackDecisions.projectId, input.projectId),
          ),
        );
      if (!decision) throw new TRPCError({ code: "NOT_FOUND" });

      const ranked: RankedOption[] = decision.rankedOptions.map((r) => ({
        ...r,
        option: STACK_CATALOG.find((o) => o.slug === r.slug)!,
      }));

      try {
        const rationale = await generateRationale(ranked, decision.questionnaireAnswers);
        await db
          .update(stackDecisions)
          .set({ rationale })
          .where(eq(stackDecisions.id, decision.id));
        return { rationale };
      } catch (err) {
        if (err instanceof RationaleUnavailableError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err.message,
          });
        }
        throw err;
      }
    }),

  acceptStack: protectedProcedure
    .input(
      z.object({
        projectId: uuid,
        decisionId: uuid,
        slug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOwnedProject(input.projectId, ctx.userId);

      const option = STACK_CATALOG.find((o) => o.slug === input.slug);
      if (!option) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown stack slug" });
      }

      const plan = generateStarterPlan(option);

      await db.transaction(async (tx) => {
        await tx
          .update(stackDecisions)
          .set({ chosenSlug: input.slug })
          .where(eq(stackDecisions.id, input.decisionId));

        for (const [milestoneIndex, m] of plan.entries()) {
          const [milestone] = await tx
            .insert(milestones)
            .values({ projectId: input.projectId, title: m.title, order: milestoneIndex })
            .returning();

          await tx.insert(tasks).values(
            m.tasks.map((title, taskIndex) => ({
              projectId: input.projectId,
              milestoneId: milestone.id,
              title,
              order: taskIndex,
            })),
          );
        }

        await tx
          .update(projects)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(projects.id, input.projectId));
      });

      return { projectId: input.projectId };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.query.projects.findMany({
      where: eq(projects.ownerId, ctx.userId),
      orderBy: desc(projects.createdAt),
      with: { tasks: true },
    });

    return rows.map(({ tasks: projectTasks, ...project }) => ({
      ...project,
      taskCount: projectTasks.length,
      doneCount: projectTasks.filter((t) => t.status === "done").length,
    }));
  }),

  get: protectedProcedure.input(z.object({ id: uuid })).query(async ({ ctx, input }) => {
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, input.id), eq(projects.ownerId, ctx.userId)),
      with: {
        milestones: {
          orderBy: (m, { asc }) => asc(m.order),
          with: { tasks: { orderBy: (t, { asc }) => asc(t.order) } },
        },
        stackDecisions: { orderBy: desc(stackDecisions.createdAt), limit: 1 },
      },
    });
    if (!project) throw new TRPCError({ code: "NOT_FOUND" });
    return project;
  }),
});
