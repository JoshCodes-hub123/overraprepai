import { ButtonHTMLAttributes, forwardRef } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "lg";

interface BrandButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  to?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-env text-env-foreground hover:opacity-90 shadow-brand",
  secondary: "border border-brand-line bg-brand-surface text-brand-ink hover:bg-brand-soft",
  quiet: "text-brand-ink-soft hover:text-brand-ink hover:bg-brand-soft",
};

const SIZES: Record<Size, string> = {
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 min-h-[52px] px-6 text-base",
};

/**
 * The only button used in rebranded screens. One primary action per screen.
 */
export const BrandButton = forwardRef<HTMLButtonElement, BrandButtonProps>(
  ({ variant = "primary", size = "md", block, loading, to, className, children, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env",
      VARIANTS[variant],
      SIZES[size],
      block && "w-full",
      className,
    );

    if (to) {
      return (
        <Link to={to} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} disabled={loading || props.disabled} {...props}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
BrandButton.displayName = "BrandButton";

export default BrandButton;
