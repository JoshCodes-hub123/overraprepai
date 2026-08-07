import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MissionBlockProps {
  title: ReactNode;
  /** e.g. "~10 min · 20 questions" — only real, known values. */
  meta?: ReactNode;
  cta: string;
  to: string;
  className?: string;
}

/**
 * Today's mission — one sentence and one action. Deliberately lighter than the
 * hero so the page still has a single obvious primary step.
 */
export function MissionBlock({ title, meta, cta, to, className }: MissionBlockProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "rounded-brand border border-brand-line bg-brand-surface p-4",
        className,
      )}
    >
      <p className="text-[15px] font-semibold leading-snug text-brand-ink">{title}</p>
      {meta && <p className="mt-1 text-[13px] text-brand-ink-soft">{meta}</p>}
      <button
        type="button"
        onClick={() => navigate(to)}
        className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-env transition-colors hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env rounded-full"
      >
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export default MissionBlock;
