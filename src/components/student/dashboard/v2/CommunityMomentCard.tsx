import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function CommunityMomentCard() {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count } = await (supabase as any)
        .from("quiz_attempts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start.toISOString());
      if (!cancel) setCount(count ?? 0);
    })();
    return () => { cancel = true; };
  }, []);

  const message =
    count > 0
      ? `${count} student${count === 1 ? "" : "s"} practised on OverraPrep today`
      : "Be the first to complete a quiz today";

  return (
    <Link
      to="/community"
      className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-orange-50/40 p-3 hover:shadow-md hover:border-amber-200 transition group"
    >
      <span className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 inline-flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
        <Users className="w-5 h-5 text-white" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[13px] font-bold leading-tight text-neutral-900">{message}</p>
        <p className="text-[11.5px] text-neutral-500 leading-tight mt-0.5">Keep pushing, you're not alone!</p>
      </div>
      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform">
        Join <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}

export default CommunityMomentCard;
