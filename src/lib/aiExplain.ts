/**
 * AI explanation helper with local caching.
 *
 * Explanations are deterministic enough per (question, picked answer) that we
 * cache them in localStorage — a student re-opening a results page never pays
 * for or waits on the same explanation twice.
 */
import { edgeInvoke } from "@/lib/edgeInvoke";
import { aiGate } from "@/lib/aiGate";

const PREFIX = "overra.aiexp.v1:";
const MAX_ENTRIES = 300;

export interface ExplainInput {
  questionId: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctOption: "A" | "B" | "C" | "D";
  userAnswer?: string | null;
  topic?: string | null;
}

function key(i: ExplainInput) {
  return `${PREFIX}${i.questionId}:${i.userAnswer ?? "-"}`;
}

export function readCachedExplanation(i: ExplainInput): string | null {
  try {
    return localStorage.getItem(key(i));
  } catch {
    return null;
  }
}

function writeCache(i: ExplainInput, text: string) {
  try {
    localStorage.setItem(key(i), text);
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    if (keys.length > MAX_ENTRIES) {
      keys.slice(0, keys.length - MAX_ENTRIES).forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // storage full / private mode — caching is best-effort only
  }
}

/**
 * Returns an explanation, from cache when possible. Only spends an AI action
 * when a fresh generation is actually needed.
 */
export async function getAIExplanation(input: ExplainInput): Promise<string> {
  const cached = readCachedExplanation(input);
  if (cached) return cached;

  const allowed = await aiGate.consume("ai_explain", { silent: true } as any);
  if (allowed === false) throw new Error("paywall");

  const answer = (input.userAnswer ?? "").toUpperCase();
  const { data, error } = await edgeInvoke("ai-explanation", {
    body: {
      question: input.question,
      options: input.options,
      correctOption: input.correctOption,
      userAnswer: ["A", "B", "C", "D"].includes(answer) ? answer : null,
      topic: input.topic ?? null,
    },
  });
  if (error) throw error;
  const text = (data as any)?.explanation as string | undefined;
  if (!text) throw new Error("No explanation returned");
  writeCache(input, text);
  return text;
}
