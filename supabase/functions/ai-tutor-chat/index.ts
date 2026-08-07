import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory token bucket (per worker instance — best-effort cost protection only)
const buckets = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 30; // 30 requests
const WINDOW_MS = 60_000; // per minute

function checkLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= LIMIT) return false;
  b.count++;
  return true;
}

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1).max(8000),
      })
    )
    .min(1)
    .max(40),
  academic_path: z.enum(["secondary", "jamb", "university"]).optional().default("university"),
  persona: z.enum(["tutor", "exam", "coach", "career"]).optional().default("tutor"),
  /** Coach study mode. Shapes HOW the AI answers, never WHAT it can see. */
  mode: z.enum(["explain", "practice", "test", "revision", "summary"]).optional(),
  /** Optional course/topic the student came from. Verified against RLS below. */
  course_id: z.string().uuid().optional(),
  topic_id: z.string().uuid().optional(),
});

const MODE_OVERLAY: Record<string, string> = {
  explain:
    "STUDY MODE: Explain. Break the concept down step by step, from first principles, with one worked example. End by checking understanding.",
  practice:
    "STUDY MODE: Practice. Guide the student through solving problems themselves. Give hints before answers; never dump the full solution first.",
  test:
    "STUDY MODE: Test me. Ask exactly ONE question at a time and stop. After the student answers, say clearly whether it is Correct or Not quite, explain why in 2-4 sentences, then ask if they want the next question. Never ask several questions in one message.",
  revision:
    "STUDY MODE: Revision. Produce tight, memorable revision notes: key definitions, formulas, common mistakes and a short recall checklist.",
  summary:
    "STUDY MODE: Summary. Summarise the material concisely in structured markdown, keeping every technical term the student needs.",
};

/**
 * Builds the student's REAL academic context from the database using their own
 * (RLS-scoped) client. Nothing here is client-supplied, so a FUTA student can
 * never receive OAU context and a JAMB user can never receive university
 * context. If a field is missing we simply omit it — we never invent one.
 */
async function buildAcademicContext(
  supabase: any,
  userId: string,
  courseId?: string,
  topicId?: string,
): Promise<{ text: string; path: "jamb" | "university" | "secondary" }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, academic_path, environment_type, university, faculty, department, level, jamb_subjects, target_course, target_university",
    )
    .eq("id", userId)
    .maybeSingle();

  const path: "jamb" | "university" | "secondary" =
    profile?.environment_type === "jamb" || profile?.academic_path === "jamb"
      ? "jamb"
      : profile?.academic_path === "secondary"
      ? "secondary"
      : "university";

  const lines: string[] = [];

  if (path === "jamb") {
    lines.push("ENVIRONMENT: JAMB / UTME preparation. This student is NOT a university undergraduate.");
    lines.push(
      "Never reference university course codes, departments, faculties or campus-specific content. Stay strictly within the JAMB/UTME syllabus.",
    );
    const subjects = Array.isArray(profile?.jamb_subjects) ? profile.jamb_subjects : [];
    if (subjects.length) lines.push(`JAMB subjects: ${subjects.join(", ")}.`);
    if (profile?.target_course) lines.push(`Target course: ${profile.target_course}.`);
    if (profile?.target_university) lines.push(`Target university: ${profile.target_university}.`);
  } else {
    lines.push(
      `ENVIRONMENT: Nigerian university undergraduate${profile?.university ? ` at ${profile.university}` : ""}.`,
    );
    lines.push(
      "Never reference JAMB/UTME preparation or another university's curriculum. Stay within this student's own institution and courses.",
    );
    if (profile?.faculty) lines.push(`Faculty: ${profile.faculty}.`);
    if (profile?.department) lines.push(`Department: ${profile.department}.`);
    if (profile?.level) lines.push(`Level: ${profile.level}.`);

    // Enrolled courses — read through RLS, so only courses this student can access.
    const { data: enrolled } = await supabase
      .from("student_courses")
      .select("course_id, courses(code, name)")
      .eq("student_id", userId)
      .limit(20);
    const courseList = (enrolled ?? [])
      .map((r: any) => (r.courses ? `${r.courses.code} (${r.courses.name})` : null))
      .filter(Boolean);
    if (courseList.length) {
      lines.push(`Registered courses: ${courseList.join("; ")}.`);
      lines.push(
        "When a question relates to one of these courses, frame the explanation around that course. Do not claim a course exists if it is not listed here.",
      );
    }
  }

  // Focus course / topic the student explicitly opened Overra from.
  if (courseId) {
    const { data: course } = await supabase
      .from("courses")
      .select("code, name, level, department")
      .eq("id", courseId)
      .maybeSingle();
    if (course) {
      lines.push(`CURRENT FOCUS COURSE: ${course.code} — ${course.name}.`);
      if (topicId) {
        const { data: topic } = await supabase
          .from("topics")
          .select("name, description")
          .eq("id", topicId)
          .maybeSingle();
        if (topic) {
          lines.push(
            `CURRENT FOCUS TOPIC: ${topic.name}${topic.description ? ` — ${topic.description}` : ""}.`,
          );
        }
      }
    }
  }

  // Real practice history only.
  const { data: mastery } = await supabase
    .from("topic_mastery")
    .select("topic, mastery_score")
    .eq("user_id", userId)
    .order("last_seen", { ascending: false })
    .limit(6);
  const weak = (mastery ?? []).filter((m: any) => Number(m.mastery_score) < 70);
  if (weak.length) {
    lines.push(
      `Topics this student has recently struggled with: ${weak.map((m: any) => m.topic).join(", ")}.`,
    );
  }

  lines.push(
    "NEVER invent exam dates, test schedules, grades, progress percentages, course codes or topics that are not stated above. If you don't know, say so and ask.",
  );

  return { text: lines.join("\n"), path };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerKey = `u:${userData.user.id}`;

    if (!checkLimit(callerKey)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please slow down and try again in a minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { messages, persona, mode, course_id, topic_id } = parsed.data;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // The academic path is derived server-side from the profile, never trusted
    // from the client, so environment isolation cannot be spoofed.
    const context = await buildAcademicContext(supabase, userData.user.id, course_id, topic_id);
    const academic_path = context.path;

    const levelPersona =
      academic_path === "secondary"
        ? "You are OverraPrep AI Tutor for a Secondary School student (JSS/SSS). Explain like the student is 12. Use short sentences, real-life Nigerian examples, and analogies."
        : academic_path === "jamb"
        ? "You are Overra AI, the academic companion for a JAMB/UTME candidate. Be sharp, fast, exam-focused. Cite shortcuts, eliminate options, and emphasise CBT timing."
        : "You are Overra AI, the academic companion for a Nigerian University student. Use rigorous academic depth, proper terminology, definitions and theory frameworks.";

    const personaOverlay =
      persona === "exam"
        ? "ROLE: Exam Strategist. Focus on exam tactics, time management, predicted questions, marking schemes, and elimination strategies. Always think like an examiner."
        : persona === "coach"
        ? "ROLE: Wellness & Study Coach. Be warm, calming, and practical. Help with motivation, anxiety, sleep, focus, study habits, procrastination. Use short, kind language. Suggest small, doable next steps."
        : persona === "career"
        ? "ROLE: Career Mentor for Nigerian students. Advise on career paths, internships, scholarships, CV/LinkedIn, skills to learn, and how the student's course connects to real jobs."
        : "ROLE: Academic Tutor. Teach concepts clearly with examples and quick checks for understanding.";

    const system = [
      levelPersona,
      personaOverlay,
      mode ? MODE_OVERLAY[mode] : null,
      "STUDENT CONTEXT (authoritative — derived from their own records):",
      context.text,
      "Use markdown. Write maths in LaTeX ($inline$ or $$block$$) and code in fenced code blocks. Keep answers focused and mobile-readable.",
    ]
      .filter(Boolean)
      .join("\n");


    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (upstream.status === 429) return new Response(JSON.stringify({ error: "AI service busy. Try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (upstream.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!upstream.ok || !upstream.body) throw new Error(`AI gateway error ${upstream.status}`);

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
