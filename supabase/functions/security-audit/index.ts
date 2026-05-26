import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: runId, error: runErr } = await supabase.rpc("run_security_audit");
    if (runErr) throw runErr;

    const { data: notified, error: notifyErr } = await supabase.rpc(
      "notify_admins_of_new_findings",
      { _run_id: runId },
    );
    if (notifyErr) console.error("notify error", notifyErr);

    const { data: run } = await supabase
      .from("security_audit_runs")
      .select("*")
      .eq("id", runId)
      .single();

    return new Response(
      JSON.stringify({ ok: true, run, admins_notified: notified ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("security-audit failed", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});