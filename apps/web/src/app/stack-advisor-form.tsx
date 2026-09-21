"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { QuestionnaireFields } from "@/components/questionnaire-fields";
import { RankedOptionsList, type RankedResult } from "@/components/ranked-options-list";
import type { QuestionnaireAnswers } from "@project-planner/api";

export function StackAdvisorForm() {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    teamSize: "solo",
    budgetTier: "low",
    timelineWeeks: 4,
    platformTargets: ["web"],
    realtimeNeeds: false,
  });
  const [results, setResults] = useState<RankedResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);
  const [rationaleError, setRationaleError] = useState<string | null>(null);
  const [rationaleLoading, setRationaleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (answers.platformTargets.length === 0) {
      setError("Pick at least one platform target.");
      return;
    }
    setError(null);
    setLoading(true);
    setRationale(null);
    setRationaleError(null);
    try {
      const { top3 } = await trpc.stackAdvisor.recommend.query(answers);
      setResults(top3);
    } catch {
      setError("Couldn't get a recommendation. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExplain() {
    setRationaleError(null);
    setRationaleLoading(true);
    try {
      const { rationale } = await trpc.stackAdvisor.explain.mutate(answers);
      setRationale(rationale);
    } catch (err) {
      setRationaleError(
        err instanceof Error
          ? err.message
          : "Couldn't generate an explanation. Try again.",
      );
    } finally {
      setRationaleLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

      {results && <RankedOptionsList results={results} />}

      {results && (
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
          {rationaleError && (
            <p className="text-xs text-red-600">{rationaleError}</p>
          )}
        </div>
      )}
    </div>
  );
}
