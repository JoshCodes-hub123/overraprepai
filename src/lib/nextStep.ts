/**
 * The single source of truth for "what should this student do next".
 *
 * The dashboard, the Courses screen and the Course workspace all read this —
 * there is deliberately no second recommendation engine anywhere in the app.
 * Everything here is derived from REAL data (topic activity, weak topics,
 * last-opened timestamps). Nothing is fabricated.
 */

export interface NextStep {
  /** Short line shown on a course row, e.g. "Chemical Equilibrium". */
  label: string;
  /** Topic the student should return to, when we actually know one. */
  topicName: string | null;
  topicId: string | null;
  kind: "resume-topic" | "weak-topic" | "resume-course" | "fresh";
}

/**
 * Priority: a topic the student was genuinely practising → a topic the
 * intelligence layer flagged as weak → any prior activity in the course →
 * nothing yet.
 */
export function nextStepFor(input: {
  studiedTopicName?: string | null;
  studiedTopicId?: string | null;
  weakTopicName?: string | null;
  lastOpenedAt?: string | null;
}): NextStep {
  const { studiedTopicName, studiedTopicId, weakTopicName, lastOpenedAt } = input;

  if (studiedTopicName) {
    return {
      label: studiedTopicName,
      topicName: studiedTopicName,
      topicId: studiedTopicId ?? null,
      kind: "resume-topic",
    };
  }
  if (weakTopicName) {
    return { label: weakTopicName, topicName: weakTopicName, topicId: null, kind: "weak-topic" };
  }
  if (lastOpenedAt) {
    return {
      label: "Continue where you stopped",
      topicName: null,
      topicId: null,
      kind: "resume-course",
    };
  }
  return { label: "Ready to practice", topicName: null, topicId: null, kind: "fresh" };
}

/** The verb that goes with a next step, used on hero CTAs. */
export function nextStepCta(step: NextStep) {
  switch (step.kind) {
    case "resume-topic":
      return "Continue studying";
    case "weak-topic":
      return "Practise this topic";
    case "resume-course":
      return "Continue";
    default:
      return "Begin learning";
  }
}

/** Backwards-compatible one-liner used by the home dashboard course rows. */
export function courseActionLabel(topic: string | null, lastOpened: string | null) {
  return nextStepFor({ weakTopicName: topic, lastOpenedAt: lastOpened }).label;
}
