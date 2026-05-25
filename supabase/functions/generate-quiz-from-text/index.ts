// Generate multiple-choice quiz questions from raw notes / PDF / Word text.
// Returns strict JSON the unified course quiz uploader can preview + import.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      content,
      count = 10,
      difficulty = "medium",
      topic_title,
    } = (await req.json()) as {
      content: string;
      count?: number;
      difficulty?: "easy" | "medium" | "hard";
      topic_title?: string;
    };

    if (!content || content.trim().length < 100) {
      return new Response(
        JSON.stringify({ error: "content too short (min 100 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const trimmed = content.slice(0, 24000);
    const n = Math.max(2, Math.min(40, Number(count) || 10));

    const prompt = `You are an expert university examiner. Generate ${n} ${difficulty} multiple-choice questions from the study material below${topic_title ? ` for topic "${topic_title}"` : ""}.

Rules:
- Each question has exactly 4 distinct options (A, B, C, D).
- Exactly one correct answer per question.
- "explanation" must briefly justify the correct answer in 1-2 sentences.
- Avoid trick wording; keep questions exam-style and unambiguous.
- Return STRICT JSON only — an array of objects. No prose, no markdown fences.

Schema for each item:
{
  "question_text": string,
  "option_a": string,
  "option_b": string,
  "option_c": string,
  "option_d": string,
  "correct_option": "A" | "B" | "C" | "D",
  "explanation": string,
  "difficulty": "${difficulty}"
}

MATERIAL:
${trimmed}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.35,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error ${aiRes.status}: ${txt}`);
    }

    const json = await aiRes.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

    let items: any[] = [];
    try {
      items = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) items = JSON.parse(m[0]);
    }
    if (!Array.isArray(items)) items = [];

    const valid = items
      .map((q) => ({
        question_text: String(q.question_text || "").trim(),
        option_a: String(q.option_a || "").trim(),
        option_b: String(q.option_b || "").trim(),
        option_c: String(q.option_c || "").trim(),
        option_d: String(q.option_d || "").trim(),
        correct_option: ["A", "B", "C", "D"].includes(q.correct_option)
          ? q.correct_option
          : "A",
        explanation: String(q.explanation || "").trim(),
        difficulty: ["easy", "medium", "hard"].includes(q.difficulty)
          ? q.difficulty
          : difficulty,
      }))
      .filter(
        (q) =>
          q.question_text &&
          q.option_a &&
          q.option_b &&
          q.option_c &&
          q.option_d,
      )
      .slice(0, n);

    return new Response(JSON.stringify({ questions: valid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz-from-text error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});