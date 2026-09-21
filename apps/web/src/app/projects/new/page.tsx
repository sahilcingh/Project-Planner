"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { QuestionnaireFields } from "@/components/questionnaire-fields";
import { RankedOptionsList, type RankedResult } from "@/components/ranked-options-list";
import type { QuestionnaireAnswers } from "@project-planner/api";

type Created = { projectId: string; decisionId: string; top3: RankedResult[] };

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    teamSize: "solo",
    budgetTier: "low",
    timelineWeeks: 4,
    platformTargets: ["web"],
    realtimeNeeds: false,
  });

  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);
  const [rationaleLoading, setRationaleLoading] = useState(false);
  const [acceptingSlug, setAcceptingSlug] = useState<string | null>(null);

  function handleUnauthorized(err: unknown) {
    if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
      router.push("/login");
      return true;
    }
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give your project a name.");
      return;
    }
    if (answers.platformTargets.length === 0) {
      setError("Pick at least one platform target.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await trpc.project.create.mutate({
        name,
        description: description || undefined,
        questionnaire: answers,
      });
      setCreated(result);
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError("Couldn't create the project. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExplain() {
    if (!created) return;
    setRationaleLoading(true);
    try {
      const { rationale } = await trpc.project.generateRationale.mutate({
        projectId: created.projectId,
        decisionId: created.decisionId,
      });
      setRationale(rationale);
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setRationale("Couldn't generate an explanation right now.");
      }
    } finally {
      setRationaleLoading(false);
    }
  }

  async function handleAccept(slug: string) {
    if (!created) return;
    setAcceptingSlug(slug);
    try {
      await trpc.project.acceptStack.mutate({
        projectId: created.projectId,
        decisionId: created.decisionId,
        slug,
      });
      router.push(`/projects/${created.projectId}`);
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError("Couldn't accept that stack. Try again.");
        setAcceptingSlug(null);
      }
    }
  }

  if (created) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Pick a stack for &ldquo;{name}&rdquo;</h1>
          <p className="text-sm text-gray-500">
            Accepting one seeds starter milestones and tasks tailored to it.
          </p>
        </div>

        <RankedOptionsList
          results={created.top3}
          renderAction={(result) => (
            <button
              type="button"
              onClick={() => handleAccept(result.slug)}
              disabled={acceptingSlug !== null}
              className="rounded bg-black px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {acceptingSlug === result.slug ? "Setting up..." : "Accept this stack"}
            </button>
          )}
        />

        <div className="flex flex-col gap-3 rounded border border-dashed p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Why #1? (local AI, optional)</h3>
            <button
              type="button"
              onClick={handleExplain}
              disabled={rationaleLoading}
              className="rounded border px-3 py-1 text-xs font-medium disabled:opacity-50"
            >
              {rationaleLoading ? "Thinking..." : "Generate explanation"}
            </button>
          </div>
          {rationale && <p className="text-sm text-gray-700">{rationale}</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">New project</h1>
        <p className="text-sm text-gray-500">
          Answer a few questions and get a ranked stack recommendation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-sm">
          Project name
          <input
            type="text"
            required
            className="rounded border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Description (optional)
          <textarea
            className="rounded border px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <QuestionnaireFields answers={answers} onChange={setAnswers} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Scoring..." : "Get recommendation"}
        </button>
      </form>
    </main>
  );
}
