import { Building2, Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AdminEnvironmentOption } from "@/config/environments";

/**
 * Academic Environment Switcher.
 * Admins manage one isolated environment at a time — never blended data.
 */
export const EnvironmentSwitcher = ({
  current,
  options,
  onSelect,
  className,
}: {
  current: AdminEnvironmentOption;
  options: AdminEnvironmentOption[];
  onSelect: (id: string) => void;
  className?: string;
}) => {
  const Icon = current.env === "jamb" ? Flame : Building2;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 rounded-xl border-amber-200 bg-amber-50/60 text-amber-900 hover:bg-amber-100",
            className
          )}
        >
          <Icon className="w-4 h-4" />
          <span className="font-semibold">{current.label}</span>
          <span className="text-[10px] uppercase tracking-wider text-amber-700/70">
            environment
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Academic environment</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onSelect={() => onSelect(o.id)}
            className="gap-2"
          >
            {o.env === "jamb" ? (
              <Flame className="w-4 h-4 text-amber-600" />
            ) : (
              <Building2 className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="flex-1">{o.label}</span>
            {o.id === current.id && <Check className="w-4 h-4 text-amber-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EnvironmentSwitcher;
