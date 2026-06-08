import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, Megaphone, BookOpen, Briefcase, Star, ChevronRight } from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, format, isThisWeek } from "date-fns";
import { SEO } from "@/components/seo/SEO";
import { useActivityFeed, type ActivityEvent } from "@/hooks/useActivityFeed";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";

const ICONS: Record<string, any> = {
  uploaded_note: Upload,
  posted_quiz: BookOpen,
  announced: Megaphone,
  posted_opportunity: Briefcase,
  featured_spotlight: Star,
};

const ICON_TINT: Record<string, string> = {
  uploaded_note: "bg-blue-50 border-blue-100 text-blue-700",
  posted_quiz: "bg-emerald-50 border-emerald-100 text-emerald-700",
  announced: "bg-amber-50 border-amber-100 text-amber-800",
  posted_opportunity: "bg-violet-50 border-violet-100 text-violet-700",
  featured_spotlight: "bg-rose-50 border-rose-100 text-rose-700",
};

function describe(e: ActivityEvent) {
  const t = (e.meta?.title as string) ?? "";
  switch (e.verb) {
    case "uploaded_note": return { label: "New lecture note", title: t };
    case "posted_quiz": return { label: "New quiz", title: t };
    case "announced": return { label: "Tutor announcement", title: t };
    case "posted_opportunity": return { label: "New opportunity", title: t };
    case "featured_spotlight": return { label: "Spotlight", title: t };
    default: return { label: e.verb, title: t };
  }
}

function linkFor(e: ActivityEvent): string | null {
  switch (e.verb) {
    case "posted_opportunity":
      return e.object_id ? `/opportunities/${e.object_id}` : "/opportunities";
    case "featured_spotlight":
      return "/spotlight";
    case "uploaded_note":
    case "posted_quiz":
    case "announced":
      return e.course_id ? `/courses/${e.course_id}` : null;
    default:
      return null;
  }
}

function bucket(d: Date): "Today" | "Yesterday" | "This week" | "Earlier" {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "This week";
  return "Earlier";
}

const BUCKET_ORDER = ["Today", "Yesterday", "This week", "Earlier"] as const;

export default function ActivityFeed() {
  const { data: items = [], isLoading } = useActivityFeed(50);

  const groups = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of items) {
      const k = bucket(new Date(e.created_at));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return BUCKET_ORDER.filter((k) => map.has(k)).map((k) => [k, map.get(k)!] as const);
  }, [items]);

  return (
    <>
      <SEO title="Activity Feed — OverraPrep AI" description="What's happening across your academic ecosystem." />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-5 max-w-2xl space-y-6">
          <PremiumPageHero
            eyebrow="ACTIVITY"
            title="What's new across your prep"
            subtitle="Tutor uploads, opportunities, announcements and spotlights — all in one feed."
            icon={Star}
            back="/student/dashboard"
          />
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
          ) : groups.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-3">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-sm text-muted-foreground">Nothing here yet. Follow tutors and join discussions to fill your feed.</p>
            </div>
          ) : (
            groups.map(([label, list]) => (
              <section key={label}>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-1 mb-2">{label}</h2>
                <ul className="rounded-2xl border border-amber-100/70 bg-card divide-y divide-amber-50 overflow-hidden">
                  {list.map((e) => {
                    const Icon = ICONS[e.verb] ?? Star;
                    const tint = ICON_TINT[e.verb] ?? "bg-amber-50 border-amber-100 text-amber-700";
                    const { label: kindLabel, title } = describe(e);
                    const to = linkFor(e);
                    const created = new Date(e.created_at);
                    const inner = (
                      <div className="flex items-start gap-3 px-4 py-3">
                        <span className={`h-9 w-9 shrink-0 rounded-xl border flex items-center justify-center ${tint}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{kindLabel}</p>
                          <p className="text-[13.5px] font-medium text-foreground line-clamp-2 mt-0.5">{title || "Untitled"}</p>
                          <p
                            className="text-[11px] text-muted-foreground mt-1"
                            title={format(created, "PPpp")}
                          >
                            {formatDistanceToNow(created, { addSuffix: true })}
                          </p>
                        </div>
                        {to && <ChevronRight className="h-4 w-4 text-muted-foreground/60 mt-3 shrink-0" />}
                      </div>
                    );
                    return (
                      <li key={e.id}>
                        {to ? (
                          <Link to={to} className="block hover:bg-amber-50/60 transition">{inner}</Link>
                        ) : (
                          inner
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </main>
      </div>
    </>
  );
}