"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import AnimatedButton from "@/components/ui/animated-button";
import { BorderBeam } from "@/components/ui/border-beam";
import StatsCounter from "@/components/ui/stats-counter";

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  taskCount: number;
  doneCount: number;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trpc.project.list
      .query()
      .then(setProjects)
      .catch((err) => {
        if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
          router.push("/login");
          return;
        }
        setError("Couldn't load your projects.");
      });
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your projects</h1>
        <Link href="/projects/new">
          <AnimatedButton type="button" className="px-3 py-1.5 text-sm">
            New project
          </AnimatedButton>
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {projects && projects.length === 0 && (
        <p className="text-sm text-gray-500">
          No projects yet.{" "}
          <Link href="/projects/new" className="underline">
            Create your first one
          </Link>
          .
        </p>
      )}

      {projects && projects.length > 0 && (
        <ul className="flex flex-col gap-3">
          {projects.map((p) => {
            const percent = p.taskCount === 0 ? 0 : Math.round((p.doneCount / p.taskCount) * 100);
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="relative block overflow-hidden rounded border p-4 hover:border-gray-400"
                >
                  <BorderBeam className="pointer-events-none" />
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-medium">{p.name}</h2>
                    <span className="text-xs text-gray-500">{p.status}</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded bg-gray-100">
                    <div
                      className="h-2 rounded bg-black"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {p.doneCount}/{p.taskCount} tasks done (
                    <StatsCounter value={percent} duration={0.8} suffix="%" />)
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
