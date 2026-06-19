// Sends emails to Arena Challenge winners (and a results email to all entrants)
// when a challenge is settled. Triggered by a Postgres pg_net call from
// arena_email_on_settle(). Idempotent per (challenge_id, user_id).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  event: "settled" | "live" | "ending_soon";
  challenge_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const admin = createClient(SUPABASE_URL, SERVICE);

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body?.challenge_id) {
      return json({ error: "challenge_id required" }, 400);
    }

    const { data: ch } = await admin
      .from("arena_challenges")
      .select("id, title, prize_pool_tokens, ends_at")
      .eq("id", body.challenge_id)
      .maybeSingle();
    if (!ch) return json({ error: "not_found" }, 404);

    if (body.event === "settled") {
      // Pull rewards + entrants
      const { data: rewards } = await admin
        .from("arena_rewards")
        .select("user_id, rank, tokens_awarded, badge_slug")
        .eq("challenge_id", ch.id)
        .order("rank", { ascending: true });
      const userIds = (rewards ?? []).map((r) => r.user_id);
      if (userIds.length === 0) return json({ ok: true, sent: 0 });

      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      let sent = 0;
      for (const r of rewards ?? []) {
        const p = byId.get(r.user_id);
        if (!p?.email) continue;

        // In-app notification is already created by trigger.
        // Send email (best effort)
        if (RESEND_API_KEY) {
          const subj =
            r.rank === 1
              ? `🏆 You won "${ch.title}" on OverraPrep!`
              : r.rank <= 3
              ? `🎖️ #${r.rank} place in "${ch.title}"`
              : `Results: "${ch.title}"`;
          const html = renderEmail({
            name: p.full_name ?? "Champion",
            title: ch.title,
            rank: r.rank,
            tokens: r.tokens_awarded ?? 0,
            badge: r.badge_slug,
            challengeId: ch.id,
          });
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "OverraPrep Arena <arena@overraprepai.com>",
              to: [p.email],
              subject: subj,
              html,
            }),
          });
          if (res.ok) sent++;
          await res.text().catch(() => {});
        }
      }
      return json({ ok: true, sent });
    }

    return json({ ok: true, ignored: true });
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

function renderEmail(args: {
  name: string;
  title: string;
  rank: number;
  tokens: number;
  badge: string | null;
  challengeId: string;
}) {
  const medal = args.rank === 1 ? "🥇" : args.rank === 2 ? "🥈" : args.rank === 3 ? "🥉" : "🎯";
  const headline =
    args.rank === 1
      ? "Champion!"
      : args.rank <= 3
      ? `Podium finish — #${args.rank}`
      : `Final standing: #${args.rank}`;
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Inter,Arial,sans-serif;color:#0a0a0a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:14px;letter-spacing:.12em;color:#b8860b;text-transform:uppercase;margin-bottom:8px">OverraPrep Challenge Arena</div>
    <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;color:#0a0a0a">${medal} ${headline}</h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px">Hi ${escapeHtml(args.name)},</p>
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px">
      The results for <strong>${escapeHtml(args.title)}</strong> are in.
      ${args.tokens > 0 ? `You won <strong>${args.tokens} tokens</strong> — already credited to your wallet.` : "Great effort — keep stacking wins."}
    </p>
    ${args.badge ? `<p style="font-size:14px;color:#555;margin:0 0 24px">Badge earned: <strong>${escapeHtml(args.badge)}</strong></p>` : ""}
    <a href="https://overraprepai.com/arena/${args.challengeId}/leaderboard" style="display:inline-block;background:#0a0a0a;color:#fff;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:600">View leaderboard</a>
    <p style="font-size:12px;color:#888;margin-top:40px">Study smart, not hard. — OverraPrep</p>
  </div></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}
