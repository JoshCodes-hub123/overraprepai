// Verifies presence of required environment secrets/keys.
// Never returns secret values — only booleans and friendly status info.
// ADMIN ONLY: requires authenticated admin caller.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckItem {
  key: string;
  label: string;
  category: "ai" | "email" | "infrastructure" | "payments";
  required: boolean;
  configured: boolean;
  description: string;
  setupHint: string;
}

const CHECKS: Omit<CheckItem, "configured">[] = [
  {
    key: "LOVABLE_API_KEY",
    label: "Lovable AI Gateway",
    category: "ai",
    required: true,
    description: "Powers AI explanations, summaries, theory grading and quiz recommendations.",
    setupHint: "Auto-provisioned by Lovable Cloud. If missing, re-enable Cloud or rotate the key.",
  },
  {
    key: "NOIZ_API_KEY",
    label: "Noiz Text-to-Speech",
    category: "ai",
    required: false,
    description: "Premium voices for the Audio Learning feature. Without it, browser TTS is used.",
    setupHint: "Add via Cloud → Secrets to enable studio-quality narration.",
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend Email API",
    category: "email",
    required: false,
    description: "Sends transactional emails (welcome, purchase, withdrawals, reports).",
    setupHint: "Add via Cloud → Secrets. Without it, in-app notifications still work.",
  },
  {
    key: "SUPABASE_URL",
    label: "Backend URL",
    category: "infrastructure",
    required: true,
    description: "Internal endpoint used by edge functions to reach the database.",
    setupHint: "Auto-provisioned by Lovable Cloud.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Service Role Key",
    category: "infrastructure",
    required: true,
    description: "Allows edge functions to write notifications and bypass RLS where needed.",
    setupHint: "Auto-provisioned by Lovable Cloud.",
  },
  {
    key: "SUPABASE_ANON_KEY",
    label: "Public Anon Key",
    category: "infrastructure",
    required: true,
    description: "Used by the client app to talk to the backend.",
    setupHint: "Auto-provisioned by Lovable Cloud.",
  },
  {
    key: "LIVEKIT_API_KEY",
    label: "LiveKit API Key",
    category: "infrastructure",
    required: false,
    description: "Powers live tutoring rooms with realtime audio/video.",
    setupHint: "Add via Cloud → Secrets. Without it, live sessions fall back to text chat only.",
  },
  {
    key: "LIVEKIT_API_SECRET",
    label: "LiveKit API Secret",
    category: "infrastructure",
    required: false,
    description: "Signing secret used to mint LiveKit access tokens.",
    setupHint: "Add via Cloud → Secrets along with LIVEKIT_API_KEY.",
  },
  {
    key: "PADDLE_API_KEY",
    label: "Paddle (token purchases)",
    category: "payments",
    required: false,
    description: "Server key used to verify Paddle checkouts before crediting tokens.",
    setupHint: "Add via Cloud → Secrets when enabling paid token packs.",
  },
  {
    key: "PADDLE_WEBHOOK_SECRET",
    label: "Paddle Webhook Secret",
    category: "payments",
    required: false,
    description: "Validates Paddle webhook signatures so tokens auto-credit safely.",
    setupHint: "Copy from Paddle → Notifications → Webhook settings.",
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- AUTH GUARD: admin only ---
  const guard = await requireUser(req, corsHeaders);
  if (guard instanceof Response) return guard;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: roles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", guard.userId)
    .eq("role", "admin");
  if (!roles || roles.length === 0) {
    return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  // --- END AUTH GUARD ---

  const results: CheckItem[] = CHECKS.map((c) => {
    const value = Deno.env.get(c.key);
    return { ...c, configured: !!value && value.length > 0 };
  });

  const missingRequired = results.filter((r) => r.required && !r.configured);
  const missingOptional = results.filter((r) => !r.required && !r.configured);

  return new Response(
    JSON.stringify({
      success: true,
      healthy: missingRequired.length === 0,
      checks: results,
      summary: {
        total: results.length,
        configured: results.filter((r) => r.configured).length,
        missingRequired: missingRequired.length,
        missingOptional: missingOptional.length,
      },
      checkedAt: new Date().toISOString(),
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
});
