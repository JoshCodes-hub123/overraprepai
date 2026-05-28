/**
 * OverraPrep AI — dynamic sitemap generator.
 *
 * Runs before `vite dev` and `vite build` via the predev / prebuild npm scripts.
 * Pulls live data from Supabase (universities, courses, topics, tutors,
 * opportunities, public posts) and writes:
 *   - public/sitemap.xml             (or sitemap index + sub-sitemaps if large)
 *   - public/sitemap-static.xml      (when split)
 *   - public/sitemap-courses.xml     (when split)
 *   - public/sitemap-tutors.xml      (when split)
 *   - public/sitemap-topics.xml      (when split)
 *   - public/sitemap-opportunities.xml (when split)
 *   - public/sitemap-posts.xml       (when split)
 *
 * Auth-only / admin / onboarding routes are intentionally excluded.
 *
 * Safe to run without network access: if Supabase is unreachable the script
 * still emits a valid static sitemap so dev / build never breaks.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = (process.env.SITE_URL ?? "https://overraprepai.com").replace(/\/$/, "");
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const OUT_DIR = resolve("public");
const SPLIT_THRESHOLD = 5_000; // Google's hard cap is 50k; we split well below.

type ChangeFreq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: ChangeFreq;
  priority?: string;
}

const today = new Date().toISOString().slice(0, 10);
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);

// ---------------------------------------------------------------------------
// Static SEO routes — high-priority discoverable pages only.
// Auth, dashboards, admin, onboarding, settings are deliberately omitted.
// ---------------------------------------------------------------------------
const STATIC_ENTRIES: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/website", changefreq: "monthly", priority: "0.9" },
  { path: "/pricing", changefreq: "monthly", priority: "0.8" },
  { path: "/tutors", changefreq: "weekly", priority: "0.7" },
  { path: "/community", changefreq: "weekly", priority: "0.7" },
  { path: "/leaderboard", changefreq: "daily", priority: "0.6" },
  { path: "/subjects", changefreq: "monthly", priority: "0.6" },
  { path: "/study-hub", changefreq: "weekly", priority: "0.7" },
  { path: "/theory", changefreq: "weekly", priority: "0.6" },
  { path: "/survival-kits", changefreq: "weekly", priority: "0.6" },
  { path: "/strategy", changefreq: "monthly", priority: "0.5" },
  { path: "/ai-tutor", changefreq: "monthly", priority: "0.6" },
  { path: "/verify", changefreq: "monthly", priority: "0.8" },
  { path: "/apply-tutor", changefreq: "monthly", priority: "0.5" },
  { path: "/school/register", changefreq: "monthly", priority: "0.6" },
  { path: "/opportunities", changefreq: "weekly", priority: "0.7" },
  { path: "/courses", changefreq: "weekly", priority: "0.7" },
  { path: "/install", changefreq: "monthly", priority: "0.5" },
  { path: "/start", changefreq: "monthly", priority: "0.5" },
  { path: "/audio-learning", changefreq: "weekly", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },

  // SEO landing shells
  { path: "/jamb", changefreq: "weekly", priority: "0.9" },
  { path: "/jamb/cbt-practice", changefreq: "weekly", priority: "0.9" },
  { path: "/jamb/past-questions", changefreq: "weekly", priority: "0.9" },
  { path: "/mock-exams", changefreq: "weekly", priority: "0.8" },
  { path: "/ai/flashcard-generator", changefreq: "weekly", priority: "0.8" },
  { path: "/ai/quiz-generator", changefreq: "weekly", priority: "0.8" },
];

// Universities currently supported by the /universities/:slug and
// /post-utme/:university SEO shells. Expand here as new universities launch.
const UNIVERSITY_SLUGS = [
  "futa", "oau", "unilag", "ui", "unn", "uniben",
  "unilorin", "abu", "uniport", "lasu", "funaab", "uniabuja",
];

for (const slug of UNIVERSITY_SLUGS) {
  STATIC_ENTRIES.push(
    { path: `/post-utme/${slug}`, changefreq: "weekly", priority: "0.85" },
    { path: `/universities/${slug}`, changefreq: "weekly", priority: "0.8" },
  );
}

// Seed topic slugs that already have rich landing copy. DB topics merge in below.
const SEED_TOPIC_SLUGS = [
  "projectile-motion", "organic-chemistry", "calculus", "cell-biology",
  "use-of-english-comprehension",
];
for (const slug of SEED_TOPIC_SLUGS) {
  STATIC_ENTRIES.push({ path: `/topics/${slug}`, changefreq: "monthly", priority: "0.6" });
}

// ---------------------------------------------------------------------------
// Dynamic data — best-effort. Errors are swallowed; the build never fails.
// ---------------------------------------------------------------------------
async function fetchDynamic(): Promise<{
  courses: Entry[];
  topics: Entry[];
  tutors: Entry[];
  opportunities: Entry[];
  posts: Entry[];
}> {
  const empty = { courses: [], topics: [], tutors: [], opportunities: [], posts: [] };
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[sitemap] Supabase env vars missing — emitting static-only sitemap.");
    return empty;
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const safe = async <T,>(label: string, run: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await run();
    } catch (err) {
      console.warn(`[sitemap] ${label} failed:`, (err as Error).message);
      return fallback;
    }
  };

  const [courses, topicRows, tutors, opportunities, posts] = await Promise.all([
    safe(
      "courses",
      async () => {
        const { data, error } = await sb
          .from("courses")
          .select("id, updated_at")
          .eq("is_active", true)
          .limit(10_000);
        if (error) throw error;
        return (data ?? []).map<Entry>((c) => ({
          path: `/courses/${c.id}`,
          lastmod: (c.updated_at ?? today).slice(0, 10),
          changefreq: "weekly",
          priority: "0.7",
        }));
      },
      [] as Entry[],
    ),
    safe(
      "topics",
      async () => {
        const { data, error } = await sb
          .from("topics")
          .select("name, created_at")
          .limit(10_000);
        if (error) throw error;
        return (data ?? [])
          .map((t: any) => ({ slug: slugify(t.name ?? ""), lastmod: (t.created_at ?? today).slice(0, 10) }))
          .filter((t) => t.slug.length > 1);
      },
      [] as { slug: string; lastmod: string }[],
    ),
    safe(
      "tutors",
      async () => {
        const { data, error } = await sb
          .from("tutor_storefronts")
          .select("slug, updated_at")
          .eq("is_published", true)
          .not("slug", "is", null)
          .limit(10_000);
        if (error) throw error;
        return (data ?? []).map<Entry>((t: any) => ({
          path: `/t/${t.slug}`,
          lastmod: (t.updated_at ?? today).slice(0, 10),
          changefreq: "weekly",
          priority: "0.7",
        }));
      },
      [] as Entry[],
    ),
    safe(
      "opportunities",
      async () => {
        const { data, error } = await sb
          .from("opportunities")
          .select("id, updated_at, status")
          .eq("status", "published")
          .limit(10_000);
        if (error) throw error;
        return (data ?? []).map<Entry>((o: any) => ({
          path: `/opportunities/${o.id}`,
          lastmod: (o.updated_at ?? today).slice(0, 10),
          changefreq: "weekly",
          priority: "0.6",
        }));
      },
      [] as Entry[],
    ),
    safe(
      "posts",
      async () => {
        const { data, error } = await sb
          .from("posts")
          .select("id, updated_at, published_at, status")
          .eq("status", "published")
          .limit(10_000);
        if (error) throw error;
        return (data ?? []).map<Entry>((p: any) => ({
          path: `/posts/${p.id}`,
          lastmod: (p.updated_at ?? p.published_at ?? today).slice(0, 10),
          changefreq: "monthly",
          priority: "0.6",
        }));
      },
      [] as Entry[],
    ),
  ]);

  // De-dupe topics against the seed list.
  const seen = new Set(SEED_TOPIC_SLUGS);
  const topics: Entry[] = [];
  for (const t of topicRows) {
    if (seen.has(t.slug)) continue;
    seen.add(t.slug);
    topics.push({
      path: `/topics/${t.slug}`,
      lastmod: t.lastmod,
      changefreq: "monthly",
      priority: "0.55",
    });
  }

  return { courses, topics, tutors, opportunities, posts };
}

// ---------------------------------------------------------------------------
// XML rendering
// ---------------------------------------------------------------------------
function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderUrlset(entries: Entry[]): string {
  // Dedup by path — last write wins so dynamic lastmod overrides static.
  const map = new Map<string, Entry>();
  for (const e of entries) map.set(e.path, e);

  const urls = [...map.values()]
    .map((e) =>
      [
        "  <url>",
        `    <loc>${xmlEscape(BASE_URL + e.path)}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

function renderIndex(files: string[]): string {
  const items = files
    .map(
      (f) =>
        `  <sitemap><loc>${xmlEscape(`${BASE_URL}/${f}`)}</loc><lastmod>${today}</lastmod></sitemap>`,
    )
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    items,
    "</sitemapindex>",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const dyn = await fetchDynamic();

  const sections: Record<string, Entry[]> = {
    "sitemap-static.xml": STATIC_ENTRIES,
    "sitemap-courses.xml": dyn.courses,
    "sitemap-topics.xml": dyn.topics,
    "sitemap-tutors.xml": dyn.tutors,
    "sitemap-opportunities.xml": dyn.opportunities,
    "sitemap-posts.xml": dyn.posts,
  };

  const total = Object.values(sections).reduce((n, s) => n + s.length, 0);

  if (total <= SPLIT_THRESHOLD) {
    // Single-file mode — flatten everything.
    const flat = Object.values(sections).flat();
    writeFileSync(resolve(OUT_DIR, "sitemap.xml"), renderUrlset(flat));
    console.log(`[sitemap] wrote sitemap.xml (${flat.length} urls)`);
    return;
  }

  // Sitemap-index mode.
  const written: string[] = [];
  for (const [filename, entries] of Object.entries(sections)) {
    if (entries.length === 0) continue;
    writeFileSync(resolve(OUT_DIR, filename), renderUrlset(entries));
    written.push(filename);
    console.log(`[sitemap] wrote ${filename} (${entries.length} urls)`);
  }
  writeFileSync(resolve(OUT_DIR, "sitemap.xml"), renderIndex(written));
  console.log(`[sitemap] wrote sitemap.xml index (${written.length} sub-sitemaps, ${total} urls)`);
}

main().catch((err) => {
  console.error("[sitemap] fatal:", err);
  // Never break dev/build — write the static set as a safety net.
  try {
    writeFileSync(resolve(OUT_DIR, "sitemap.xml"), renderUrlset(STATIC_ENTRIES));
  } catch {}
  process.exit(0);
});
