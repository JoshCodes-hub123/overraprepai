import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Signature AI entry point. It reads like a question, not a menu item — the
 * point is to make asking feel like the natural thing to do when stuck.
 */
export function AskOverraBlock({ className, to = "/coach" }: { className?: string; to?: string }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      aria-label="Ask Overra AI about a course, topic, concept or question"
      className={cn(
        "flex w-full items-start gap-3.5 rounded-brand-lg border border-brand-line bg-brand-surface p-4 text-left transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env",
        className,
      )}
    >
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-env-soft text-env">
        <Sparkles className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-semibold leading-snug text-brand-ink">
          What are you struggling with today?
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-brand-ink-soft">
          Ask about a course, topic, concept or question.
        </span>
        <span className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-env">
          Ask Overra AI
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </span>
    </button>
  );
}

export default AskOverraBlock;
