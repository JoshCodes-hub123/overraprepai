import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  Brain,
  Headphones,
  BookOpen,
  GraduationCap,
  Play,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SEOLandingFeature {
  icon: ReactNode;
  title: string;
  body: string;
}

export interface SEOLandingFAQ {
  q: string;
  a: string;
}

export interface SEOLandingRelated {
  label: string;
  href: string;
}

export interface SEOLandingShellProps {
  // SEO
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  jsonLd?: object | object[];

  // Hero
  eyebrow: string;
  h1: string;
  intro: string;

  // Optional content
  features?: SEOLandingFeature[];
  highlightStat?: { value: string; label: string }[];
  faqs?: SEOLandingFAQ[];
  related?: SEOLandingRelated[];
  children?: ReactNode;

  // CTA targets (defaults are sensible product paths)
  ctaPractice?: string;
  ctaExplain?: string;
  ctaFlashcards?: string;
  ctaAudio?: string;
  ctaCourses?: string;
  ctaTutors?: string;
}

const CTA_BASE =
  "group w-full justify-between rounded-2xl border border-amber-200/60 bg-white/70 px-4 py-3 text-left text-sm font-semibold text-stone-900 shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur transition hover:border-amber-300 hover:bg-white hover:shadow-md active:scale-[0.99]";

function PrimaryAction({
  to,
  icon,
  label,
  hint,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link to={to} className={CTA_BASE}>
      <span className="flex items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 ring-1 ring-amber-200/70">
          {icon}
        </span>
        <span className="flex flex-col">
          <span className="leading-tight">{label}</span>
          <span className="text-[11px] font-normal text-stone-500">{hint}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-amber-700" />
    </Link>
  );
}

export function SEOLandingShell({
  seoTitle,
  seoDescription,
  canonicalPath,
  jsonLd,
  eyebrow,
  h1,
  intro,
  features,
  highlightStat,
  faqs,
  related,
  children,
  ctaPractice = "/study-hub",
  ctaExplain = "/ai-tutor",
  ctaFlashcards = "/flashcards",
  ctaAudio = "/audio-learning",
  ctaCourses = "/courses",
  ctaTutors = "/tutor/browse",
}: SEOLandingShellProps) {
  const structured = jsonLd
    ? (Array.isArray(jsonLd)
        ? { "@context": "https://schema.org", "@graph": jsonLd }
        : jsonLd)
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-white text-stone-900">
      <SEO
        title={seoTitle}
        description={seoDescription}
        url={canonicalPath}
        structuredData={structured}
      />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:pt-12">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-8"
        >
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-800 backdrop-blur">
            <Sparkles className="h-3 w-3" /> {eyebrow}
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-stone-900 sm:text-4xl md:text-5xl">
            {h1}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
            {intro}
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-amber-700/80">
            The AI-powered academic OS for African university students
          </p>

          {highlightStat && highlightStat.length > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-2">
              {highlightStat.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-stone-200/70 bg-white/80 px-3 py-2.5 text-center"
                >
                  <div className="text-base font-bold text-stone-900 sm:text-lg">
                    {s.value}
                  </div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.header>

        {/* Primary CTA stack — calm, premium, mobile-first */}
        <section aria-label="Get started" className="mb-10 space-y-2.5">
          <PrimaryAction
            to={ctaPractice}
            icon={<Play className="h-4 w-4" />}
            label="Practice Now"
            hint="Adaptive CBT-style questions"
          />
          <PrimaryAction
            to={ctaExplain}
            icon={<Brain className="h-4 w-4" />}
            label="Get AI Explanation"
            hint="Step-by-step answers from your AI tutor"
          />
          <PrimaryAction
            to={ctaFlashcards}
            icon={<Sparkles className="h-4 w-4" />}
            label="Generate Flashcards"
            hint="Spaced repetition from any topic"
          />
          <PrimaryAction
            to={ctaAudio}
            icon={<Headphones className="h-4 w-4" />}
            label="Listen to Audio Summary"
            hint="Study on the go with AI narration"
          />
          <PrimaryAction
            to={ctaCourses}
            icon={<BookOpen className="h-4 w-4" />}
            label="Explore Related Courses"
            hint="Curated by department & level"
          />
          <PrimaryAction
            to={ctaTutors}
            icon={<GraduationCap className="h-4 w-4" />}
            label="Find a Recommended Tutor"
            hint="Verified university scholars"
          />
        </section>

        {/* Custom slot for page-specific content */}
        {children && <section className="mb-10">{children}</section>}

        {/* Feature blocks */}
        {features && features.length > 0 && (
          <section aria-label="Features" className="mb-10">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              What you get
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-stone-200/70 bg-white p-4"
                >
                  <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/70">
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{f.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {faqs && faqs.length > 0 && (
          <section aria-label="Frequently asked questions" className="mb-10">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              FAQ
            </h2>
            <div className="space-y-2">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-stone-200/70 bg-white p-4 open:bg-amber-50/40"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-stone-900">
                    <span className="flex items-center justify-between gap-3">
                      {f.q}
                      <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-open:rotate-90" />
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Related */}
        {related && related.length > 0 && (
          <section aria-label="Related pages" className="mb-10">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Keep exploring
            </h2>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.href}
                  to={r.href}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-amber-300 hover:text-amber-800"
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Footer CTA */}
        <section
          aria-label="Sign up"
          className={cn(
            "rounded-3xl border border-amber-200/70 p-6 text-center",
            "bg-gradient-to-br from-amber-50 via-white to-amber-50/40 shadow-sm"
          )}
        >
          <h2 className="text-lg font-bold text-stone-900 sm:text-xl">
            Study smart, not hard.
          </h2>
          <p className="mt-1.5 text-sm text-stone-600">
            Join thousands of African university students using OverraPrep AI.
          </p>
          <Button
            asChild
            className="mt-4 rounded-full bg-amber-600 px-6 text-white hover:bg-amber-700"
          >
            <Link to="/auth">
              Get started free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}

export default SEOLandingShell;
