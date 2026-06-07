import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "summary" | "key_points" | "flashcards" | "likely_questions";

const KIND_INSTRUCTIONS: Record<Kind, string> = {
  summary:
    "Write a clear, well-structured academic summary of the material. Use short paragraphs and headings if useful. Aim for ~400-600 words. Focus on what a student MUST understand.",
  key_points:
    "Extract the most important key points as a JSON array of objects { point: string, importance: 'high'|'medium'|'low' }. Return between 8 and 20 points. Order from highest importance to lowest.",
  flashcards:
    "Generate exam-ready flashcards as a JSON array of objects { question: string, answer: string, topic?: string }. Return 10-20 cards. Questions should test understanding, not just recall.",
  likely_questions:
    "Predict likely exam questions a Nigerian university lecturer would ask from this material. Return JSON array of objects { question: string, type: 'objective'|'theory', probability: 'high'|'medium'|'low', reasoning: string }. Return 8-15 items.",
};

// Hard cap on bytes we will ever pull into memory from storage. Prevents
// edge-function OOM on large PDFs/DOCX uploads. Anything bigger falls back
// to AI generation from title + description only.
const MAX_FETCH_BYTES = 1_500_000; // ~1.5 MB
const MAX_TEXT_CHARS = 60_000;

async function extractText(fileUrl: string, fileType: string): Promise<string> {
  const lowerType = (fileType || "").toLowerCase();
  const isTexty =
    lowerType.includes("text") ||
    lowerType.includes("markdown") ||
    lowerType.includes("json") ||
    lowerType.includes("csv");

  // Binary formats (pdf, docx, pptx, images, etc.) — do NOT pull into memory.
  // The AI step will rely on title + description (and optional signed URL note).
  if (!isTexty) return "";

  try {
    const res = await fetch(fileUrl);
    if (!res.ok) return "";

    // Skip if file is too large to safely buffer in edge runtime memory.
    const len = Number(res.headers.get("content-length") || "0");
    if (len && len > MAX_FETCH_BYTES) {
      res.body?.cancel();
      return "";
    }

    // Stream up to MAX_FETCH_BYTES, then abort.
    const reader = res.body?.getReader();
    if (!reader) return "";
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FETCH_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total > MAX_FETCH_BYTES ? MAX_FETCH_BYTES : total);
    let offset = 0;
    for (const c of chunks) {
      if (offset + c.byteLength > merged.length) {
        merged.set(c.subarray(0, merged.length - offset), offset);
        break;
      }
      merged.set(c, offset);
      offset += c.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: false }).decode(merged);
    return text.slice(0, MAX_TEXT_CHARS);
  } catch {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { material_id, kind, force } = (await req.json()) as {
      material_id: string;
      kind: Kind;
      force?: boolean;
    };

    if (!material_id || !kind || !KIND_INSTRUCTIONS[kind]) {
      return new Response(JSON.stringify({ error: "Invalid material_id or kind" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller can access material via RLS
    const { data: material, error: mErr } = await userClient
      .from("study_materials")
      .select("*")
      .eq("id", material_id)
      .single();
    if (mErr || !material) {
      return new Response(JSON.stringify({ error: "Material not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache
    if (!force) {
      const { data: cached } = await admin
        .from("study_material_artifacts")
        .select("*")
        .eq("material_id", material_id)
        .eq("kind", kind)
        .maybeSingle();
      if (cached) {
        return new Response(
          JSON.stringify({ cached: true, content: cached.content }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Get a signed URL so AI can read the file
    const { data: signed, error: sErr } = await admin.storage
      .from("study-materials")
      .createSignedUrl(material.file_path, 600);
    if (sErr || !signed) throw new Error("Could not create signed URL for file");

    const extracted = await extractText(signed.signedUrl, material.file_type);

    const wantsJson = kind !== "summary";
    const systemPrompt = `You are an expert Nigerian university tutor preparing study materials. Be accurate, concise, and exam-focused. ${
      wantsJson ? "Respond ONLY with valid JSON matching the requested shape — no prose, no markdown fences." : ""
    }`;

    const userPrompt = `MATERIAL TITLE: ${material.title}
${material.description ? `DESCRIPTION: ${material.description}\n` : ""}
TASK: ${KIND_INSTRUCTIONS[kind]}

CONTENT:
${extracted ? extracted.slice(0, MAX_TEXT_CHARS) : `[Binary or large file — generate from title and description plus general academic knowledge for this course topic.]`}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        ...(wantsJson ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      if (aiRes.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (aiRes.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      throw new Error(`AI gateway error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content ?? "";

    let content: unknown;
    if (wantsJson) {
      try {
        // Some responses may wrap arrays under a key, e.g. { items: [...] }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) content = parsed;
        else if (Array.isArray(parsed.items)) content = parsed.items;
        else if (Array.isArray(parsed.flashcards)) content = parsed.flashcards;
        else if (Array.isArray(parsed.questions)) content = parsed.questions;
        else if (Array.isArray(parsed.points)) content = parsed.points;
        else content = parsed;
      } catch {
        content = { raw };
      }
    } else {
      content = { text: raw };
    }

    // Upsert artifact (use admin to bypass owner check for system-generated cache)
    await admin
      .from("study_material_artifacts")
      .upsert(
        { material_id, kind, content: content as object, generated_at: new Date().toISOString() },
        { onConflict: "material_id,kind" },
      );

    return new Response(JSON.stringify({ cached: false, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("process-study-material error:", error);
    const msg = error instanceof Error ? error.message : "Failed to process material";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
