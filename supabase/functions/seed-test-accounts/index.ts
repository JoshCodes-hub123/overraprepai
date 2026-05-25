import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const accounts = [
  { email: "admin@test.overraprep.com", password: "TestAdmin123!", full_name: "Test Admin", role: "admin" },
  { email: "tutor@test.overraprep.com", password: "TestTutor123!", full_name: "Test Tutor", role: "tutor" },
  { email: "student@test.overraprep.com", password: "TestStudent123!", full_name: "Test Student", role: "student" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    const results: any[] = [];
    for (const a of accounts) {
      // Try to find existing user by email
      const { data: list } = await admin.auth.admin.listUsers();
      let user = list?.users?.find((u) => u.email?.toLowerCase() === a.email.toLowerCase());
      if (!user) {
        const { data, error } = await admin.auth.admin.createUser({
          email: a.email,
          password: a.password,
          email_confirm: true,
          user_metadata: { full_name: a.full_name },
        });
        if (error) { results.push({ email: a.email, error: error.message }); continue; }
        user = data.user!;
      } else {
        // Reset password to known value
        await admin.auth.admin.updateUserById(user.id, { password: a.password, email_confirm: true });
      }
      // Ensure role
      await admin.from("user_roles").upsert(
        { user_id: user.id, role: a.role },
        { onConflict: "user_id,role" }
      );
      // Ensure profile exists
      await admin.from("profiles").upsert(
        { id: user.id, email: a.email, full_name: a.full_name },
        { onConflict: "id" }
      );
      results.push({ email: a.email, password: a.password, role: a.role, user_id: user.id });
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