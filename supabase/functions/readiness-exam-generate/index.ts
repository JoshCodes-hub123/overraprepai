// Generate an AI readiness exam for a given course.
// Pulls study material text (public + tutor curriculum content_text) and
// asks Lovable AI Gateway for N MCQs + the answer key. Persists the exam
// row, returns the exam id + questions (without answers).
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
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json() as { course_id: string; count?: number; difficulty?: "easy"|"medium"|"hard"; extra_text?: string };
    if (!body?.course_id) {
      return new Response(JSON.stringify({ error: "course_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const n = Math.max(5, Math.min(20, Number(body.count) || 10));
    const difficulty = ["easy","medium","hard"].includes(body.difficulty as any) ? body.difficulty! : "medium";

    // Pull material text — public study_materials titles + tutor curriculum text
    const [{ data: pubMats }, { data: curMats }, { data: course }] = await Promise.all([
      sb.from("study_materials").select("id, title, description").eq("course_id", body.course_id).eq("visibility", "public").limit(30),
      sb.from("tutor_curriculum_materials")
        .select("id, title, content_text, topic_id, tutor_curriculum_topics!inner(curriculum_id, tutor_curricula!inner(course_id))")
        .eq("tutor_curriculum_topics.tutor_curricula.course_id", body.course_id)
        .limit(50),
      sb.from("courses").select("code, name").eq("id", body.course_id).maybeSingle(),
    ]);

    const sourceIds: string[] = [
      ...(pubMats ?? []).map((m: any) => m.id),
      ...(curMats ?? []).map((m: any) => m.id),
    ];

    const pieces: string[] = [];
    for (const m of (curMats ?? []) as any[]) {
      if (m.content_text) pieces.push(`# ${m.title}\n${String(m.content_text).slice(0, 4000)}`);
      else if (m.title) pieces.push(`# ${m.title}`);
    }
    for (const m of (pubMats ?? []) as any[]) {
      pieces.push(`# ${m.title}${m.description ? `\n${m.description}` : ""}`);
    }
    if (body.extra_text) pieces.push(`# Notes\n${String(body.extra_text).slice(0, 4000)}`);

    if (pieces.length === 0) {
      return new Response(JSON.stringify({ error: "no_material", message: "No course materials available yet. Ask your tutor to upload notes, or add personal notes." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmed = pieces.join("\n\n").slice(0, 22000);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an expert university examiner. Generate exactly ${n} ${difficulty} exam-quality multiple-choice questions for course "${course?.code || ""} ${course?.name || ""}" from the material below.

Rules:
- Each question has exactly 4 options (A, B, C, D), exactly one correct.
- Include a short "topic" label per question (2-4 words).
- Brief 1-2 sentence "explanation" for the correct answer.
- Return STRICT JSON only — an array of objects, no prose, no markdown fences.

Schema for each item:
{ "question_text": string, "option_a": string, "option_b": string, "option_c": string, "option_d": string, "correct_option": "A"|"B"|"C"|"D", "explanation": string, "topic": string, "difficulty": "${difficulty}" }

MATERIAL:
${trimmed}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.35,
      }),
    });
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${aiRes.status}: ${txt}`);
    }
    const json = await aiRes.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    let items: any[] = [];
    try { items = JSON.parse(cleaned); } catch {
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) items = JSON.parse(m[0]);
    }
    if (!Array.isArray(items)) items = [];
    const valid = items.map((q: any, i: number) => ({
      id: String(i + 1),
      question_text: String(q.question_text || "").trim(),
      option_a: String(q.option_a || "").trim(),
      option_b: String(q.option_b || "").trim(),
      option_c: String(q.option_c || "").trim(),
      option_d: String(q.option_d || "").trim(),
      correct_option: ["A","B","C","D"].includes(q.correct_option) ? q.correct_option : "A",
      explanation: String(q.explanation || "").trim(),
      topic: String(q.topic || "General").trim().slice(0, 60),
      difficulty,
    })).filter((q) => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d).slice(0, n);

    if (valid.length < 4) {
      return new Response(JSON.stringify({ error: "ai_generation_failed", message: "Couldn't generate enough quality questions. Try again." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: examRow, error: insertErr } = await sb.from("readiness_exams").insert({
      user_id: u.user.id,
      course_id: body.course_id,
      title: `${course?.code || "Course"} Readiness Exam`,
      questions: valid,
      source_material_ids: sourceIds,
      difficulty,
    }).select("id, title, questions, created_at").single();

    if (insertErr) throw insertErr;

    // Strip correct_option/explanation from client copy
    const clientQs = (examRow.questions as any[]).map(({ correct_option, explanation, ...rest }) => rest);

    return new Response(JSON.stringify({ id: examRow.id, title: examRow.title, questions: clientQs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("readiness-exam-generate error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});