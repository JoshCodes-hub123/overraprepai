import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  name?: string | null;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}

/**
 * Small pill showing a tutor's organisation (e.g. "FUTA · Mech Eng", "TopRank Tutors").
 * Renders nothing when no org is set.
 */
export function TutorOrgBadge({ name, logoUrl, size = "sm", className }: Props) {
  if (!name?.trim()) return null;

  const sizing = {
    xs: { pill: "h-5 px-1.5 text-[10px] gap-1", img: "w-3 h-3", icon: "w-2.5 h-2.5" },
    sm: { pill: "h-6 px-2 text-[11px] gap-1.5", img: "w-3.5 h-3.5", icon: "w-3 h-3" },
    md: { pill: "h-7 px-2.5 text-xs gap-1.5", img: "w-4 h-4", icon: "w-3.5 h-3.5" },
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold whitespace-nowrap",
        sizing.pill,
        className,
      )}
      title={name}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className={cn("rounded-sm object-cover shrink-0", sizing.img)}
          loading="lazy"
        />
      ) : (
        <Building2 className={cn("text-amber-700 shrink-0", sizing.icon)} />
      )}
      <span className="truncate max-w-[14ch]">{name}</span>
    </span>
  );
}

export default TutorOrgBadge;
