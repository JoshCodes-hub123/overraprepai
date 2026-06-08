import { NavLink } from "react-router-dom";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu, Home, BookOpen, Library, Layers, Headphones, Bot, Users,
  Briefcase, GraduationCap, Trophy, Bell, Settings, HelpCircle, Crown,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const NAV = [
  { label: "Dashboard",        to: "/student/dashboard",            icon: Home },
  { label: "My Courses",       to: "/courses",                      icon: BookOpen },
  { label: "Library",          to: "/library",                      icon: Library },
  { label: "Flashcards",       to: "/flashcards",                   icon: Layers },
  { label: "Audio Learning",   to: "/audio",                        icon: Headphones },
  { label: "AI Tutor",         to: "/ai-tutor",                     icon: Bot },
  { label: "Community",        to: "/community",                    icon: Users },
  { label: "Opportunities Hub",to: "/opportunities",                icon: Briefcase },
  { label: "Scholarships",     to: "/opportunities?type=scholarship", icon: GraduationCap },
  { label: "Leaderboard",      to: "/leaderboard",                  icon: Trophy },
  { label: "Notifications",    to: "/notifications",                icon: Bell },
  { label: "Settings",         to: "/settings",                     icon: Settings },
  { label: "Help & Support",   to: "/help",                         icon: HelpCircle },
];

export function SidebarMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          className="h-11 w-11 inline-flex items-center justify-center rounded-2xl hover:bg-amber-50 transition"
        >
          <Menu className="w-6 h-6 text-neutral-700" strokeWidth={1.8} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[290px] p-0 bg-white border-r border-amber-100">
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="OverraPrep" className="h-8 w-8 rounded-lg" />
            <SheetTitle className="font-display text-[17px] font-extrabold tracking-tight">
              OverraPrep <span className="text-amber-600">AI</span>
            </SheetTitle>
          </div>
        </SheetHeader>

        <nav className="px-2 pb-4 overflow-y-auto max-h-[calc(100dvh-220px)]">
          {NAV.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              end={to === "/student/dashboard"}
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
            <p className="font-display text-[13px] font-bold">Go Premium</p>
          </div>
          <p className="text-[11.5px] leading-snug text-neutral-600">
            Unlock unlimited learning and exclusive benefits.
          </p>
          <NavLink
            to="/wallet"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-700 hover:text-amber-800"
          >
            Top up now <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SidebarMenu;
