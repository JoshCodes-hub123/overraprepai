import { NavLink } from "react-router-dom";
import {
  Building2,
  BookOpen,
  GraduationCap,
  Users,
  Upload,
  FileText,
  BarChart3,
  Layers,
} from "lucide-react";
import { useAdminEnvironment } from "@/hooks/useAdminEnvironment";
import { EnvironmentSwitcher } from "@/components/admin/EnvironmentSwitcher";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  showNavStrip?: boolean;
}

export function AdminPersistentHeader({ className, showNavStrip = true }: Props) {
  const { current, options, select, managingTitle } = useAdminEnvironment();

  const universityNav = [
    { label: "Dashboard", to: "/admin/dashboard", icon: BarChart3 },
    { label: "Courses", to: "/admin/courses", icon: BookOpen },
    { label: "Syllabi & Outlines", to: "/admin/content/syllabi", icon: FileText },
    { label: "Lecture Notes", to: "/admin/content/notes", icon: FileText },
    { label: "Question Moderation", to: "/admin/moderation", icon: Layers },
    { label: "Students", to: "/admin/dashboard?tab=users", icon: Users },
    { label: "Tutors", to: "/admin/tutor-applications", icon: GraduationCap },
    { label: "Bulk Upload", to: "/admin/bulk-upload", icon: Upload },
  ];

  return (
    <aside
      aria-label="Admin university campus management bar"
      className={cn(
        "rounded-2xl border border-amber-200/80 bg-white/95 backdrop-blur-md shadow-sm overflow-hidden mb-6",
        className
      )}
    >
      {/* Top persistent indicator & switcher zone */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 border-b border-amber-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs bg-neutral-900 text-amber-300">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-neutral-900 text-base leading-tight">
                {managingTitle}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200">
                University Campus
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Campus degree scope · Faculty &amp; level courses for {current.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-neutral-500 hidden md:inline">
            Active Campus:
          </span>
          <EnvironmentSwitcher
            current={current}
            options={options}
            onSelect={select}
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      {/* Scoped navigation quick-strip */}
      {showNavStrip && (
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-none bg-neutral-50/60 border-t border-neutral-100 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 px-2 shrink-0">
            Campus Menus:
          </span>
          {universityNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors shrink-0 font-medium",
                    isActive
                      ? "bg-white text-neutral-950 shadow-xs border border-amber-200"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
                  )
                }
              >
                <Icon className="w-3.5 h-3.5 text-neutral-500" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </aside>
  );
}

export default AdminPersistentHeader;
