"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { computeProgress } from "@project-planner/api/progress";
import { BorderBeam } from "@/components/ui/border-beam";
import { CircularProgress } from "@/components/ui/circular-progress";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
};

type Milestone = {
  id: string;
  title: string;
  dueDate: string | null;
  tasks: Task[];
};

type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  milestones: Milestone[];
  stackDecisions: { chosenSlug: string | null }[];
};

const STATUS_OPTIONS: Task["status"][] = ["todo", "in_progress", "done"];

function EditableText({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        autoFocus
        className={cn(
          "rounded border border-border bg-background px-1.5 py-0.5",
          className,
        )}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={cn("text-left underline decoration-dotted underline-offset-2", className)}
    >
      {value}
    </button>
  );
}

function ReorderButtons({
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={disableUp}
        aria-label="Move up"
        className="rounded p-0.5 text-gray-400 transition hover:text-foreground disabled:opacity-30"
      >
        <ChevronUp className="size-3.5" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={disableDown}
        aria-label="Move down"
        className="rounded p-0.5 text-gray-400 transition hover:text-foreground disabled:opacity-30"
      >
        <ChevronDown className="size-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    trpc.project.get
      .query({ id })
      .then(setProject)
      .catch((err) => {
        if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
          router.push("/login");
          return;
        }
        setError("Couldn't load this project.");
      });
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(taskId: string, status: Task["status"]) {
    setProject((prev) =>
      prev
        ? {
            ...prev,
            milestones: prev.milestones.map((m) => ({
              ...m,
              tasks: m.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
            })),
          }
        : prev,
    );
    try {
      await trpc.task.updateStatus.mutate({ taskId, status });
    } catch {
      load(); // roll back to server state on failure
    }
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    try {
      await trpc.milestone.create.mutate({ projectId: id, title: newMilestoneTitle.trim() });
      setNewMilestoneTitle("");
      load();
    } catch {
      setError("Couldn't add that milestone.");
    }
  }

  async function handleDeleteMilestone(milestoneId: string) {
    if (!window.confirm("Delete this milestone and all its tasks?")) return;
    try {
      await trpc.milestone.delete.mutate({ milestoneId });
      load();
    } catch {
      setError("Couldn't delete that milestone.");
    }
  }

  async function handleRenameMilestone(milestoneId: string, title: string) {
    setProject((prev) =>
      prev
        ? { ...prev, milestones: prev.milestones.map((m) => (m.id === milestoneId ? { ...m, title } : m)) }
        : prev,
    );
    try {
      await trpc.milestone.update.mutate({ milestoneId, title });
    } catch {
      load();
    }
  }

  async function handleSetDueDate(milestoneId: string, dueDate: string | null) {
    setProject((prev) =>
      prev
        ? { ...prev, milestones: prev.milestones.map((m) => (m.id === milestoneId ? { ...m, dueDate } : m)) }
        : prev,
    );
    try {
      await trpc.milestone.update.mutate({ milestoneId, dueDate });
    } catch {
      load();
    }
  }

  async function handleMoveMilestone(milestoneId: string, direction: -1 | 1) {
    if (!project) return;
    const ids = project.milestones.map((m) => m.id);
    const idx = ids.indexOf(milestoneId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= ids.length) return;
    [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];

    setProject((prev) =>
      prev ? { ...prev, milestones: ids.map((mid) => prev.milestones.find((m) => m.id === mid)!) } : prev,
    );
    try {
      await trpc.milestone.reorder.mutate({ projectId: project.id, milestoneIds: ids });
    } catch {
      load();
    }
  }

  async function handleAddTask(milestoneId: string, e: React.FormEvent) {
    e.preventDefault();
    const title = newTaskTitles[milestoneId]?.trim();
    if (!title) return;
    try {
      await trpc.task.create.mutate({ milestoneId, title });
      setNewTaskTitles((prev) => ({ ...prev, [milestoneId]: "" }));
      load();
    } catch {
      setError("Couldn't add that task.");
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await trpc.task.delete.mutate({ taskId });
      load();
    } catch {
      setError("Couldn't delete that task.");
    }
  }

  async function handleRenameTask(taskId: string, title: string) {
    setProject((prev) =>
      prev
        ? {
            ...prev,
            milestones: prev.milestones.map((m) => ({
              ...m,
              tasks: m.tasks.map((t) => (t.id === taskId ? { ...t, title } : t)),
            })),
          }
        : prev,
    );
    try {
      await trpc.task.update.mutate({ taskId, title });
    } catch {
      load();
    }
  }

  async function handleMoveTask(milestoneId: string, taskId: string, direction: -1 | 1) {
    if (!project) return;
    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;
    const ids = milestone.tasks.map((t) => t.id);
    const idx = ids.indexOf(taskId);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= ids.length) return;
    [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];

    setProject((prev) =>
      prev
        ? {
            ...prev,
            milestones: prev.milestones.map((m) =>
              m.id === milestoneId ? { ...m, tasks: ids.map((tid) => m.tasks.find((t) => t.id === tid)!) } : m,
            ),
          }
        : prev,
    );
    try {
      await trpc.task.reorder.mutate({ milestoneId, taskIds: ids });
    } catch {
      load();
    }
  }

  if (error) return <p className="p-16 text-sm text-red-600">{error}</p>;
  if (!project) return <p className="p-16 text-sm text-gray-500">Loading...</p>;

  const allTasks = project.milestones.flatMap((m) => m.tasks);
  const overall = computeProgress(allTasks);
  const chosenSlug = project.stackDecisions[0]?.chosenSlug;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/projects" className="text-xs text-gray-500 underline">
          &larr; All projects
        </Link>
        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <span className="text-xs text-gray-500">{project.status}</span>
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-gray-500">{project.description}</p>
        )}
        {chosenSlug && (
          <p className="mt-1 text-xs text-gray-400">Stack: {chosenSlug}</p>
        )}
      </div>

      <div className="relative flex items-center gap-4 overflow-hidden rounded-xl border border-border p-4">
        <BorderBeam className="pointer-events-none" />
        <CircularProgress percent={overall.percent} size={56} strokeWidth={4} />
        <div>
          <p className="text-sm font-medium">Overall progress</p>
          <p className="text-xs text-gray-500">
            {overall.done}/{overall.total} tasks done
          </p>
        </div>
      </div>

      {project.milestones.length === 0 && (
        <p className="text-sm text-gray-500">
          No milestones yet &mdash; add one below to start tracking.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {project.milestones.map((m, milestoneIndex) => {
          const progress = computeProgress(m.tasks);
          return (
            <div key={m.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ReorderButtons
                    onMoveUp={() => handleMoveMilestone(m.id, -1)}
                    onMoveDown={() => handleMoveMilestone(m.id, 1)}
                    disableUp={milestoneIndex === 0}
                    disableDown={milestoneIndex === project.milestones.length - 1}
                  />
                  <div>
                    <EditableText
                      value={m.title}
                      onSave={(title) => handleRenameMilestone(m.id, title)}
                      className="font-medium"
                    />
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      Due
                      <input
                        type="date"
                        value={m.dueDate ?? ""}
                        onChange={(e) => handleSetDueDate(m.id, e.target.value || null)}
                        className="rounded border border-border bg-background px-1 py-0.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {progress.done}/{progress.total}
                  </span>
                  <CircularProgress percent={progress.percent} size={28} strokeWidth={2.5} />
                  <button
                    type="button"
                    onClick={() => handleDeleteMilestone(m.id)}
                    aria-label="Delete milestone"
                    className="rounded p-1 text-gray-400 transition hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {m.tasks.map((task, taskIndex) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <ReorderButtons
                        onMoveUp={() => handleMoveTask(m.id, task.id, -1)}
                        onMoveDown={() => handleMoveTask(m.id, task.id, 1)}
                        disableUp={taskIndex === 0}
                        disableDown={taskIndex === m.tasks.length - 1}
                      />
                      <EditableText
                        value={task.title}
                        onSave={(title) => handleRenameTask(task.id, title)}
                        className={task.status === "done" ? "text-gray-400 line-through" : ""}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded border border-border bg-background px-2 py-1 text-xs"
                        value={task.status}
                        onChange={(e) =>
                          handleStatusChange(task.id, e.target.value as Task["status"])
                        }
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        aria-label="Delete task"
                        className="rounded p-1 text-gray-400 transition hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <form
                onSubmit={(e) => handleAddTask(m.id, e)}
                className="mt-3 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Add a task"
                  className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring/40"
                  value={newTaskTitles[m.id] ?? ""}
                  onChange={(e) =>
                    setNewTaskTitles((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  aria-label="Add task"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border transition hover:bg-foreground/5"
                >
                  <Plus className="size-3.5" strokeWidth={1.5} />
                </button>
              </form>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAddMilestone} className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Add a milestone"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring/40"
          value={newMilestoneTitle}
          onChange={(e) => setNewMilestoneTitle(e.target.value)}
        />
        <button
          type="submit"
          aria-label="Add milestone"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border transition hover:bg-foreground/5"
        >
          <Plus className="size-4" strokeWidth={1.5} />
        </button>
      </form>
    </main>
  );
}
