// Grade a readiness exam attempt. Computes score, readiness %, strengths,
// weaknesses (top missed topics), and AI-curated recommendations.
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
    if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { exam_id, answers } = await req.json() as { exam_id: string; answers: Record<string, "A"|"B"|"C"|"D"> };
    if (!exam_id || !answers) return new Response(JSON.stringify({ error: "exam_id + answers required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: exam, error } = await sb.from("readiness_exams").select("id, user_id, course_id, questions").eq("id", exam_id).maybeSingle();
    if (error || !exam) return new Response(JSON.stringify({ error: "exam_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (exam.user_id !== u.user.id) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const qs = (exam.questions as any[]) || [];
    let correct = 0;
    const topicMiss = new Map<string, number>();
    const topicSeen = new Map<string, number>();
    const detailed: any[] = [];
    for (const q of qs) {
      const picked = answers[q.id];
      const right = picked === q.correct_option;
      if (right) correct += 1;
      else topicMiss.set(q.topic, (topicMiss.get(q.topic) || 0) + 1);
      topicSeen.set(q.topic, (topicSeen.get(q.topic) || 0) + 1);
      detailed.push({ id: q.id, picked: picked || null, correct: q.correct_option, is_correct: right, topic: q.topic, explanation: q.explanation });
    }
    const total = qs.length;
    const readiness_pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    const weaknesses = Array.from(topicMiss.entries())
      .map(([topic, missed]) => ({ topic, missed, seen: topicSeen.get(topic) || 1 }))
      .sort((a, b) => b.missed - a.missed)
      .slice(0, 5);

    const strengths = Array.from(topicSeen.entries())
      .filter(([t]) => !topicMiss.has(t))
      .map(([topic]) => ({ topic }))
      .slice(0, 5);

    // Concise AI recommendations (best effort; safe fallback)
    let recommendations: any[] = weaknesses.map((w) => ({ topic: w.topic, action: `Revisit "${w.topic}" with flashcards + 5-question drill.` }));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && weaknesses.length > 0) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: `Student scored ${readiness_pct}% on a readiness exam. Weak topics: ${weaknesses.map((w) => w.topic).join(", ")}. Return STRICT JSON array of 3 short actionable study recommendations, each as {"topic": string, "action": string}. No prose, no fences.` }],
            temperature: 0.4,
          }),
        });
        if (aiRes.ok) {
          const j = await aiRes.json();
          const t = String(j?.choices?.[0]?.message?.content || "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
          const m = t.match(/\[[\s\S]*\]/);
          if (m) {
            const arr = JSON.parse(m[0]);
            if (Array.isArray(arr)) recommendations = arr.slice(0, 5);
          }
        }
      } catch (e) { console.warn("AI reco fallback used:", e); }
    }

    const { data: attempt, error: insertErr } = await sb.from("readiness_attempts").insert({
      exam_id: exam.id,
      user_id: u.user.id,
      course_id: exam.course_id,
      total,
      correct,
      readiness_pct,
      strengths,
      weaknesses,
      recommendations,
      answers: detailed,
      completed_at: new Date().toISOString(),
    }).select("*").single();
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify(attempt), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("readiness-exam-grade error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});