import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ScreenHeaderProps {
  title: ReactNode;
  /** One short supporting line. Keep it to one. */
  subtitle?: ReactNode;
  /** Small environment / context chip shown above the title. */
  chip?: ReactNode;
  back?: boolean;
  onBack?: () => void;
  /** At most one action. Screens should have one obvious next step. */
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent header for every screen: optional back, one title, one action.
 */
export function ScreenHeader({
  title,
  subtitle,
  chip,
  back,
  onBack,
  action,
  className,
}: ScreenHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={cn("pt-5 pb-6", className)}>
      {back && (
        <button
          type="button"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          aria-label="Back"
          className="-ml-2 mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-ink-soft transition-colors hover:bg-brand-soft hover:text-brand-ink"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      {chip && <div className="mb-2">{chip}</div>}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-[1.15] font-bold tracking-tight text-brand-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-[15px] leading-relaxed text-brand-ink-soft">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0 pt-1">{action}</div>}
      </div>
    </header>
  );
}

export default ScreenHeader;
