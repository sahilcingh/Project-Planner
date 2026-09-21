import type { StackOptionSeed } from "@project-planner/api";

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
      {results.map((result, i) => (
        <li key={result.slug} className="rounded border p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">
              {i + 1}. {result.option.name}
            </h2>
            <span className="text-xs text-gray-500">score {result.score}</span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{result.option.summary}</p>
          {result.reasons.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-gray-500">
              {result.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          {renderAction && <div className="mt-3">{renderAction(result)}</div>}
        </li>
      ))}
    </ol>
  );
}
