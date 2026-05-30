// Seed official OverraPrep admin + 3 tutor accounts. One-shot, idempotent.
// Auth: requires `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` header.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

type AccountSpec = {
  key: string;
  email: string;
  full_name: string;
  role: "admin" | "tutor";
  tutor_code?: string;
  specialization?: string; // 'mathematics' | 'physics' | 'chemistry' etc
  department?: string;
  bio?: string;
  storefront_slug?: string;
  storefront_headline?: string;
};

const ACCOUNTS: AccountSpec[] = [
  {
    key: "admin",
    email: "overraprepofficial@gmail.com",
    full_name: "OverraPrep Admin",
    role: "admin",
  },
  {
    key: "math",
    email: "overraprepofficial+math@gmail.com",
    full_name: "OverraPrep Math Faculty",
    role: "tutor",
    tutor_code: "TUT-MATH",
    specialization: "mathematics",
    department: "Mathematics",
    bio: "Official OverraPrep Mathematics faculty. We craft FUTA-aligned calculus, algebra and analysis material designed to make every student exam-ready.",
    storefront_slug: "overraprep-math",
    storefront_headline: "FUTA Mathematics, taught with clarity",
  },
  {
    key: "physics",
    email: "overraprepofficial+physics@gmail.com",
    full_name: "OverraPrep Physics Faculty",
    role: "tutor",
    tutor_code: "TUT-PHYS",
    specialization: "physics",
    department: "Physics",
    bio: "Official OverraPrep Physics faculty. From mechanics to modern physics, we turn intimidating concepts into intuitive, FUTA-ready knowledge.",
    storefront_slug: "overraprep-physics",
    storefront_headline: "FUTA Physics made intuitive",
  },
  {
    key: "chem",
    email: "overraprepofficial+chem@gmail.com",
    full_name: "OverraPrep Chemistry Faculty",
    role: "tutor",
    tutor_code: "TUT-CHEM",
    specialization: "chemistry",
    department: "Chemistry",
    bio: "Official OverraPrep Chemistry faculty. We help FUTA students master general, organic and physical chemistry the right way — first time.",
    storefront_slug: "overraprep-chem",
    storefront_headline: "FUTA Chemistry, mastered",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Idempotent one-shot. Safe to call repeatedly: it skips users that already exist.
  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const created: Record<string, { id: string; email: string; password?: string; existed: boolean }> = {};

  for (const acc of ACCOUNTS) {
    // Check if user exists
    let userId: string | null = null;
    let password: string | undefined;
    let existed = false;

    const { data: list } = await supa.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === acc.email.toLowerCase());

    if (existing) {
      userId = existing.id;
      existed = true;
    } else {
      password = strongPassword();
      const { data, error } = await supa.auth.admin.createUser({
        email: acc.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: acc.full_name, is_official: true },
      });
      if (error || !data.user) {
        return new Response(JSON.stringify({ error: `createUser failed for ${acc.email}: ${error?.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = data.user.id;
    }

    // Upsert profile
    const profilePatch: Record<string, unknown> = {
      id: userId,
      email: acc.email,
      full_name: acc.full_name,
      is_official: true,
      onboarding_completed: true,
      university: "FUTA",
      department: acc.department ?? null,
      bio: acc.bio ?? null,
    };
    if (acc.role === "tutor") {
      profilePatch.tutor_code = acc.tutor_code;
      profilePatch.tutor_specialization = acc.specialization;
      profilePatch.tutor_status = "approved";
      profilePatch.academic_path = "university";
      profilePatch.faculty = "Faculty of Science";
    }
    const { error: pErr } = await supa.from("profiles").upsert(profilePatch, { onConflict: "id" });
    if (pErr) {
      return new Response(JSON.stringify({ error: `profile upsert failed for ${acc.email}: ${pErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role
    if (acc.role === "admin") {
      await supa.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await supa.from("user_roles").upsert({ user_id: userId, role: "tutor" }, { onConflict: "user_id,role" });

      // Approved tutor application
      const { data: appExists } = await supa.from("tutor_applications").select("id").eq("user_id", userId).maybeSingle();
      if (!appExists) {
        await supa.from("tutor_applications").insert({
          user_id: userId,
          full_name: acc.full_name,
          email: acc.email,
          qualifications: "Official OverraPrep faculty — content verified by the OverraPrep editorial team.",
          experience: "OverraPrep in-house faculty with combined FUTA exam-prep experience.",
          courses_to_teach: acc.department ?? "Core sciences",
          bio: acc.bio ?? null,
          status: "approved",
          specialization: acc.specialization,
          subjects_taught: [acc.department ?? "Core sciences"],
          years_experience: 5,
          why_join: "To deliver the official OverraPrep learning experience.",
        });
      }

      // Storefront
      await supa.from("tutor_storefronts").upsert(
        {
          tutor_id: userId,
          slug: acc.storefront_slug,
          headline: acc.storefront_headline,
          bio: acc.bio,
          is_published: true,
        },
        { onConflict: "tutor_id" },
      );

      // Onboarding flags
      await supa.from("tutor_onboarding").upsert(
        {
          user_id: userId,
          profile_completed: true,
          course_created: true,
          quiz_created: true,
          bank_added: false,
          community_created: false,
          dismissed: true,
        },
        { onConflict: "user_id" },
      );
    }

    created[acc.key] = { id: userId!, email: acc.email, password, existed };
  }

  return new Response(JSON.stringify({ ok: true, accounts: created }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
