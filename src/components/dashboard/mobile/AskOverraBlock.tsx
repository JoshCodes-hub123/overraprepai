import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Signature AI entry point — styled as a warm gold bento tile.
 */
export function AskOverraBlock({ className, to = "/coach" }: { className?: string; to?: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      aria-label="Ask Overra AI about a course, topic, concept or question"
      className={cn(
        "flex w-full items-center gap-4 rounded-3xl border border-brand-gold-line bg-brand-gold-soft p-5 text-left transition-all hover:shadow-brand-lifted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env",
        className,
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-env text-env-foreground shadow-sm">
        <Sparkles className="h-6 w-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[16px] font-bold leading-snug text-brand-ink">
          Ask Overra AI
        </span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-brand-ink-soft">
          Confused about a topic? Get instant help.
        </span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-env" aria-hidden />
    </button>
  );
}

export default AskOverraBlock;
