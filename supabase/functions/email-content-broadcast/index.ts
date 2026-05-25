import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://overraprep.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: string) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Body {
  kind: "post" | "opportunity";
  id: string;
}

const KIND_LABEL: Record<string, string> = {
  talent: "Talent Showcase",
  opportunity: "Opportunity",
  article: "Article",
  announcement: "Announcement",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ skipped: "no RESEND_API_KEY" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { kind, id } = (await req.json()) as Body;
    if (!kind || !id) {
      return new Response(JSON.stringify({ error: "kind and id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let subject = "";
    let html = "";
    let prefCol = "";
    let excludeAuthorId: string | null = null;

    if (kind === "post") {
      const { data: post } = await admin
        .from("posts")
        .select("id,title,subtitle,body,cover_image_url,type,status,author_id")
        .eq("id", id)
        .maybeSingle();
      if (!post || post.status !== "published") {
        return new Response(JSON.stringify({ skipped: "post not published" }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      excludeAuthorId = (post as any).author_id;
      prefCol = "email_posts";
      const label = KIND_LABEL[(post as any).type] || "Post";
      subject = `New ${label}: ${(post as any).title}`;
      const link = `${APP_BASE_URL}/posts/${(post as any).id}`;
      const img = (post as any).cover_image_url
        ? `<img src="${esc((post as any).cover_image_url)}" style="width:100%;max-width:560px;border-radius:14px;margin:0 0 18px"/>`
        : "";
      const preview = esc(((post as any).subtitle || (post as any).body || "").slice(0, 220));
      html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#1a1300">
          <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#a37500;font-weight:700;margin-bottom:8px">New ${esc(label)}</div>
          <h1 style="font-size:22px;line-height:1.25;margin:0 0 12px">${esc((post as any).title)}</h1>
          ${img}
          <p style="font-size:15px;line-height:1.6;color:#3a3000;white-space:pre-line">${preview}…</p>
          <p style="margin:24px 0;text-align:center"><a href="${esc(link)}" style="background:#f5b400;color:#1a1300;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;display:inline-block">Read on OverraPrep</a></p>
          <hr style="border:none;border-top:1px solid #f1e6c4;margin:28px 0"/>
          <p style="font-size:12px;color:#8a7a3a;text-align:center;margin:0">You're getting this because email alerts for new posts are on. Turn them off in Settings → Notifications.</p>
        </div>`;
    } else {
      const { data: opp } = await admin
        .from("opportunities")
        .select("id,title,organization,description,cover_image_url,status,posted_by,deadline,apply_url")
        .eq("id", id)
        .maybeSingle();
      if (!opp || opp.status !== "published") {
        return new Response(JSON.stringify({ skipped: "opp not published" }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      excludeAuthorId = (opp as any).posted_by;
      prefCol = "email_opportunities";
      subject = `New Opportunity: ${(opp as any).title}`;
      const link = `${APP_BASE_URL}/opportunities/${(opp as any).id}`;
      const img = (opp as any).cover_image_url
        ? `<img src="${esc((opp as any).cover_image_url)}" style="width:100%;max-width:560px;border-radius:14px;margin:0 0 18px"/>`
        : "";
      const meta = `<p style="font-size:13px;color:#6b5a1a;margin:0 0 12px"><strong>${esc((opp as any).organization || "")}</strong>${(opp as any).deadline ? " · Deadline " + esc((opp as any).deadline) : ""}</p>`;
      const preview = esc(((opp as any).description || "").slice(0, 240));
      html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#1a1300">
          <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#a37500;font-weight:700;margin-bottom:8px">New Opportunity</div>
          <h1 style="font-size:22px;line-height:1.25;margin:0 0 8px">${esc((opp as any).title)}</h1>
          ${meta}
          ${img}
          <p style="font-size:15px;line-height:1.6;color:#3a3000;white-space:pre-line">${preview}…</p>
          <p style="margin:24px 0;text-align:center"><a href="${esc(link)}" style="background:#f5b400;color:#1a1300;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none;display:inline-block">View opportunity</a></p>
          <hr style="border:none;border-top:1px solid #f1e6c4;margin:28px 0"/>
          <p style="font-size:12px;color:#8a7a3a;text-align:center;margin:0">You're getting this because email alerts for opportunities are on. Turn them off in Settings → Notifications.</p>
        </div>`;
    }

    // Recipients: prefs row exists with the column = true, joined with profile email
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select(`user_id, ${prefCol}`)
      .eq(prefCol, true);
    const optedInIds = (prefs ?? [])
      .map((p: any) => p.user_id)
      .filter((uid: string) => uid !== excludeAuthorId);

    if (optedInIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no opt-ins" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: profs } = await admin
      .from("profiles")
      .select("id,email")
      .in("id", optedInIds);
    const emails = (profs ?? [])
      .map((p: any) => p.email)
      .filter((e: string | null) => !!e && /@/.test(e));

    let sent = 0, failed = 0;
    const BATCH = 50;
    for (let i = 0; i < emails.length; i += BATCH) {
      const slice = emails.slice(i, i + BATCH);
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "OverraPrep <onboarding@resend.dev>",
            to: ["alerts@overraprep.com"],
            bcc: slice,
            subject,
            html,
          }),
        });
        if (res.ok) sent += slice.length;
        else failed += slice.length;
      } catch {
        failed += slice.length;
      }
    }
    return new Response(JSON.stringify({ ok: true, sent, failed, total: emails.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});