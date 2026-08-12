import { useNavigate } from "react-router-dom";
import { ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CourseRowProps {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  level?: string | null;
  unreadUpdates?: number;
  actionLabel?: string;
  className?: string;
}

const INITIAL_COLORS = [
  "bg-env text-env-foreground",
  "bg-accent text-accent-foreground",
  "bg-emerald-600 text-white",
  "bg-rose-500 text-white",
  "bg-violet-600 text-white",
  "bg-sky-600 text-white",
];

function colorFromCode(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % INITIAL_COLORS.length;
  return INITIAL_COLORS[idx];
}

function initials(code: string) {
  const parts = code.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /^\d/.test(parts[1])) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts
    .map((w) => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("") || "C";
}

export function CourseRow({
  id,
  code,
  name,
  department,
  level,
  unreadUpdates = 0,
  actionLabel = "Continue",
  className,
}: CourseRowProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/courses/${id}`)}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border border-brand-line bg-brand-surface p-4 text-left transition-all hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env",
        className,
      )}
      aria-label={`${code} ${name}`}
    >
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-[14px] font-bold shadow-sm",
          colorFromCode(code),
        )}
        aria-hidden
      >
        {initials(code)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-display text-[15px] font-bold text-brand-ink">
            {code}
          </span>
          {unreadUpdates > 0 && (
            <span className="inline-flex h-5 items-center rounded-full bg-env px-2 text-[10px] font-bold text-env-foreground">
              {unreadUpdates}
            </span>
          )}
        </span>
        <span className="block truncate text-[13px] text-brand-ink-soft">{name}</span>
        {(department || level) && (
          <span className="mt-0.5 block truncate text-[11px] text-brand-ink-soft/70">
            {department && level ? `${department} · ${level}` : department || level}
          </span>
        )}
      </span>

      <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-env">
        <span className="hidden sm:inline">{actionLabel}</span>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}

export function EmptyCourses({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-brand-line bg-brand-surface p-8 text-center",
        className,
      )}
    >
      <BookOpen className="h-8 w-8 text-brand-ink-soft/50" aria-hidden />
      <p className="mt-3 font-display text-[14px] font-semibold text-brand-ink">No courses yet</p>
      <p className="text-[12px] text-brand-ink-soft">Explore your course hub to get started.</p>
    </div>
  );
}

export default CourseRow;
