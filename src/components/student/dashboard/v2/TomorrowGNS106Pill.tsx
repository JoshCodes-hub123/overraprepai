import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin-controlled reminder pill for tomorrow's exam.
 * Reads platform_settings keys: upcoming_exam_enabled, upcoming_exam_prefix,
 * upcoming_exam_label, upcoming_exam_emoji.
 */
export default function TomorrowGNS106Pill() {
  const [enabled, setEnabled] = useState(false);
  const [prefix, setPrefix] = useState("Heads-up: tomorrow is");
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("📚");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key,value")
        .in("key", [
          "upcoming_exam_enabled",
          "upcoming_exam_prefix",
          "upcoming_exam_label",
          "upcoming_exam_emoji",
        ]);
      if (cancelled || !data) return;
      const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
      setEnabled((map.upcoming_exam_enabled ?? "false").toLowerCase() === "true");
      if (map.upcoming_exam_prefix) setPrefix(map.upcoming_exam_prefix);
      if (map.upcoming_exam_label) setLabel(map.upcoming_exam_label);
      if (map.upcoming_exam_emoji) setEmoji(map.upcoming_exam_emoji);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled || !label) return null;

  return (
    <div className="mt-2 flex justify-center">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm">
        <CalendarClock className="h-3 w-3" />
        <span>
          {prefix} <span className="font-bold">{label}</span> test {emoji}
        </span>
      </div>
    </div>
  );
}
