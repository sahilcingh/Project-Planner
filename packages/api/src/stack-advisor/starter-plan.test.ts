import { describe, expect, it } from "vitest";
import { STACK_CATALOG } from "./catalog";
import { generateStarterPlan } from "./starter-plan";

describe("generateStarterPlan", () => {
  it("is deterministic for the same stack option", () => {
    const option = STACK_CATALOG.find((o) => o.slug === "nextjs-supabase")!;
    expect(generateStarterPlan(option)).toEqual(generateStarterPlan(option));
  });

  it("mentions the stack's own components in setup/deploy tasks", () => {
    const option = STACK_CATALOG.find((o) => o.slug === "nextjs-supabase")!;
    const plan = generateStarterPlan(option);

    const setup = plan.find((m) => m.title === "Project setup")!;
    expect(setup.tasks.some((t) => t.includes("Next.js"))).toBe(true);
    expect(setup.tasks.some((t) => t.includes("Supabase Auth"))).toBe(true);

    const deploy = plan.find((m) => m.title === "Deploy")!;
    expect(deploy.tasks.some((t) => t.includes("Vercel"))).toBe(true);
  });

  it("still produces a usable plan for a stack with missing components (e.g. a static site)", () => {
    const option = STACK_CATALOG.find((o) => o.slug === "astro-static")!;
    const plan = generateStarterPlan(option);

    expect(plan.every((m) => m.tasks.length > 0)).toBe(true);
  });

  it("covers every catalog entry without throwing", () => {
    for (const option of STACK_CATALOG) {
      const plan = generateStarterPlan(option);
      expect(plan.length).toBeGreaterThan(0);
    }
  });
});
