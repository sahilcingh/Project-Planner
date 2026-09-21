import { z } from "zod";
import { STACK_CATALOG } from "./catalog";
import { scoreStackOptions, topN } from "./scoring";
import type { RankedOption } from "./rationale";

export const questionnaireSchema = z.object({
  teamSize: z.enum(["solo", "small", "medium", "large"]),
  budgetTier: z.enum(["free", "low", "medium", "high"]),
  timelineWeeks: z.number().int().positive(),
  platformTargets: z.array(z.enum(["web", "mobile", "desktop", "api"])).min(1),
  realtimeNeeds: z.boolean(),
});

export function getTop3(
  input: z.infer<typeof questionnaireSchema>,
): RankedOption[] {
  const scored = scoreStackOptions(STACK_CATALOG, input);
  return topN(scored, 3).map((result) => {
    const option = STACK_CATALOG.find((o) => o.slug === result.slug)!;
    return { ...result, option };
  });
}
