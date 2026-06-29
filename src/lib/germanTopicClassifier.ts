/**
 * Lightweight keyword-based topic classifier for bulk-imported questions.
 *
 * Two-stage:
 *   1. If the row explicitly provides a `topic` cell, that wins (trim + title-case).
 *   2. Otherwise, run a German-aware keyword classifier against the question +
 *      options text and pick the highest-scoring topic. Falls back to "General".
 *
 * The function is deterministic and runs entirely client-side — no AI call.
 */

export interface ClassifiableQuestion {
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  explanation?: string;
}

// Ordered: more specific rules first so they win ties.
const RULES: { topic: string; keywords: (string | RegExp)[] }[] = [
  // ----- German-specific -----
  {
    topic: "Greetings",
    keywords: [
      /\bguten morgen\b/i, /\bguten tag\b/i, /\bguten abend\b/i, /\bgute nacht\b/i,
      /\bhallo\b/i, /\btsch[üu]ss\b/i, /\bauf wiedersehen\b/i, /greeting/i,
    ],
  },
  {
    topic: "Articles (der/die/das)",
    keywords: [/\barticle/i, /\b(der|die|das|den|dem|des)\b/i, /\bgender/i, /\bnoun gender\b/i],
  },
  {
    topic: "Pronouns",
    keywords: [/pronoun/i, /\b(ich|du|er|sie|es|wir|ihr|sie|mich|dich|mir|dir)\b/i],
  },
  {
    topic: "Verbs — sein/haben",
    keywords: [/\bsein\b/i, /\bhaben\b/i, /\bbin\b/i, /\bbist\b/i, /\bist\b/i, /\bsind\b/i, /\bhabe\b/i, /\bhat\b/i],
  },
  {
    topic: "Perfekt",
    keywords: [/perfekt/i, /past tense/i, /\bge[a-z]+t\b/i, /\bge[a-z]+en\b/i, /past participle/i],
  },
  {
    topic: "Modal Verbs",
    keywords: [/modal/i, /\bk[oö]nnen\b/i, /\bm[üu]ssen\b/i, /\bd[üu]rfen\b/i, /\bsollen\b/i, /\bwollen\b/i, /\bm[öo]gen\b/i, /\bm[öo]chte\b/i],
  },
  {
    topic: "Cases — Dative & Genitive",
    keywords: [/dative/i, /genitive/i, /\bdem\b/i, /\bdes\b/i, /\bder frau\b/i],
  },
  {
    topic: "Numbers & Time",
    keywords: [
      /number/i, /\btime\b/i, /\buhr\b/i, /\bsp[äa]t\b/i,
      /\b(eins|zwei|drei|vier|f[üu]nf|sechs|sieben|acht|neun|zehn|zwanzig|dreissig|hundert)\b/i,
    ],
  },
  {
    topic: "Negation",
    keywords: [/negation/i, /\bnicht\b/i, /\bkein(e|en|em|er|es)?\b/i],
  },
  {
    topic: "Word Order",
    keywords: [/word order/i, /sentence order/i, /verb position/i, /satzstellung/i],
  },
  {
    topic: "Passive Voice",
    keywords: [/passive/i, /\bwird\s+[a-z]+\b/i, /\bwerden\b/i],
  },
  {
    topic: "Reading Comprehension",
    keywords: [/reading/i, /passage/i, /according to the text/i, /lesen sie/i],
  },
  {
    topic: "Vocabulary",
    keywords: [
      /vocabulary/i, /\bmeans?\b/i, /translate/i, /\bword for\b/i, /\bin german\b/i,
      /\bwasser\b/i, /\bbrot\b/i, /\bhaus\b/i, /\bbuch\b/i, /\bauto\b/i, /\bschule\b/i,
    ],
  },
];

const stripTags = (s: string) =>
  s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Returns the chosen topic name. Never empty. */
export function classifyTopic(
  row: { topic?: string } & ClassifiableQuestion,
  fallback = "General"
): string {
  // 1) Explicit topic column wins.
  const explicit = (row.topic ?? "").toString().trim();
  if (explicit) return normalizeTopicName(explicit);

  // 2) Keyword pass.
  const hay = stripTags(
    [row.question_text, row.option_a, row.option_b, row.option_c, row.option_d, row.explanation]
      .filter(Boolean)
      .join(" ")
  );

  let bestTopic = fallback;
  let bestScore = 0;
  for (const rule of RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (typeof kw === "string") {
        if (hay.toLowerCase().includes(kw.toLowerCase())) score += 1;
      } else if (kw.test(hay)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = rule.topic;
    }
  }
  return bestTopic;
}

function normalizeTopicName(name: string): string {
  const cleaned = name.replace(/\s+/g, " ").trim();
  // preserve common acronyms / German casing the user provided
  return cleaned.length > 60 ? cleaned.slice(0, 60) : cleaned;
}
