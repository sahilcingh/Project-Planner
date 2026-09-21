"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { computeProgress } from "@project-planner/api/progress";
import { BorderBeam } from "@/components/ui/border-beam";
import { CircularProgress } from "@/components/ui/circular-progress";

type Task = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
};

type Milestone = {
  id: string;
  title: string;
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
        {project.milestones.map((m) => {
          const progress = computeProgress(m.tasks);
          return (
            <div key={m.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-medium">{m.title}</h2>
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
                {m.tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                    <span
                      className={task.status === "done" ? "text-gray-400 line-through" : ""}
                    >
                      {task.title}
                    </span>
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
