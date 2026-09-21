import type { StackOptionSeed } from "@project-planner/api";
import { cn } from "@/lib/utils";

export type RankedResult = {
  slug: string;
  score: number;
  reasons: string[];
  option: StackOptionSeed;
};

export function RankedOptionsList({
  results,
  renderAction,
}: {
  results: RankedResult[];
  renderAction?: (result: RankedResult) => React.ReactNode;
}) {
  return (
    <ol className="flex flex-col gap-4">
      {results.map((result, i) => {
        const isTop = i === 0;
        const components = Object.values(result.option.components).filter(
          (c): c is string => Boolean(c),
        );

        return (
          <li
            key={result.slug}
            className={cn(
              "rounded-xl border p-5",
              isTop ? "border-foreground/25 bg-foreground/[0.03]" : "border-border",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                  {i + 1}
                </span>
                <h2 className="font-semibold">{result.option.name}</h2>
                {isTop && (
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium">
                    Recommended
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">score {result.score}</span>
            </div>

            <p className="mt-2 text-sm text-gray-600">{result.option.summary}</p>

            {components.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {components.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-border px-2 py-0.5 text-[11px] text-gray-600"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {result.reasons.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 text-xs text-gray-500">
                {result.reasons.map((reason) => (
                  <li key={reason} className="flex gap-1.5">
                    <span aria-hidden>&bull;</span>
                    {reason}
                  </li>
                ))}
              </ul>
            )}

            {renderAction && <div className="mt-4">{renderAction(result)}</div>}
          </li>
        );
      })}
    </ol>
  );
}
