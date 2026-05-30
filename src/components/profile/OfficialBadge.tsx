import { BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md";

const SIZE_MAP: Record<Size, { pill: string; icon: string; text: string }> = {
  xs: { pill: "h-4 px-1.5 gap-0.5", icon: "w-2.5 h-2.5", text: "text-[9px]" },
  sm: { pill: "h-5 px-2 gap-1",     icon: "w-3 h-3",     text: "text-[10px]" },
  md: { pill: "h-6 px-2.5 gap-1",   icon: "w-3.5 h-3.5", text: "text-[11px]" },
};

interface Props {
  size?: Size;
  className?: string;
  label?: string;
}

/**
 * Gold "Official" badge — render next to any profile name where
 * `profiles.is_official = true`. Uses OverraPrep gold gradient.
 */
export const OfficialBadge = ({ size = "sm", className, label = "Official" }: Props) => {
  const s = SIZE_MAP[size];
  return (
    <span
      title="Official OverraPrep account"
      className={cn(
        "inline-flex items-center rounded-full font-bold uppercase tracking-wider text-white",
        "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600",
        "shadow-[0_2px_8px_-2px_rgba(217,169,40,0.55)] ring-1 ring-amber-300/60",
        s.pill, s.text, className,
      )}
    >
      <BadgeCheck className={cn(s.icon, "fill-white/20")} strokeWidth={2.5} />
      <span>{label}</span>
    </span>
  );
};

/** React Query hook — fetches & caches `profiles.is_official` per userId. */
export function useIsOfficial(userId?: string | null) {
  return useQuery({
    queryKey: ["is-official", userId],
    enabled: !!userId,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("profiles")
        .select("is_official")
        .eq("user_id", userId!)
        .maybeSingle();
      return Boolean((data as any)?.is_official);
    },
  });
}

/** Convenience wrapper — renders badge only when userId is official. */
export const OfficialBadgeFor = ({ userId, size, className }: { userId?: string | null } & Props) => {
  const { data: isOfficial } = useIsOfficial(userId);
  if (!isOfficial) return null;
  return <OfficialBadge size={size} className={className} />;
};

export default OfficialBadge;
