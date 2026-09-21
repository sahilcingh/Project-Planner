"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { TRPCClientError } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { QuestionnaireFields } from "@/components/questionnaire-fields";
import { RankedOptionsList, type RankedResult } from "@/components/ranked-options-list";
import AnimatedButton from "@/components/ui/animated-button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { STACK_CATALOG } from "@project-planner/api/catalog";
import type { QuestionnaireAnswers } from "@project-planner/api";

type Mode = "advisor" | "manual";

function useUnauthorizedRedirect() {
  const router = useRouter();
  return function handleUnauthorized(err: unknown) {
    if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
      router.push("/login");
      return true;
    }
    return false;
  };
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <span className={cn(step === 1 ? "text-foreground" : "text-gray-400")}>
        1. Project details
      </span>
      <span className="text-gray-400">&rarr;</span>
      <span className={cn(step === 2 ? "text-foreground" : "text-gray-400")}>
        2. Choose a stack
      </span>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border text-foreground hover:bg-foreground/5",
      )}
    >
      {children}
    </button>
  );
}

type Created = { projectId: string; decisionId: string; top3: RankedResult[] };

function AdvisorFlow() {
  const router = useRouter();
  const handleUnauthorized = useUnauthorizedRedirect();
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
      <div className="flex flex-1 flex-col gap-6">
        <StepIndicator step={2} />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Pick a stack for &ldquo;{name}&rdquo;</h1>
          <p className="text-sm text-gray-500">
            Accepting one seeds starter milestones and tasks tailored to it.
          </p>
        </div>

        <RankedOptionsList
          results={created.top3}
          renderAction={(result) => (
            <AnimatedButton
              type="button"
              onClick={() => handleAccept(result.slug)}
              disabled={acceptingSlug !== null}
              className="px-3 py-1.5 text-xs"
            >
              {acceptingSlug === result.slug ? (
                <span className="flex items-center gap-1.5">
                  <Spinner className="size-3" /> Setting up...
                </span>
              ) : (
                "Accept this stack"
              )}
            </AnimatedButton>
          )}
        />

        <div className="flex flex-col gap-3 rounded-xl border border-border p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-4" strokeWidth={1.5} />
              Why #1? (local AI, optional)
            </h3>
            <AnimatedButton
              type="button"
              onClick={handleExplain}
              disabled={rationaleLoading}
              className="px-3 py-1 text-xs"
            >
              {rationaleLoading ? (
                <span className="flex items-center gap-1.5">
                  <Spinner className="size-3" /> Thinking...
                </span>
              ) : (
                "Generate explanation"
              )}
            </AnimatedButton>
          </div>
          {rationale && <p className="text-sm text-gray-700">{rationale}</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <StepIndicator step={1} />

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">New project</h1>
        <p className="text-sm text-gray-500">
          Answer a few questions and get a ranked stack recommendation.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-xl border border-border p-6 sm:p-8"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Project name
          <input
            type="text"
            required
            placeholder="e.g. Customer feedback portal"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring/40"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Description
          <span className="text-xs font-normal text-gray-500">Optional</span>
          <textarea
            rows={3}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <QuestionnaireFields answers={answers} onChange={setAnswers} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <AnimatedButton type="submit" disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Spinner className="size-4" /> Scoring...
            </span>
          ) : (
            "Get recommendation"
          )}
        </AnimatedButton>
      </form>
    </div>
  );
}

function ManualFlow() {
  const router = useRouter();
  const handleUnauthorized = useUnauthorizedRedirect();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stackSlug, setStackSlug] = useState<string | null>(null);
  const [useCustomStack, setUseCustomStack] = useState(false);
  const [customStack, setCustomStack] = useState("");
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give your project a name.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { projectId } = await trpc.project.createManual.mutate({
        name,
        description: description || undefined,
        stackSlug: useCustomStack ? undefined : stackSlug ?? undefined,
        customStack: useCustomStack && customStack.trim() ? customStack.trim() : undefined,
        skipStarterPlan: inProgress,
      });
      router.push(`/projects/${projectId}`);
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError("Couldn't create the project. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">New project</h1>
        <p className="text-sm text-gray-500">
          Tell us the stack you&rsquo;re already using &mdash; no questionnaire needed.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-xl border border-border p-6 sm:p-8"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Project name
          <input
            type="text"
            required
            placeholder="e.g. Customer feedback portal"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring/40"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Description
          <span className="text-xs font-normal text-gray-500">Optional</span>
          <textarea
            rows={3}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-2">
          <div>
            <span className="text-sm font-medium">Stack</span>
            <p className="text-xs text-gray-500">Optional &mdash; pick one, type your own, or skip it.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STACK_CATALOG.map((option) => (
              <Chip
                key={option.slug}
                selected={!useCustomStack && stackSlug === option.slug}
                onClick={() => {
                  setUseCustomStack(false);
                  setStackSlug(option.slug);
                }}
              >
                {option.name}
              </Chip>
            ))}
            <Chip selected={useCustomStack} onClick={() => setUseCustomStack(true)}>
              Custom / other
            </Chip>
          </div>
          {useCustomStack && (
            <input
              type="text"
              placeholder="e.g. Django + Postgres"
              className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ring/40"
              value={customStack}
              onChange={(e) => setCustomStack(e.target.value)}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <span className="text-sm font-medium">Project stage</span>
            <p className="text-xs text-gray-500">
              A fresh project gets a starter checklist for its stack. An
              in-progress one starts empty so you can add what&rsquo;s actually
              left.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip selected={!inProgress} onClick={() => setInProgress(false)}>
              Starting fresh
            </Chip>
            <Chip selected={inProgress} onClick={() => setInProgress(true)}>
              Already in progress
            </Chip>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <AnimatedButton type="submit" disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Spinner className="size-4" /> Creating...
            </span>
          ) : (
            "Create project"
          )}
        </AnimatedButton>
      </form>
    </div>
  );
}

export default function NewProjectPage() {
  const [mode, setMode] = useState<Mode>("advisor");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-wrap gap-2">
        <Chip selected={mode === "advisor"} onClick={() => setMode("advisor")}>
          Use the stack advisor
        </Chip>
        <Chip selected={mode === "manual"} onClick={() => setMode("manual")}>
          I already have a stack
        </Chip>
      </div>

      {mode === "advisor" ? <AdvisorFlow /> : <ManualFlow />}
    </main>
  );
}
