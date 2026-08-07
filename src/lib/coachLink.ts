/**
 * Builds a context-aware "Ask Overra" link.
 *
 * Every field here must come from a row the student already has access to
 * (their own attempt, a course/topic RLS allowed them to read). We only pass
 * ids the Coach re-resolves server-side, plus a plain-language prompt — no
 * privileged data is ever smuggled through the URL.
 */
export interface CoachContext {
  courseId?: string | null;
  courseCode?: string | null;
  topicId?: string | null;
  topicName?: string | null;
  question?: string | null;
  studentAnswer?: string | null;
  correctAnswer?: string | null;
  /** Overrides the generated prompt when the caller knows better. */
  prompt?: string | null;
  mode?: "explain" | "practice" | "test" | "revision" | "summary" | null;
}

function buildPrompt(ctx: CoachContext): string {
  if (ctx.prompt) return ctx.prompt;

  const lines: string[] = [];
  if (ctx.question) {
    lines.push("Help me understand this question I got wrong.");
    if (ctx.courseCode) lines.push(`Course: ${ctx.courseCode}`);
    if (ctx.topicName) lines.push(`Topic: ${ctx.topicName}`);
    lines.push(`Question: ${ctx.question}`);
    if (ctx.studentAnswer) lines.push(`My answer: ${ctx.studentAnswer}`);
    if (ctx.correctAnswer) lines.push(`Correct answer: ${ctx.correctAnswer}`);
    lines.push("Explain why my answer is wrong and how to get this right next time.");
    return lines.join("\n");
  }

  if (ctx.topicName) {
    return `Explain ${ctx.topicName}${ctx.courseCode ? ` in ${ctx.courseCode}` : ""} clearly, then give me two quick check questions.`;
  }
  if (ctx.courseCode) {
    return `I'm studying ${ctx.courseCode}. Where should I focus next?`;
  }
  return "";
}

/** `/coach/chat?...` deep link carrying real academic context. */
export function coachHref(ctx: CoachContext): string {
  const qs = new URLSearchParams();
  const prompt = buildPrompt(ctx);
  if (prompt) qs.set("q", prompt);
  if (ctx.courseId) qs.set("course", ctx.courseId);
  if (ctx.topicId) qs.set("topic", ctx.topicId);
  if (ctx.mode) qs.set("mode", ctx.mode);
  const s = qs.toString();
  return `/coach/chat${s ? `?${s}` : ""}`;
}
