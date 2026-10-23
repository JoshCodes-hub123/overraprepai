import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppScreen from "@/components/app-shell/AppScreen";
import AppListItem from "@/components/app-shell/AppListItem";
import {
  Users, BookOpen, ClipboardCheck, FileText, Wallet, Calendar,
  Megaphone, GraduationCap, LogOut, School as SchoolIcon, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleSidebarMenu } from "@/components/layout/RoleSidebarMenu";

const SchoolDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, classes: 0, teachers: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("schools").select("*").eq("owner_id", user.id).maybeSingle();
      if (!data) return navigate("/school/register", { replace: true });
      if (data.status !== "approved") return navigate("/school/pending", { replace: true });
      setSchool(data);

      const [{ count: sc }, { count: cc }, { count: tc }] = await Promise.all([
        supabase.from("school_students").select("id", { count: "exact", head: true }).eq("school_id", data.id),
        supabase.from("school_classes").select("id", { count: "exact", head: true }).eq("school_id", data.id),
        supabase.from("school_members").select("id", { count: "exact", head: true }).eq("school_id", data.id).eq("member_role", "teacher"),
      ]);
      let teacherCount = tc || 0;
      try {
        const raw = localStorage.getItem(`overra_school_teachers_${data.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > teacherCount) {
            teacherCount = parsed.length;
          }
        }
      } catch {}
      setStats({ students: sc || 0, classes: cc || 0, teachers: teacherCount });
      setLoading(false);
    })();
  }, [user, navigate]);

  if (loading) {
    return (
      <AppScreen>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppScreen>
    );
  }

  const items: { icon: any; title: string; subtitle: string; to: string }[] = [
    { icon: Users, title: "Students", subtitle: "Roster & admissions", to: "/school/students" },
    { icon: GraduationCap, title: "Teachers", subtitle: "Invite & manage staff", to: "/school/teachers" },
    { icon: BookOpen, title: "Classes", subtitle: "JSS1 – SS3 & arms", to: "/school/classes" },
    { icon: ClipboardCheck, title: "Attendance", subtitle: "Mark daily attendance", to: "/school/attendance" },
    { icon: FileText, title: "Results & report cards", subtitle: "CA, exam, grade & PDF", to: "/school/results" },
    { icon: Wallet, title: "Fees", subtitle: "Structure & payments", to: "/school/fees" },
    { icon: Calendar, title: "Timetable", subtitle: "Weekly schedule", to: "/school/timetable" },
    { icon: Megaphone, title: "Announcements", subtitle: "Circulars to parents & students", to: "/school/announcements" },
  ];

  return (
    <AppScreen
      title={school?.name}
      subtitle={`${school?.state}${school?.lga ? " · " + school.lga : ""}`}
      right={
        <div className="flex items-center gap-1">
          <RoleSidebarMenu role="school" />
          <button onClick={async () => { await signOut(); navigate("/"); }} aria-label="Sign out" className="p-2 rounded-full hover:bg-muted">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      }
    >

      <div className="max-w-2xl mx-auto">
        {/* Hero card */}
        <div
          className="rounded-3xl p-5 mb-5 border relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${school.brand_color || "#1e3a8a"}18, ${school.brand_color || "#1e3a8a"}05 60%, transparent)`,
            borderColor: `${school.brand_color || "#1e3a8a"}33`,
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden bg-card border-2 shrink-0"
              style={{ borderColor: school.brand_color || "#1e3a8a" }}
            >
              {school.logo_url
                ? <img src={school.logo_url} alt="" className="w-full h-full object-contain" />
                : <SchoolIcon className="w-6 h-6" style={{ color: school.brand_color || "#1e3a8a" }} />}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">School dashboard</div>
              <div className="font-display text-lg font-semibold leading-tight truncate">{school.name}</div>
              {school.motto && <div className="text-[11px] italic text-muted-foreground truncate">"{school.motto}"</div>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Students" value={stats.students} />
            <Stat label="Classes" value={stats.classes} />
            <Stat label="Teachers" value={stats.teachers} />
          </div>
        </div>

        <div className="space-y-2">
          {items.map((it) => (
            <AppListItem key={it.to} icon={it.icon} title={it.title} subtitle={it.subtitle} onClick={() => navigate(it.to)} />
          ))}
        </div>

        <Button variant="ghost" className="w-full mt-6" onClick={() => navigate("/school/settings")}>
          School settings
        </Button>
      </div>
    </AppScreen>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl bg-card/60 p-3 border border-border/40">
    <div className="font-display text-xl font-bold">{value}</div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
);

export default SchoolDashboard;
