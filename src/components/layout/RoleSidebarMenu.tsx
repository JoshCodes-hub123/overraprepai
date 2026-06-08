import { NavLink } from "react-router-dom";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu, Home, Users, GraduationCap, FileText, BookOpen, Coins, Banknote,
  Settings, Shield, Activity, Megaphone, Target, Building2, TrendingUp,
  Bell, HelpCircle, ArrowRight, Crown, BarChart3, Briefcase, Wallet,
  ClipboardCheck, Calendar, Heart, School as SchoolIcon, Sparkles,
  Bot, Store, MessageCircle, Image as ImageIcon, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

type Role = "admin" | "tutor" | "parent" | "school";

const NAV_BY_ROLE: Record<Role, { label: string; to: string; icon: any }[]> = {
  admin: [
    { label: "Dashboard",      to: "/admin/dashboard",     icon: Home },
    { label: "Analytics",      to: "/admin/dashboard",     icon: BarChart3 },
    { label: "Insights",       to: "/admin/insights",      icon: TrendingUp },
    { label: "Tutors",         to: "/admin/tutor-applications", icon: GraduationCap },
    { label: "Courses",        to: "/admin/courses",       icon: BookOpen },
    { label: "Moderation",     to: "/admin/moderation",    icon: FileText },
    { label: "Token Purchases",to: "/admin/payment-requests", icon: Coins },
    { label: "Withdrawals",    to: "/admin/withdrawals",   icon: Banknote },
    // { label: "Schools",        to: "/admin/schools",       icon: Building2 }, // paused — university focus
    { label: "Challenges",     to: "/admin/challenges",    icon: Target },
    { label: "Opportunities",  to: "/admin/opportunities", icon: Briefcase },
    { label: "Announcements",  to: "/admin/broadcast",     icon: Megaphone },
    { label: "Audit Logs",     to: "/admin/audit",         icon: Shield },
    { label: "Settings",       to: "/settings",            icon: Settings },
  ],
  tutor: [
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
  ],
  parent: [
    { label: "Dashboard",     to: "/parent/dashboard",      icon: Home },
    { label: "Attendance",    to: "/school/attendance",     icon: ClipboardCheck },
    { label: "Results",       to: "/school/results",        icon: FileText },
    { label: "Fees",          to: "/school/fees",           icon: Wallet },
    { label: "Timetable",     to: "/school/timetable",      icon: Calendar },
    { label: "Announcements", to: "/school/announcements",  icon: Megaphone },
    { label: "Notifications", to: "/notifications",         icon: Bell },
    { label: "Settings",      to: "/settings",              icon: Settings },
    { label: "Help & Support",to: "/help",                  icon: HelpCircle },
  ],
  school: [
    { label: "Dashboard",     to: "/school/dashboard",      icon: Home },
    { label: "Students",      to: "/school/students",       icon: Users },
    { label: "Teachers",      to: "/school/teachers",       icon: GraduationCap },
    { label: "Classes",       to: "/school/classes",        icon: BookOpen },
    { label: "Attendance",    to: "/school/attendance",     icon: ClipboardCheck },
    { label: "Results",       to: "/school/results",        icon: FileText },
    { label: "Fees",          to: "/school/fees",           icon: Wallet },
    { label: "Timetable",     to: "/school/timetable",      icon: Calendar },
    { label: "Announcements", to: "/school/announcements",  icon: Megaphone },
    { label: "Settings",      to: "/school/settings",       icon: Settings },
    { label: "Help & Support",to: "/help",                  icon: HelpCircle },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  tutor: "Tutor",
  parent: "Parent",
  school: "School",
};

interface Props {
  role: Role;
  className?: string;
}

export function RoleSidebarMenu({ role, className }: Props) {
  const items = NAV_BY_ROLE[role];
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
      <SheetContent side="left" className="w-[290px] p-0 bg-white border-r border-amber-100">
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="OverraPrep" className="h-8 w-8 rounded-lg" />
            <div className="flex flex-col items-start">
              <SheetTitle className="font-display text-[17px] font-extrabold tracking-tight leading-none">
                OverraPrep <span className="text-amber-600">AI</span>
              </SheetTitle>
              <span className="mt-1 text-[10px] tracking-[0.22em] uppercase text-amber-700/70 font-bold">
                {ROLE_LABEL[role]} workspace
              </span>
            </div>
          </div>
        </SheetHeader>

        <nav className="px-2 pb-4 overflow-y-auto max-h-[calc(100dvh-220px)]">
          {items.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-xl text-[14px] font-medium transition-colors",
                  isActive
                    ? "bg-amber-50 text-amber-800 font-semibold"
                    : "text-neutral-700 hover:bg-amber-50/60 hover:text-amber-800",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-[18px] h-[18px]", isActive ? "text-amber-600" : "text-neutral-500")} strokeWidth={1.8} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mx-4 mb-5 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-4 h-4 text-amber-600" />
            <p className="font-display text-[13px] font-bold">Need help?</p>
          </div>
          <p className="text-[11.5px] leading-snug text-neutral-600">
            Visit the help center or contact OverraPrep support.
          </p>
          <NavLink
            to="/help"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-700 hover:text-amber-800"
          >
            Open Help <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default RoleSidebarMenu;
