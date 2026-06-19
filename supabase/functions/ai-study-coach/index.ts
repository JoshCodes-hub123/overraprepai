// AI Study Coach — short, motivating, actionable message based on user stats.
// Uses Lovable AI Gateway. Auth required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) return json({ error: "missing_key" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: who } = await sb.auth.getUser();
    if (!who?.user) return json({ error: "unauthorized" }, 401);

    // Pull personalised facts in one shot
    const [{ data: score }, { data: readiness }, { data: mission }, { data: prof }] =
      await Promise.all([
        sb.rpc("intelligence_success_score", { _user: who.user.id }),
        sb.rpc("intelligence_exam_readiness_all", { _user: who.user.id }),
        sb.rpc("intelligence_today_mission", { _user: who.user.id }),
        sb.from("profiles").select("full_name").eq("id", who.user.id).maybeSingle(),
      ]);

    const firstName = (prof?.full_name ?? "Student").split(" ")[0];
    const facts = {
      name: firstName,
      score,
      readiness,
      mission,
      hour: new Date().getUTCHours(),
    };

    const sys =
      "You are OverraPrep's AI Study Coach. You speak warmly, briefly, and like a trusted Nigerian university coach. " +
      "Write 2–3 short sentences (max 55 words). No emojis other than a single greeting one. " +
      "Reference one concrete number from the data. End with one tiny action. Never invent facts.";
    const user = `Student data (JSON):\n${JSON.stringify(facts).slice(0, 4000)}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        temperature: 0.6,
      }),
    });
    if (r.status === 429) return json({ error: "rate_limited" }, 429);
    if (r.status === 402) return json({ error: "credits_exhausted" }, 402);
    if (!r.ok) return json({ error: "ai_error", detail: await r.text() }, 502);
    const data = await r.json();
    const message =
      data?.choices?.[0]?.message?.content?.trim() ??
      `Welcome back, ${firstName}. Let's make today count.`;
    return json({ ok: true, message });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
