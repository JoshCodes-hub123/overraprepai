import React from "react";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeToggleProps {
  variant?: "segmented" | "compact" | "dropdown";
  className?: string;
  showLabels?: boolean;
}

const OPTIONS: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

export function ThemeToggle({
  variant = "segmented",
  className,
  showLabels = true,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const handleSelect = async (val: Theme) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(8);
      }
    }
    setTheme(val);
  };

  if (variant === "compact") {
    const CurrentIcon = resolvedTheme === "dark" ? Moon : Sun;
    return (
      <button
        type="button"
        onClick={() => {
          try {
            Haptics.impact({ style: ImpactStyle.Light });
          } catch {
            // noop
          }
          toggleTheme();
        }}
        aria-label={`Toggle theme (currently ${theme})`}
        title={`Current theme: ${theme} (${resolvedTheme})`}
        className={cn(
          "relative inline-flex items-center justify-center h-9 w-9 rounded-full transition-colors",
          "border border-border/80 bg-card/80 text-foreground hover:bg-muted active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs",
          className
        )}
      >
        <CurrentIcon className="w-4 h-4 text-amber-500 transition-transform duration-200" />
      </button>
    );
  }

  if (variant === "dropdown") {
    const CurrentIcon = theme === "system" ? Laptop : resolvedTheme === "dark" ? Moon : Sun;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-border/70",
              "bg-card text-foreground hover:bg-muted transition-colors text-xs font-medium shadow-xs",
              className
            )}
          >
            <CurrentIcon className="w-4 h-4 text-primary" />
            <span className="capitalize">{theme}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36 p-1 bg-card border-border shadow-lg">
          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
            Appearance
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/60" />
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => handleSelect(value)}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer",
                theme === value ? "font-semibold text-primary bg-primary/10" : "text-foreground hover:bg-muted"
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{label}</span>
              </span>
              {theme === value && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Segmented control (default)
  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className={cn(
        "inline-flex items-center p-1 rounded-2xl border border-border/80 bg-muted/50 backdrop-blur-sm select-none",
        className
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => handleSelect(value)}
            className={cn(
              "relative flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-xl text-xs font-semibold transition-colors duration-200",
              active
                ? "text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.div
                layoutId="theme-pill"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute inset-0 rounded-xl bg-card border border-border shadow-xs"
              />
            )}
            <Icon
              className={cn(
                "relative z-10 w-3.5 h-3.5 transition-transform duration-200",
                active ? "text-primary scale-110" : "text-muted-foreground"
              )}
            />
            {showLabels && (
              <span className="relative z-10 text-[12px] capitalize tracking-tight">
                {label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
