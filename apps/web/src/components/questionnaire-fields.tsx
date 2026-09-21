import type { QuestionnaireAnswers } from "@project-planner/api";

const PLATFORM_OPTIONS: QuestionnaireAnswers["platformTargets"] = [
  "web",
  "mobile",
  "desktop",
  "api",
];

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
      <label className="flex flex-col gap-1 text-sm">
        Team size
        <select
          className="rounded border px-3 py-2"
          value={answers.teamSize}
          onChange={(e) =>
            onChange({
              ...answers,
              teamSize: e.target.value as QuestionnaireAnswers["teamSize"],
            })
          }
        >
          <option value="solo">Solo</option>
          <option value="small">Small (2-5)</option>
          <option value="medium">Medium (6-20)</option>
          <option value="large">Large (20+)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Budget
        <select
          className="rounded border px-3 py-2"
          value={answers.budgetTier}
          onChange={(e) =>
            onChange({
              ...answers,
              budgetTier: e.target.value as QuestionnaireAnswers["budgetTier"],
            })
          }
        >
          <option value="free">Free / $0</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Timeline (weeks)
        <input
          type="number"
          min={1}
          className="rounded border px-3 py-2"
          value={answers.timelineWeeks}
          onChange={(e) =>
            onChange({ ...answers, timelineWeeks: Number(e.target.value) || 1 })
          }
        />
      </label>

      <fieldset className="flex flex-col gap-1 text-sm">
        <legend className="mb-1">Platform targets</legend>
        <div className="flex flex-wrap gap-3">
          {PLATFORM_OPTIONS.map((platform) => (
            <label key={platform} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={answers.platformTargets.includes(platform)}
                onChange={() => togglePlatform(platform)}
              />
              {platform}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-1.5 text-sm">
        <input
          type="checkbox"
          checked={answers.realtimeNeeds}
          onChange={(e) => onChange({ ...answers, realtimeNeeds: e.target.checked })}
        />
        Needs realtime updates (live collaboration, chat, live data)
      </label>
    </>
  );
}
