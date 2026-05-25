import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: items, error } = await admin.rpc("opportunities_needing_reminder");
    if (error) throw error;
    let sent = 0;
    for (const it of (items ?? []) as any[]) {
      // Skip if we already notified this user about this opp in the last 20h
      const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
      const link = `/opportunities/${it.opportunity_id}`;
      const { data: existing } = await admin.from("notifications")
        .select("id").eq("user_id", it.user_id).eq("link", link).gte("created_at", since).limit(1);
      if (existing && existing.length > 0) continue;
      const hours = it.hours_left ?? 0;
      const tag = hours <= 24 ? "Closes today" : "Closing soon";
      await admin.from("notifications").insert({
        user_id: it.user_id,
        title: `${tag}: ${it.title}`,
        message: `Deadline ${it.deadline}. Apply before time runs out.`,
        type: "warning",
        link,
      });
      sent++;
    }
    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});