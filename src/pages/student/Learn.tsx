import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUniversityScope } from "@/hooks/useUniversityScope";
import { useRecentlyOpenedCourses } from "@/hooks/useRecentlyOpenedCourses";
import { useCourseSearch } from "@/hooks/useCourseSearch";
import DashboardNav from "@/components/layout/DashboardNav";
import BottomTabBar from "@/components/app-shell/BottomTabBar";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Sparkles, Clock, GraduationCap, Megaphone, ArrowRight, History } from "lucide-react";
import { cn } from "@/lib/utils";

type CourseRow = {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
};

const Section = ({ title, icon: Icon, action, children }: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode }) => (
  <section className="mb-6">
    <div className="flex items-center justify-between mb-2.5 px-0.5">
      <h2 className="text-[13px] font-bold tracking-tight text-foreground flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-amber-600" />
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

const CourseCard = ({ c }: { c: CourseRow }) => (
  <Link to={`/courses/${c.id}`} className="block">
    <Card className="p-3 hover:border-amber-300 transition-colors h-full">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
          <BookOpen className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 border-0 text-[10px] px-1.5 py-0">{c.code}</Badge>
            {c.level && <span className="text-[10px] text-muted-foreground">{c.level}</span>}
          </div>
          <p className="text-[13px] font-semibold leading-snug mt-1 line-clamp-2">{c.name}</p>
          {c.department && <p className="text-[10.5px] text-muted-foreground mt-0.5 line-clamp-1">{c.department}</p>}
        </div>
      </div>
    </Card>
  </Link>
);

const HorizontalScroll = ({ children }: { children: React.ReactNode }) => (
  <div className="-mx-4 px-4 overflow-x-auto">
    <div className="flex gap-3 pb-1 [&>*]:w-[78%] [&>*]:shrink-0 sm:[&>*]:w-[46%] md:[&>*]:w-[32%]">{children}</div>
  </div>
);

const Learn = () => {
  const { user } = useAuth();
  const { university, department, level } = useUniversityScope();
  const [q, setQ] = useState("");

  // 1) Current semester: scoped by uni + dept + level
  const { data: current = [], isLoading: loadingCurrent } = useQuery({
    queryKey: ["learn-current", university, department, level],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("id, code, name, department, level")
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(20);
      if (department) query = query.eq("department", department);
      if (level) query = query.eq("level", level);
      const { data } = await query;
      return (data ?? []) as CourseRow[];
    },
  });

  // 2) Continue learning: most recently active courses derived from quiz_attempts
  const { data: continueRows = [] } = useQuery({
    queryKey: ["learn-continue", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: atts } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, completed_at, quizzes(course_id, courses(id, code, name, department, level))")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false })
        .limit(20);
      const seen = new Set<string>();
      const out: CourseRow[] = [];
      for (const r of (atts ?? []) as any[]) {
        const c = r?.quizzes?.courses;
        if (c && !seen.has(c.id)) { seen.add(c.id); out.push(c); }
        if (out.length >= 6) break;
      }
      return out;
    },
  });

  // 3) Recommended: same dept different level OR same faculty
  const { data: recommended = [] } = useQuery({
    queryKey: ["learn-recommended", university, department],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("id, code, name, department, level")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (department) query = query.eq("department", department);
      const { data } = await query;
      return (data ?? []) as CourseRow[];
    },
  });

  // 4) Recently opened
  const { data: recents = [] } = useRecentlyOpenedCourses(8);

  // Search
  const { data: hits = [], isFetching: searching } = useCourseSearch(q);

  const subtitle = useMemo(() => {
    const bits = [university, department, level ? `Level ${level}` : null].filter(Boolean);
    return bits.join(" • ");
  }, [university, department, level]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO title="Learn — Your courses & study materials" description={`Course-centered learning for ${university} students.`} />
      <DashboardNav role="student" />

      <main className="container mx-auto px-4 pt-5 max-w-3xl">
        {/* Header */}
        <header className="mb-4">
          <h1 className="font-display text-2xl tracking-tight">Learn</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle || "Your academic library"}</p>
        </header>

        {/* Single scoped search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${university} courses, topics, tutors…`}
            className="pl-9 h-11 bg-white border-amber-100 focus-visible:ring-amber-300"
          />
          {q.trim().length >= 2 && (
            <div className="absolute top-full mt-2 inset-x-0 z-30 bg-white rounded-xl border border-amber-100 shadow-lg max-h-[60vh] overflow-y-auto">
              {searching && <p className="p-3 text-xs text-muted-foreground">Searching…</p>}
              {!searching && hits.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">No matches in {university}.</p>
              )}
              {hits.map((h) => (
                <Link
                  key={`${h.kind}-${h.id}`}
                  to={h.course_id ? `/courses/${h.course_id}` : "#"}
                  onClick={() => setQ("")}
                  className="flex items-start gap-2 px-3 py-2 hover:bg-amber-50/60 border-b border-amber-50 last:border-0"
                >
                  <span className={cn(
                    "text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded mt-0.5",
                    h.kind === "course" && "bg-amber-100 text-amber-700",
                    h.kind === "topic" && "bg-sky-100 text-sky-700",
                    h.kind === "material" && "bg-violet-100 text-violet-700",
                    h.kind === "tutor" && "bg-emerald-100 text-emerald-700",
                  )}>{h.kind}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug line-clamp-1">{h.title}</p>
                    {h.subtitle && <p className="text-[11px] text-muted-foreground line-clamp-1">{h.subtitle}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Current semester */}
        <Section title="Current semester" icon={GraduationCap}>
          {loadingCurrent ? (
            <p className="text-xs text-muted-foreground">Loading your courses…</p>
          ) : current.length === 0 ? (
            <Card className="p-5 text-center text-sm text-muted-foreground">
              No courses found for {department || "your department"} {level ? `Level ${level}` : ""}. Tutors are adding more daily.
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {current.map((c) => <CourseCard key={c.id} c={c} />)}
            </div>
          )}
        </Section>

        {/* Continue learning */}
        {continueRows.length > 0 && (
          <Section title="Continue learning" icon={Clock}>
            <HorizontalScroll>
              {continueRows.map((c) => <CourseCard key={c.id} c={c} />)}
            </HorizontalScroll>
          </Section>
        )}

        {/* Recommended */}
        {recommended.length > 0 && (
          <Section title={`Recommended for ${department || university}`} icon={Sparkles}>
            <HorizontalScroll>
              {recommended.map((c) => <CourseCard key={c.id} c={c} />)}
            </HorizontalScroll>
          </Section>
        )}

        {/* Recently opened */}
        {recents.length > 0 && (
          <Section title="Recently opened" icon={History}>
            <HorizontalScroll>
              {recents.map((r) => r.courses && <CourseCard key={r.course_id} c={r.courses as CourseRow} />)}
            </HorizontalScroll>
          </Section>
        )}

        {/* Tutor updates placeholder */}
        <Section title="Tutor updates" icon={Megaphone}>
          <Card className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">New materials drop weekly</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Follow tutors to see their latest posts here.</p>
            </div>
            <Link to="/community" className="text-xs font-semibold text-amber-700 inline-flex items-center gap-1 shrink-0">
              Browse <ArrowRight className="w-3 h-3" />
            </Link>
          </Card>
        </Section>
      </main>

      <BottomTabBar />
    </div>
  );
};

export default Learn;