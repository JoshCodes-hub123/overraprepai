import { Bot, Target, Users, LucideIcon } from "lucide-react";
import { ListRow } from "@/components/ui-kit";

export interface QuickAccessItem {
  to: string;
  label: string;
  meta: string;
  icon: LucideIcon;
}

/** Shared trio for both environments — Practice · AI Coach · Community. */
export const quickAccessItems = (practiceLabel: string, practiceMeta: string): QuickAccessItem[] => [
  { to: "/practice", label: practiceLabel, meta: practiceMeta, icon: Target },
  { to: "/coach", label: "AI Coach", meta: "Ask anything, get a study plan", icon: Bot },
  { to: "/community", label: "Community", meta: "Study with people like you", icon: Users },
];

export function QuickAccess({ items }: { items: QuickAccessItem[] }) {
  return (
    <div className="space-y-2.5">
      {items.map(({ to, label, meta, icon: Icon }) => (
        <ListRow key={to} to={to} title={label} meta={meta} icon={<Icon className="h-5 w-5" />} />
      ))}
    </div>
  );
}

export default QuickAccess;
