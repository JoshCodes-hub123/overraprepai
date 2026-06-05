import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  GraduationCap,
  Trophy,
  Users,
  User,
  Library,
  Shield,
  ClipboardCheck,
  CheckCircle2,
  Layers,
  Sparkles,
  Flame,
  LifeBuoy,
  Compass,
  MessageSquare,
  School,
  Headphones,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth, AcademicPath } from "@/hooks/useAuth";

type Role = "admin" | "tutor" | "student";

interface NavLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  paths?: AcademicPath[]; // student-only: which academic_paths see this link
}

interface DashboardNavProps {
  role: Role;
}

const linksByRole: Record<Role, NavLink[]> = {
  student: [
    { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/courses", label: "Courses", icon: BookOpen },
    { to: "/subjects", label: "Subjects", icon: Layers, paths: ["secondary", "jamb"] },
    // JAMB Intel paused — focus on University + School
    // { to: "/jamb-intelligence", label: "JAMB Intel", icon: Flame, paths: ["jamb"] },
    { to: "/flashcards", label: "Flashcards", icon: Sparkles, paths: ["secondary", "jamb"] },
    { to: "/study-hub", label: "Study Hub", icon: Library },
    { to: "/theory", label: "Theory Prep", icon: BookOpen, paths: ["university"] },
    { to: "/survival-kits", label: "Survival Kits", icon: LifeBuoy, paths: ["university"] },
    { to: "/strategy", label: "Strategy", icon: Compass },
    { to: "/ai-tutor", label: "AI Tutor", icon: MessageSquare },
    { to: "/audio-learning", label: "Audio Learning", icon: Headphones },
    { to: "/tutors", label: "Tutors", icon: GraduationCap },
    { to: "/community", label: "Community", icon: Users },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/profile/edit", label: "Profile", icon: User },
  ],
  tutor: [
    { to: "/tutor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/courses", label: "Courses", icon: BookOpen },
    { to: "/tutor/question-cards", label: "Question Cards", icon: ImageIcon },
    { to: "/study-hub", label: "Study Hub", icon: Library },
    { to: "/theory", label: "Theory Prep", icon: BookOpen },
    { to: "/survival-kits", label: "Survival Kits", icon: LifeBuoy },
    { to: "/community", label: "Community", icon: Users },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/profile/edit", label: "Profile", icon: User },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: Shield },
    { to: "/courses", label: "Courses", icon: BookOpen },
    { to: "/admin/applications", label: "Tutors", icon: ClipboardCheck },
    { to: "/admin/schools", label: "Schools", icon: School },
    { to: "/admin/startup-checklist", label: "Startup Check", icon: CheckCircle2 },
    { to: "/tutors", label: "Tutors", icon: GraduationCap },
    { to: "/study-hub", label: "Study Hub", icon: Library },
    { to: "/theory", label: "Theory Prep", icon: BookOpen },
    { to: "/community", label: "Community", icon: Users },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
};

export const DashboardNav = ({ role }: DashboardNavProps) => {
  const location = useLocation();
  const { profile } = useAuth();
  const academicPath = profile?.academic_path ?? null;

  // The student experience is now driven entirely by the 5-tab spine
  // (Home · Study · Practice · People · Me). Collapse the legacy top nav
  // for students so the app no longer shows two competing navigations.
  if (role === "student") return null;

  const links = linksByRole[role];

  return (
    <nav aria-label="Dashboard navigation" className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-1 py-2">
            {links.map(({ to, label, icon: Icon }) => {
              const isActive =
                location.pathname === to ||
                (to !== "/" && location.pathname.startsWith(to + "/"));
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-[1.02] ring-1 ring-primary/40 after:content-[''] after:absolute after:-bottom-2 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:w-8 after:rounded-full after:bg-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-[1.01]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </nav>
  );
};

export default DashboardNav;
