import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

interface ContinueBlockProps {
  /** Small label above the title, e.g. "Continue learning". */
  eyebrow: string;
  title: ReactNode;
  meta?: ReactNode;
  cta: string;
  to: string;
  loading?: boolean;
  className?: string;
}

/**
 * The single primary action of the home screen.
 *
 * There is exactly one of these per dashboard — it is the only element allowed
 * to carry the gold fill, which is what makes the next step obvious without
 * any statistics or decoration.
 */
export function ContinueBlock({
  eyebrow,
  title,
  meta,
  cta,
  to,
  loading,
  className,
}: ContinueBlockProps) {
  const navigate = useNavigate();

  if (loading) {
    return <div className={cn("h-40 animate-pulse rounded-brand-lg bg-brand-soft", className)} />;
  }

  return (
    <section
      className={cn(
        "rounded-brand-lg border border-env-line bg-env-soft p-5 shadow-brand",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-env">{eyebrow}</p>
      <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight text-brand-ink">
        {title}
      </h2>
      {meta && <p className="mt-1.5 text-[14px] text-brand-ink-soft">{meta}</p>}
      <BrandButton size="lg" className="mt-5 w-full sm:w-auto" onClick={() => navigate(to)}>
        {cta} <ArrowRight className="h-4 w-4" />
      </BrandButton>
    </section>
  );
}

export default ContinueBlock;
