import { router } from "./trpc";
import { stackAdvisorRouter } from "./routers/stack-advisor";
import { projectRouter } from "./routers/project";
import { taskRouter } from "./routers/task";

export const appRouter = router({
  stackAdvisor: stackAdvisorRouter,
  project: projectRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;
export type { Context } from "./trpc";
export { scoreStackOptions, topN } from "./stack-advisor/scoring";
export type { QuestionnaireAnswers, ScoredOption } from "./stack-advisor/scoring";
export { STACK_CATALOG } from "./stack-advisor/catalog";
export type { StackOptionSeed } from "./stack-advisor/catalog";
export { computeProgress } from "./project/progress";
