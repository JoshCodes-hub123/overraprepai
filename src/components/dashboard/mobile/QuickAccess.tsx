import { Bot, Target, Users, FolderOpen, LucideIcon } from "lucide-react";

export interface QuickAccessItem {
  to: string;
  label: string;
  meta: string;
  icon: LucideIcon;
}

/**
 * Shared quick access for both environments — Practice · Study Materials ·
 * AI Coach · Community. Rendered as a compact icon grid for the bento layout.
 */
export const quickAccessItems = (practiceLabel: string, practiceMeta: string): QuickAccessItem[] => [
  { to: "/practice", label: practiceLabel, meta: practiceMeta, icon: Target },
  {
    to: "/materials",
    label: "Study Materials",
    meta: "Access notes, resources and materials uploaded by your tutors and OverraPrep",
    icon: FolderOpen,
  },
  { to: "/coach", label: "AI Coach", meta: "Where Ask Overra conversations live", icon: Bot },
  { to: "/community", label: "Community", meta: "Study with people like you", icon: Users },
];

export function QuickAccess({ items }: { items: QuickAccessItem[] }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(({ to, label, icon: Icon }) => (
        <a
          key={to}
          href={to}
          className="flex flex-col items-center gap-2 rounded-2xl border border-brand-line bg-brand-surface p-3 text-center transition-all hover:bg-brand-soft hover:shadow-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-env">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-[10px] font-semibold leading-tight text-brand-ink-soft">{label}</span>
        </a>
      ))}
    </div>
  );
}

export default QuickAccess;
