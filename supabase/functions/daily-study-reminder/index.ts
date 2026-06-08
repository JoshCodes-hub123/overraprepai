// Daily nudge: pushes (FCM via send-push) + email fallback (Resend).
// Targets active students who have NOT been active in the last 20h.
// Runs from pg_cron daily at 17:00 UTC (≈18:00 Africa/Lagos).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "OverraPrep AI <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    if (cronSecret && provided !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

    // Pick students inactive in last 20h who haven't opted out
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, email, full_name, last_seen_at, daily_reminder_opt_out")
      .or(`last_seen_at.lt.${cutoff},last_seen_at.is.null`)
      .neq("daily_reminder_opt_out", true)
      .limit(2000);

    if (error) throw error;
    if (!profiles?.length) {
      return new Response(JSON.stringify({ sent: 0, message: "no targets" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = "Your 3 free AI uses reset soon 🔥";
    const body = "A few minutes of study keeps your streak alive. Tap to continue.";

    // Push via existing send-push (batch in chunks of 200 ids)
    const ids = profiles.map((p) => p.id);
    let pushedBatches = 0;
    for (let i = 0; i < ids.length; i += 200) {
      const batch = ids.slice(i, i + 200);
      try {
        await admin.functions.invoke("send-push", {
          body: {
            user_ids: batch,
            title,
            body,
            link: "/student/dashboard",
          },
        });
        pushedBatches++;
      } catch (e) {
        console.error("push batch failed", e);
      }
    }

    // Email fallback for everyone (Resend bounces are cheap; sends are minimal HTML)
    let emailed = 0;
    for (const p of profiles) {
      if (!p.email) continue;
      const name = (p.full_name as string)?.split(" ")[0] || "Student";
      const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#fff;color:#0a0a0a;padding:24px">
<div style="max-width:560px;margin:0 auto">
<h1 style="font-size:22px;margin:0 0 12px">Hi ${name}, ready for 10 minutes? 📚</h1>
<p style="line-height:1.6;color:#374151">Your <b>3 free AI actions</b> reset every day. Use them to summarise notes, generate a quiz or chat with the AI tutor.</p>
<p style="margin:24px 0"><a href="https://overraprepai.com/student/dashboard" style="background:#D4AF37;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Open OverraPrep</a></p>
<p style="color:#9ca3af;font-size:12px">Don't want daily reminders? Turn them off in Settings.</p>
</div></body></html>`;
      try {
        const ok = await sendEmail(p.email as string, title, html);
        if (ok) emailed++;
      } catch (e) {
        console.error("email failed", p.email, e);
      }
    }

    return new Response(JSON.stringify({ targets: profiles.length, pushedBatches, emailed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-study-reminder error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
