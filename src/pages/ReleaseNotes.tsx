import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { SEO } from "@/components/seo/SEO";

/**
 * Release notes — what shipped in each version. The Update banner deep-links
 * here with the new version so users can see what they're about to get.
 */
interface ReleaseEntry {
  version: string;
  date: string;
  highlights: string[];
}

// Newest first. Append a new entry on every published build that ships
// user-visible changes.
const RELEASES: ReleaseEntry[] = [
  {
    version: "latest",
    date: "Just shipped",
    highlights: [
      "Smarter in-app update banner with version numbers and one-tap refresh",
      "Profile: type your department freely — no more dropdown limits",
      "Calmer, tighter dashboard call-to-action",
      "GNS 106 starter bank now mixes German + objective questions in one quiz",
    ],
  },
];

export default function ReleaseNotes() {
  const { version } = useParams<{ version?: string }>();
  const target = version
    ? RELEASES.find((r) => r.version === version) ?? { ...RELEASES[0], version }
    : RELEASES[0];

  return (
    <>
      <SEO
        title={`What's new — v${target.version}`}
        description="Latest features, fixes and improvements shipped to OverraPrep."
        noindex
        url={`https://overraprep.com/release-notes/${target.version}`}
      />
      <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-white to-white">
        <main className="container mx-auto max-w-2xl px-4 pt-6 pb-24">
          <Link
            to="/student/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>

          <div className="mt-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700/80">
                Release notes
              </p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight">
                What's new in v{target.version}
              </h1>
            </div>
          </div>

          <section className="mt-6 space-y-4">
            {(version
              ? [target, ...RELEASES.filter((r) => r.version !== target.version)]
              : RELEASES
            ).map((r) => (
              <article
                key={r.version}
                className="rounded-2xl border border-amber-200/70 bg-white p-5 shadow-sm"
              >
                <header className="flex items-baseline justify-between gap-2 mb-3">
                  <h2 className="font-display text-lg font-bold">v{r.version}</h2>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </header>
                <ul className="space-y-2">
                  {r.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span className="text-neutral-700">{h}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>

          <p className="mt-8 text-xs text-center text-muted-foreground">
            Got feedback? Use the floating "Report a problem" button anywhere in the app.
          </p>
        </main>
      </div>
    </>
  );
}
