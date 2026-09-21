import { describe, expect, it } from "vitest";
import { STACK_CATALOG } from "./catalog";
import { scoreStackOptions, topN, type QuestionnaireAnswers } from "./scoring";

describe("scoreStackOptions", () => {
  it("is deterministic for identical inputs", () => {
    const answers: QuestionnaireAnswers = {
      teamSize: "solo",
      budgetTier: "low",
      timelineWeeks: 3,
      platformTargets: ["web"],
      realtimeNeeds: false,
    };

    const first = scoreStackOptions(STACK_CATALOG, answers);
    const second = scoreStackOptions(STACK_CATALOG, answers);

    expect(first).toEqual(second);
  });

  it("penalizes options without mobile support when mobile is requested", () => {
    const answers: QuestionnaireAnswers = {
      teamSize: "solo",
      budgetTier: "low",
      timelineWeeks: 8,
      platformTargets: ["mobile"],
      realtimeNeeds: false,
    };

    const scored = scoreStackOptions(STACK_CATALOG, answers);
    const expo = scored.find((s) => s.slug === "expo-supabase")!;
    const astro = scored.find((s) => s.slug === "astro-static")!;

    expect(expo.score).toBeGreaterThan(astro.score);
  });

  it("ranks the solo/low-budget/short-timeline web case with a low-friction stack on top", () => {
    const answers: QuestionnaireAnswers = {
      teamSize: "solo",
      budgetTier: "low",
      timelineWeeks: 2,
      platformTargets: ["web"],
      realtimeNeeds: false,
    };

    const [best] = topN(scoreStackOptions(STACK_CATALOG, answers), 1);
    const bestOption = STACK_CATALOG.find((o) => o.slug === best.slug)!;

    expect(bestOption.tags.learningCurve).toBe("low");
  });

  it("prefers realtime-capable stacks when realtime is required", () => {
    const answers: QuestionnaireAnswers = {
      teamSize: "small",
      budgetTier: "medium",
      timelineWeeks: 8,
      platformTargets: ["web"],
      realtimeNeeds: true,
    };

    const scored = scoreStackOptions(STACK_CATALOG, answers);
    const realtimeOption = scored.find(
      (s) => s.slug === "nextjs-supabase-realtime",
    )!;
    const nonRealtimeOption = scored.find(
      (s) => s.slug === "nextjs-supabase",
    )!;

    expect(realtimeOption.score).toBeGreaterThan(nonRealtimeOption.score);
  });

  it("doesn't rank a mobile-capable stack above a pure-web match when mobile wasn't requested", () => {
    // Regression: expo-supabase and nextjs-supabase-realtime used to tie
    // at this exact input, and alphabetical tie-breaking let the
    // unrequested-mobile option win purely on its slug.
    const answers: QuestionnaireAnswers = {
      teamSize: "small",
      budgetTier: "medium",
      timelineWeeks: 8,
      platformTargets: ["web"],
      realtimeNeeds: true,
    };

    const [best] = topN(scoreStackOptions(STACK_CATALOG, answers), 1);
    const bestOption = STACK_CATALOG.find((o) => o.slug === best.slug)!;

    expect(bestOption.tags.mobileSupport).toBe(false);
  });
});
