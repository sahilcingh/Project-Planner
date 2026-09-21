import type { StackOptionSeed } from "./catalog";

export type QuestionnaireAnswers = {
  teamSize: "solo" | "small" | "medium" | "large";
  budgetTier: "free" | "low" | "medium" | "high";
  timelineWeeks: number;
  platformTargets: ("web" | "mobile" | "desktop" | "api")[];
  realtimeNeeds: boolean;
};

export type ScoredOption = {
  slug: string;
  score: number;
  reasons: string[];
};

/**
 * Deterministic, explainable scoring pass — no AI call in the ranking
 * itself, so the same answers always produce the same ranking and every
 * point is traceable to a reason. An AI call only turns the top results
 * into prose afterwards.
 */
export function scoreStackOptions(
  catalog: StackOptionSeed[],
  answers: QuestionnaireAnswers,
): ScoredOption[] {
  const wantsMobile = answers.platformTargets.includes("mobile");
  const shortTimeline = answers.timelineWeeks <= 4;

  const scored = catalog.map((option) => {
    let score = 0;
    const reasons: string[] = [];

    if (option.tags.teamSize.includes(answers.teamSize)) {
      score += 2;
      reasons.push(`fits a ${answers.teamSize} team`);
    }

    if (option.tags.budgetTier.includes(answers.budgetTier)) {
      score += 2;
      reasons.push(`fits a ${answers.budgetTier} budget`);
    }

    if (answers.realtimeNeeds === option.tags.realtime) {
      score += 2;
      if (answers.realtimeNeeds) reasons.push("supports realtime needs");
    } else if (answers.realtimeNeeds && !option.tags.realtime) {
      score -= 2;
    }

    if (wantsMobile) {
      if (option.tags.mobileSupport) {
        score += 3;
        reasons.push("supports mobile");
      } else {
        score -= 3;
      }
    } else if (option.tags.mobileSupport) {
      // Not a great fit signal on its own, but at equal scores this
      // stops an unrequested-mobile stack from beating a pure-web one
      // on nothing but alphabetical luck (see catalog.ts "expo-supabase").
      score -= 1;
    }

    if (shortTimeline) {
      if (option.tags.learningCurve === "low") {
        score += 2;
        reasons.push("low learning curve for a tight timeline");
      } else if (option.tags.learningCurve === "high") {
        score -= 2;
      }
    }

    return { slug: option.slug, score, reasons };
  });

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.slug.localeCompare(b.slug);
  });
}

export function topN(scored: ScoredOption[], n: number): ScoredOption[] {
  return scored.slice(0, n);
}
