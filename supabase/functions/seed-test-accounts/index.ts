import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Test/QA account seeder. Never embed passwords in source.
// Passwords are generated per-run and only logged to the server console
// when an account is first created. Existing accounts are not reset.
const accounts = [
  { email: "admin@test.overraprep.com",   full_name: "Test Admin",   role: "admin"   },
  { email: "tutor@test.overraprep.com",   full_name: "Test Tutor",   role: "tutor"   },
  { email: "student@test.overraprep.com", full_name: "Test Student", role: "student" },
];

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  let out = rand(upper) + rand(lower) + rand(digits) + rand(symbols);
  for (let i = 0; i < 16; i++) out += rand(all);
  return out.split("").sort(() => Math.random() - 0.5).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Guard: only callable with a server-side shared secret.
    const expected = Deno.env.get("SEED_SECRET");
    const provided = req.headers.get("x-seed-secret");
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    const results: any[] = [];
    for (const a of accounts) {
      const { data: list } = await admin.auth.admin.listUsers();
      let user = list?.users?.find((u) => u.email?.toLowerCase() === a.email.toLowerCase());
      let createdPassword: string | undefined;
      if (!user) {
        createdPassword = generatePassword();
        const { data, error } = await admin.auth.admin.createUser({
          email: a.email,
          password: createdPassword,
          email_confirm: true,
          user_metadata: { full_name: a.full_name },
        });
        if (error) { results.push({ email: a.email, error: error.message }); continue; }
        user = data.user!;
        // Server-side log only. Not returned in API response.
        console.log(`[seed-test-accounts] created ${a.email} password=${createdPassword}`);
      }
      await admin.from("user_roles").upsert(
        { user_id: user.id, role: a.role },
        { onConflict: "user_id,role" }
      );
      const profileRow: any = { id: user.id, email: a.email, full_name: a.full_name };
      if (a.role === "student") {
        profileRow.university = "Federal University of Technology, Akure";
        profileRow.faculty = "School of Computing";
        profileRow.department = "Computer Science";
        profileRow.level = "200";
        profileRow.academic_path = "university";
        profileRow.onboarding_completed = true;
      }
      await admin.from("profiles").upsert(profileRow, { onConflict: "id" });
      results.push({
        email: a.email,
        role: a.role,
        user_id: user.id,
        created: !!createdPassword,
        note: createdPassword
          ? "Password generated and logged to server console. Not returned over the wire."
          : "Account already existed. Password unchanged.",
      });
    }
    return new Response(JSON.stringify({ accounts: results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
