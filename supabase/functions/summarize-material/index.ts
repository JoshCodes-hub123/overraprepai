// Summarize uploaded course material into a study-ready markdown summary.
// Auth required. Returns { markdown } or a typed error.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Style = "bullets" | "structured" | "qa";

const PROMPTS: Record<Style, string> = {
  bullets: `Write a CRASH-COURSE bullet summary a student can read the night before an exam.
- Use short, punchy bullets grouped under 3–6 H2 headings (## Heading).
- Include key definitions, formulas, dates, names, and "must-know" facts.
- Prefix the most exam-critical bullets with "**Key:**".
- Keep it tight; no fluff.`,

  structured: `Rewrite the material as STRUCTURED STUDY NOTES.
- Use H1 (#) for the topic, H2 (##) for major sections, H3 (###) for sub-topics.
- Under each section, use short paragraphs plus bullets where useful.
- End with a "## Quick Recap" section of 5–8 bullets.`,

  qa: `Convert the material into a Q&A FLASHCARD STYLE study sheet.
- Group questions under 2–5 ## topic headings.
- For each item, write the question as a bold line ("**Q:** ...") then the answer below ("**A:** ...").
- Keep answers exam-ready: 1–3 sentences. Include formulas/keywords when relevant.
- End with "## Likely exam questions" — 5 final ones the student should be able to answer cold.`,
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
    const token = auth.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await sb.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const content = String(body?.content || "").trim();
    const title = String(body?.title || "Untitled material").slice(0, 160);
    const styleRaw = String(body?.style || "bullets") as Style;
    const style: Style = ["bullets", "structured", "qa"].includes(styleRaw) ? styleRaw : "bullets";

    if (content.length < 200) {
      return new Response(
        JSON.stringify({ error: "content too short (min 200 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const trimmed = content.slice(0, 24000);

    const prompt = `You are OverraPrep AI, an expert study coach for university students cramming for an exam.
Source title: "${title}"

${PROMPTS[style]}

RULES:
- Output VALID Markdown only. No preamble, no commentary, no code fences around the whole document.
- Do not invent facts that are not in the material.
- Preserve formulas and key terminology exactly.

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
        temperature: 0.3,
      }),
    });

    if (!aiRes.ok) {
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
      const txt = await aiRes.text();
      throw new Error(`AI gateway error ${aiRes.status}: ${txt}`);
    }

    const json = await aiRes.json();
    let markdown: string = json?.choices?.[0]?.message?.content ?? "";
    markdown = markdown.replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/i, "").trim();

    if (!markdown || markdown.length < 40) {
      return new Response(JSON.stringify({ error: "empty_summary" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire-and-forget analytics
    try {
      await sb.from("analytics_events").insert({
        user_id: userId,
        event_name: "smart_summary_generated",
        metadata: { style, title, source_chars: content.length, summary_chars: markdown.length },
      });
    } catch {
      /* ignore */
    }

    return new Response(JSON.stringify({ markdown, style, title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-material error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});