import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { useMyCourses } from "@/hooks/useMyCourses";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { PremiumStatCard } from "@/components/dashboard/PremiumStatCard";
import { BookOpen, FileText, Search, Sparkles, TrendingUp, Library, GraduationCap, Bot } from "lucide-react";
import { motion } from "framer-motion";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  description: string | null;
}

const StudyHub = () => {
  const { user, profile, isLoading: authLoading, primaryRole } = useAuth();
  const navigate = useNavigate();
  const { courseIds: enrolledIds } = useMyCourses();
  const [courses, setCourses] = useState<Course[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(true);
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cs } = await supabase
        .from("courses")
        .select("id, code, name, department, description")
        .eq("is_active", true)
        .order("code");
      setCourses((cs as Course[]) ?? []);

      const { data: mats } = await supabase.from("study_materials").select("course_id");
      const c: Record<string, number> = {};
      (mats ?? []).forEach((m: { course_id: string }) => {
        c[m.course_id] = (c[m.course_id] ?? 0) + 1;
      });
      setCounts(c);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => courses.filter((c) => {
    if (onlyMine && navRole === "student" && enrolledIds.length > 0 && !enrolledIds.includes(c.id)) return false;
    return (
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }), [courses, onlyMine, navRole, enrolledIds, search]);

  const totalMaterials = Object.values(counts).reduce((a, b) => a + b, 0);
  const myMaterials = courses
    .filter(c => enrolledIds.includes(c.id))
    .reduce((sum, c) => sum + (counts[c.id] ?? 0), 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center pt-32"><LoadingSpinner /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Smart Study Hub | OverraPrep AI"
        description="Upload notes and let AI generate summaries, flashcards, and likely exam questions."
      />
      <Navbar />
      <div className="pt-16 md:pt-[72px]">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />
      </div>
      <main className="container mx-auto px-4 pt-6 pb-16 max-w-6xl space-y-6">
        <DashboardHero
          role={navRole}
          fullName={profile?.full_name}
          avatarUrl={profile?.avatar_url}
          subtitle={
            <>Your AI-powered library. Upload notes, then summon summaries, flashcards, likely questions and a personal coach — anytime.</>
          }
          actions={
            navRole === "student" && (
              <Button asChild className="bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md">
                <Link to="/my-courses"><GraduationCap className="w-4 h-4" /> Manage my courses</Link>
              </Button>
            )
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <PremiumStatCard icon={Library} label="Available Courses" value={courses.length} tone="gold" delay={0} />
          <PremiumStatCard icon={BookOpen} label={navRole === "student" ? "My Courses" : "Active"} value={navRole === "student" ? enrolledIds.length : courses.length} tone="emerald" delay={0.05} />
          <PremiumStatCard icon={FileText} label={navRole === "student" ? "My Materials" : "Total Materials"} value={navRole === "student" ? myMaterials : totalMaterials} tone="sapphire" delay={0.1} />
          <PremiumStatCard icon={Bot} label="AI Tools" value={5} suffix="+" tone="violet" hint="Summary, flashcards, Q-bank, coach" delay={0.15} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by course code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/80 border-amber-100 focus-visible:ring-amber-300"
            />
          </div>
          {navRole === "student" && enrolledIds.length > 0 && (
            <div className="flex gap-2">
              <Button size="sm" variant={onlyMine ? "default" : "outline"} onClick={() => setOnlyMine(true)} className={onlyMine ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}>My Courses</Button>
              <Button size="sm" variant={!onlyMine ? "default" : "outline"} onClick={() => setOnlyMine(false)} className={!onlyMine ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}>All Courses</Button>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => {
            const matCount = counts[c.id] ?? 0;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}
              >
                <Card
                  onClick={() => navigate(`/study-hub/${c.id}`)}
                  className="group relative h-full overflow-hidden border border-amber-100/60 bg-gradient-to-br from-white via-white to-amber-50/30 shadow-[0_2px_12px_-4px_rgba(180,140,40,0.18)] hover:shadow-[0_12px_36px_-12px_rgba(180,140,40,0.35)] hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-300/60 via-amber-500/60 to-transparent" />
                  <div className="pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-200/40 to-amber-400/10 blur-3xl" />
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="mb-2 border-amber-200 text-amber-800 bg-amber-50/60">{c.code}</Badge>
                        <CardTitle className="font-serif text-lg group-hover:text-amber-800 transition-colors line-clamp-2">
                          {c.name}
                        </CardTitle>
                      </div>
                      <div className="h-10 w-10 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/70 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-amber-700" />
                      </div>
                    </div>
                    {c.description && (
                      <CardDescription className="line-clamp-2 pt-1">{c.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      {matCount} {matCount === 1 ? "material" : "materials"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                      className="text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                    >
                      <Link to={`/pq-intelligence/${c.id}`}>
                        <TrendingUp className="w-4 h-4" /> PQ Trends
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <Card className="col-span-full bg-amber-50/40 border-amber-100">
              <CardContent className="py-12 text-center">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-display text-lg">No courses match your search.</p>
                <p className="text-sm text-muted-foreground">Try a different keyword or switch to All Courses.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudyHub;
