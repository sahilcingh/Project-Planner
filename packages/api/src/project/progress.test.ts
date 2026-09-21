import { describe, expect, it } from "vitest";
import { computeProgress } from "./progress";

describe("computeProgress", () => {
  it("handles the zero-tasks edge case without dividing by zero", () => {
    expect(computeProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("rounds to the nearest whole percent", () => {
    const tasks = [
      { status: "done" as const },
      { status: "todo" as const },
      { status: "todo" as const },
    ];
    expect(computeProgress(tasks)).toEqual({ done: 1, total: 3, percent: 33 });
  });

  it("reports 100% only when every task is done", () => {
    const allDone = [{ status: "done" as const }, { status: "done" as const }];
    expect(computeProgress(allDone).percent).toBe(100);

    const oneInProgress = [{ status: "done" as const }, { status: "in_progress" as const }];
    expect(computeProgress(oneInProgress).percent).toBe(50);
  });
});
