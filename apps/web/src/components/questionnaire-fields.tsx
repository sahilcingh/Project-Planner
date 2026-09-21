"use client";

import type { QuestionnaireAnswers } from "@project-planner/api";
import { cn } from "@/lib/utils";

const TEAM_SIZE_OPTIONS: { value: QuestionnaireAnswers["teamSize"]; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "small", label: "2–5" },
  { value: "medium", label: "6–20" },
  { value: "large", label: "20+" },
];

const BUDGET_OPTIONS: { value: QuestionnaireAnswers["budgetTier"]; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const PLATFORM_OPTIONS: { value: QuestionnaireAnswers["platformTargets"][number]; label: string }[] = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
  { value: "api", label: "API" },
];

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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <span className="text-sm font-medium">{label}</span>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function QuestionnaireFields({
  answers,
  onChange,
}: {
  answers: QuestionnaireAnswers;
  onChange: (next: QuestionnaireAnswers) => void;
}) {
  function togglePlatform(platform: QuestionnaireAnswers["platformTargets"][number]) {
    const has = answers.platformTargets.includes(platform);
    const platformTargets = has
      ? answers.platformTargets.filter((p) => p !== platform)
      : [...answers.platformTargets, platform];
    onChange({ ...answers, platformTargets });
  }

  return (
    <>
      <Field label="Team size">
        <div className="flex flex-wrap gap-2">
          {TEAM_SIZE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={answers.teamSize === opt.value}
              onClick={() => onChange({ ...answers, teamSize: opt.value })}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Budget">
        <div className="flex flex-wrap gap-2">
          {BUDGET_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={answers.budgetTier === opt.value}
              onClick={() => onChange({ ...answers, budgetTier: opt.value })}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Timeline" hint="Roughly how many weeks until launch?">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            value={answers.timelineWeeks}
            onChange={(e) =>
              onChange({ ...answers, timelineWeeks: Number(e.target.value) || 1 })
            }
          />
          <span className="text-sm text-gray-500">weeks</span>
        </div>
      </Field>

      <Field label="Platform targets" hint="Pick everywhere this needs to run.">
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={answers.platformTargets.includes(opt.value)}
              onClick={() => togglePlatform(opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Realtime needs" hint="Live collaboration, chat, or live data feeds.">
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={answers.realtimeNeeds}
            onClick={() => onChange({ ...answers, realtimeNeeds: !answers.realtimeNeeds })}
          >
            {answers.realtimeNeeds ? "Needed" : "Not needed"}
          </Chip>
        </div>
      </Field>
    </>
  );
}
