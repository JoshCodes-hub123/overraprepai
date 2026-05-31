// Resets passwords for the official OverraPrep accounts and emails them.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAILS = [
  { key: "Admin", email: "overraprepofficial@gmail.com" },
  { key: "Math Tutor", email: "overraprepofficial+math@gmail.com" },
  { key: "Physics Tutor", email: "overraprepofficial+physics@gmail.com" },
  { key: "Chemistry Tutor", email: "overraprepofficial+chem@gmail.com" },
];

function strongPassword(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const b = "abcdefghijkmnopqrstuvwxyz";
  const n = "23456789";
  const s = "!@#$%^&*";
  const all = a + b + n + s;
  let out =
    a[Math.floor(Math.random() * a.length)] +
    b[Math.floor(Math.random() * b.length)] +
    n[Math.floor(Math.random() * n.length)] +
    s[Math.floor(Math.random() * s.length)];
  for (let i = 0; i < 12; i++) out += all[Math.floor(Math.random() * all.length)];
  return out.split("").sort(() => Math.random() - 0.5).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (Deno.env.get("SEED_SECRET") !== req.headers.get("x-seed-secret")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list } = await supa.auth.admin.listUsers({ page: 1, perPage: 500 });
  const creds: { role: string; email: string; password: string }[] = [];

  for (const acc of EMAILS) {
    const user = list?.users?.find((u) => u.email?.toLowerCase() === acc.email.toLowerCase());
    if (!user) continue;
    const password = strongPassword();
    const { error } = await supa.auth.admin.updateUserById(user.id, { password });
    if (error) {
      return new Response(JSON.stringify({ error: `reset failed for ${acc.email}: ${error.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    creds.push({ role: acc.key, email: acc.email, password });
  }

  return new Response(JSON.stringify({ ok: true, credentials: creds }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
