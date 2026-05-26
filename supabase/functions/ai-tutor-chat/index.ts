import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory token bucket (per worker instance — best-effort cost protection only)
const buckets = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 30; // 30 requests
const WINDOW_MS = 60_000; // per minute

function checkLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= LIMIT) return false;
  b.count++;
  return true;
}

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1).max(8000),
      })
    )
    .min(1)
    .max(40),
  academic_path: z.enum(["secondary", "jamb", "university"]).optional().default("university"),
  persona: z.enum(["tutor", "exam", "coach", "career"]).optional().default("tutor"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerKey = `u:${userData.user.id}`;

    if (!checkLimit(callerKey)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please slow down and try again in a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { messages, academic_path, persona } = parsed.data;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const levelPersona =
      academic_path === "secondary"
        ? "You are OverraPrep AI Tutor for a Secondary School student (JSS/SSS). Explain like the student is 12. Use short sentences, real-life Nigerian examples, and analogies."
        : academic_path === "jamb"
        ? "You are OverraPrep AI Tutor for a JAMB/UTME candidate. Be sharp, fast, exam-focused. Cite shortcuts, eliminate options, and emphasise CBT timing."
        : "You are OverraPrep AI Tutor for a Nigerian University student. Use rigorous academic depth, proper terminology, definitions and theory frameworks.";

    const personaOverlay =
      persona === "exam"
        ? "ROLE: Exam Strategist. Focus on exam tactics, time management, predicted questions, marking schemes, and elimination strategies. Always think like an examiner."
        : persona === "coach"
        ? "ROLE: Wellness & Study Coach. Be warm, calming, and practical. Help with motivation, anxiety, sleep, focus, study habits, procrastination. Use short, kind language. Suggest small, doable next steps."
        : persona === "career"
        ? "ROLE: Career Mentor for Nigerian students. Advise on career paths, internships, scholarships, CV/LinkedIn, skills to learn, and how the student's course connects to real jobs."
        : "ROLE: Academic Tutor. Teach concepts clearly with examples and quick checks for understanding.";

    const system = `${levelPersona}\n${personaOverlay}\nAlways stay encouraging. Use markdown. Keep responses focused and end with a quick check-for-understanding question.`;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (upstream.status === 429) return new Response(JSON.stringify({ error: "AI service busy. Try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (upstream.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!upstream.ok || !upstream.body) throw new Error(`AI gateway error ${upstream.status}`);

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
