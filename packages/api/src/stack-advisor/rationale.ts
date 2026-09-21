import type { StackOptionSeed } from "./catalog";
import type { QuestionnaireAnswers, ScoredOption } from "./scoring";

// Small ONNX instruct model, runs in-process via transformers.js — no
// separate server, no external API key. Downloads once from Hugging
// Face's CDN (cached under the OS cache dir afterwards).
const MODEL = process.env.LOCAL_MODEL ?? "onnx-community/Qwen2.5-0.5B-Instruct";

export type RankedOption = ScoredOption & { option: StackOptionSeed };

export class RationaleUnavailableError extends Error {}

type TextGenerationPipeline = (
  messages: { role: string; content: string }[],
  options: { max_new_tokens: number },
) => Promise<
  { generated_text: string | { role: string; content: string }[] }[]
>;

let pipelinePromise: Promise<TextGenerationPipeline> | null = null;

function getPipeline(): Promise<TextGenerationPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = import("@huggingface/transformers")
      .then(({ pipeline }) =>
        pipeline("text-generation", MODEL, { dtype: "q4" }),
      )
      .then((p) => p as unknown as TextGenerationPipeline);
  }
  return pipelinePromise;
}

function extractReply(
  generated: { generated_text: string | { role: string; content: string }[] }[],
): string {
  const text = generated[0]?.generated_text;
  if (typeof text === "string") return text.trim();
  const lastAssistant = [...(text ?? [])].reverse().find((m) => m.role === "assistant");
  return (lastAssistant?.content ?? "").trim();
}

/**
 * Turns the (already-computed, already-ranked) top options into readable
 * trade-off prose via a small local model. Deliberately separate from
 * the scoring pass in scoring.ts — the ranking must stay usable even
 * when the model fails to load or generate.
 */
export async function generateRationale(
  ranked: RankedOption[],
  answers: QuestionnaireAnswers,
): Promise<string> {
  const optionsSummary = ranked
    .map(
      (r, i) =>
        `${i + 1}. ${r.option.name} (score ${r.score}) — ${r.option.summary} Reasons: ${r.reasons.join(", ") || "none"}.`,
    )
    .join("\n");

  const prompt = `A developer is picking a tech stack for a new project.
Their answers: team size ${answers.teamSize}, budget ${answers.budgetTier}, timeline ${answers.timelineWeeks} weeks, platforms ${answers.platformTargets.join(", ")}, realtime needed: ${answers.realtimeNeeds}.

Here are the top-ranked stack options from a deterministic scoring engine:
${optionsSummary}

In 3-4 short sentences, explain in plain language why the #1 option is the best fit given their answers, and briefly note one situation where #2 or #3 would have been the better call instead. Do not invent scores or reasons beyond what's listed above.`;

  try {
    const generate = await getPipeline();
    const output = await generate([{ role: "user", content: prompt }], {
      max_new_tokens: 200,
    });
    const reply = extractReply(output);
    if (!reply) throw new Error("Model returned an empty response");
    return reply;
  } catch (cause) {
    throw new RationaleUnavailableError(
      `Couldn't generate a rationale locally (model "${MODEL}"). ` +
        `First run downloads the model from Hugging Face — check network access and try again.`,
      { cause },
    );
  }
}
