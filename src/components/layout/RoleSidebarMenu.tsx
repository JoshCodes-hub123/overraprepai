import { NavLink, useNavigate } from "react-router-dom";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu, Home, Users, GraduationCap, FileText, BookOpen, Coins, Banknote,
  Settings, Shield, Megaphone, Target, TrendingUp,
  Bell, HelpCircle, Sparkles, Store, Calendar,
  Image as ImageIcon, User, Layers, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useAdminEnvironment } from "@/hooks/useAdminEnvironment";
import { EnvironmentSwitcher } from "@/components/admin/EnvironmentSwitcher";

type Role = "admin" | "tutor" | "student";

const UNIVERSITY_ADMIN_NAV = [
  { label: "Dashboard",       to: "/admin/dashboard",          icon: Home },
  { label: "Courses",         to: "/admin/courses",            icon: BookOpen },
  { label: "Syllabi & Outlines", to: "/admin/content/syllabi", icon: FileText },
  { label: "Lecture Notes",   to: "/admin/content/notes",      icon: FileText },
  { label: "Question Moderation", to: "/admin/moderation",     icon: Layers },
  { label: "Students",        to: "/admin/dashboard?tab=users", icon: Users },
  { label: "Tutors",          to: "/admin/tutor-applications", icon: GraduationCap },
  { label: "Bulk Upload",     to: "/admin/bulk-upload",        icon: Sparkles },
  { label: "Token Purchases", to: "/admin/payment-requests",   icon: Coins },
  { label: "Withdrawals",     to: "/admin/withdrawals",        icon: Banknote },
  { label: "Announcements",   to: "/admin/broadcast",          icon: Megaphone },
  { label: "Challenges",      to: "/admin/challenges",         icon: Target },
  { label: "Audit Logs",      to: "/admin/audit",              icon: Shield },
  { label: "Settings",        to: "/settings",                 icon: Settings },
];

const TUTOR_NAV = [
  { label: "Dashboard",        to: "/tutor/dashboard",         icon: Home },
  { label: "My Courses",       to: "/tutor/courses",           icon: BookOpen },
  { label: "Curricula",        to: "/tutor/curricula",         icon: FileText },
  { label: "Question Cards",   to: "/tutor/question-cards",    icon: ImageIcon },
  { label: "Lecture Notes",    to: "/tutor/lecture-notes",     icon: FileText },
  { label: "Live Sessions",    to: "/tutor/sessions",          icon: Calendar },
  { label: "Storefront",       to: "/tutor/storefront",        icon: Store },
  { label: "Growth Studio",    to: "/tutor/growth",            icon: TrendingUp },
  { label: "Payouts",          to: "/tutor/payouts",           icon: Banknote },
  { label: "Community",        to: "/community",               icon: Users },
  { label: "Profile",          to: "/tutor/profile",           icon: User },
  { label: "Notifications",    to: "/notifications",           icon: Bell },
  { label: "Settings",         to: "/settings",                icon: Settings },
  { label: "Help & Support",   to: "/help",                    icon: HelpCircle },
];

const STUDENT_NAV = [
  { label: "Dashboard",        to: "/dashboard",               icon: Home },
  { label: "My Courses",       to: "/courses",                 icon: BookOpen },
  { label: "Challenge Arena",  to: "/arena",                   icon: Target },
  { label: "Practice CBT",     to: "/practice",                icon: Sparkles },
  { label: "Study Hub",        to: "/study",                   icon: FileText },
  { label: "Flashcards",       to: "/flashcards",              icon: Layers },
  { label: "Community",        to: "/community",               icon: Users },
  { label: "Wallet & Tokens",  to: "/wallet",                  icon: Coins },
  { label: "Settings",         to: "/settings",                icon: Settings },
  { label: "Help & Support",   to: "/help",                    icon: HelpCircle },
];

const NAV_BY_ROLE: Record<Role, { label: string; to: string; icon: any }[]> = {
  admin: UNIVERSITY_ADMIN_NAV,
  tutor: TUTOR_NAV,
  student: STUDENT_NAV,
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  tutor: "Tutor",
  student: "Student",
};

interface Props {
  role: string;
  className?: string;
}

export function RoleSidebarMenu({ role, className }: Props) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const adminEnv = useAdminEnvironment();
  const validRole: Role = role === "admin" ? "admin" : role === "tutor" ? "tutor" : "student";
  const items = NAV_BY_ROLE[validRole] || STUDENT_NAV;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          className={cn(
            "h-11 w-11 inline-flex items-center justify-center rounded-2xl hover:bg-amber-50 transition",
            className,
          )}
        >
          <Menu className="w-6 h-6 text-neutral-700" strokeWidth={1.8} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 bg-white border-r border-amber-100 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="OverraPrep" className="h-8 w-8 rounded-lg" />
            <div className="flex flex-col items-start">
              <SheetTitle className="font-display text-[17px] font-extrabold tracking-tight leading-none">
                OverraPrep <span className="text-amber-600">AI</span>
              </SheetTitle>
              <span className="mt-1 text-[10px] tracking-[0.22em] uppercase text-amber-700/70 font-bold">
                {ROLE_LABEL[role] || "University"} workspace
              </span>
            </div>
          </div>

          {role === "admin" && (
            <div className="mt-3 pt-3 border-t border-amber-100">
              <div className="flex items-center justify-between text-left mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Campus
                </span>
                <span className="text-xs font-bold text-amber-800">
                  {adminEnv.managingTitle}
                </span>
              </div>
              <EnvironmentSwitcher
                current={adminEnv.current}
                options={adminEnv.options}
                onSelect={adminEnv.select}
                className="w-full justify-between"
              />
            </div>
          )}
        </SheetHeader>

        <nav className="px-2 pb-4 overflow-y-auto flex-1">
          <div className="space-y-0.5">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-neutral-700 hover:bg-amber-50/80 hover:text-amber-950",
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{it.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {user && (
          <div className="p-3 border-t border-amber-100 bg-neutral-50/70">
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut();
                  navigate("/auth", { replace: true });
                } catch {
                  /* ignore */
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/70 transition"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default RoleSidebarMenu;
