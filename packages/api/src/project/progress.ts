export type TaskStatus = "todo" | "in_progress" | "done";

export type Progress = {
  done: number;
  total: number;
  percent: number;
};

/**
 * Pure roll-up used for both per-project and per-milestone progress —
 * same tasks, just a different subset passed in by the caller.
 */
export function computeProgress(tasks: { status: TaskStatus }[]): Progress {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}
