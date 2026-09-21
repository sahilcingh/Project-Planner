import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import { questionnaireSchema, getTop3 } from "../stack-advisor/questionnaire";
import {
  generateRationale,
  RationaleUnavailableError,
} from "../stack-advisor/rationale";

export const stackAdvisorRouter = router({
  recommend: publicProcedure
    .input(questionnaireSchema)
    .query(({ input }) => ({ top3: getTop3(input) })),

  // Separate from `recommend` on purpose: the deterministic ranking above
  // must stay usable with zero AI dependency. This procedure layers a
  // local model call on top, purely for readable rationale text.
  explain: publicProcedure
    .input(questionnaireSchema)
    .mutation(async ({ input }) => {
      const top3 = getTop3(input);
      try {
        const rationale = await generateRationale(top3, input);
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
});
