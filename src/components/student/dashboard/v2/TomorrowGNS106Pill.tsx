import { CalendarClock } from "lucide-react";

/**
 * Tiny, low-key reminder pill that tomorrow is the CHE 102 test.
 * Designed to sit at the top of the dashboard without disturbing layout.
 */
export default function TomorrowGNS106Pill() {
  return (
    <div className="mt-2 flex justify-center">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/70 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm">
        <CalendarClock className="h-3 w-3" />
        <span>Heads-up: tomorrow is <span className="font-bold">CHE 102</span> test 🧪</span>
      </div>
    </div>
  );
}
