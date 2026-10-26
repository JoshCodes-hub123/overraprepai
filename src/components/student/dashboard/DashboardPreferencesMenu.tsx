import {
  Calendar,
  Trophy,
  Flame,
  TrendingUp,
  BookOpen,
  Target,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  useDashboardPreferences,
  DASHBOARD_WIDGET_LIST,
  type DashboardPreferences,
} from "@/hooks/useDashboardPreferences";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const WIDGET_ICONS: Record<keyof DashboardPreferences, typeof Calendar> = {
  showHeatmap: Calendar,
  showGlobalRankings: Trophy,
  showDailyCheckIn: Flame,
  showPerformanceCharts: TrendingUp,
  showCourseMastery: BookOpen,
  showPracticeTarget: Target,
};

interface DashboardPreferencesPanelProps {
  className?: string;
  compact?: boolean;
}

export function DashboardPreferencesPanel({
  className,
  compact = false,
}: DashboardPreferencesPanelProps) {
  const { preferences, toggleWidget, applyPreset, visibleCount, totalCount } =
    useDashboardPreferences();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Top Status & Quick Presets Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono font-bold tabular-nums text-foreground">
            {visibleCount}/{totalCount}
          </span>
          <span>widgets visible</span>
          <span aria-hidden="true">·</span>
          <span>Saved to your profile</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset("minimal")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/80 bg-background hover:bg-muted/60 text-xs font-semibold text-foreground transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Minimal UI</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset("full")}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/80 bg-background hover:bg-muted/60 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Show All</span>
          </button>
        </div>
      </div>

      {/* Widget Toggle Rows */}
      <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-card overflow-hidden">
        {DASHBOARD_WIDGET_LIST.map((widget) => {
          const Icon = WIDGET_ICONS[widget.key];
          const isChecked = preferences[widget.key];

          return (
            <div
              key={widget.key}
              className={cn(
                "flex items-center justify-between gap-3 transition-colors hover:bg-muted/30",
                compact ? "px-3.5 py-2.5" : "px-4 py-3.5"
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className={cn(
                    "h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0 transition-colors",
                    isChecked
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`pref-${widget.key}`}
                      className="text-xs sm:text-sm font-bold text-foreground cursor-pointer truncate"
                    >
                      {widget.label}
                    </label>
                    <span className="hidden sm:inline text-[11px] text-muted-foreground">
                      · {widget.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {widget.description}
                  </p>
                </div>
              </div>

              <Switch
                id={`pref-${widget.key}`}
                checked={isChecked}
                onCheckedChange={(checked) => toggleWidget(widget.key, checked)}
                aria-label={`Toggle ${widget.label}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DashboardPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DashboardPreferencesDialog({
  open,
  onOpenChange,
}: DashboardPreferencesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
            <span>Dashboard Preferences</span>
          </DialogTitle>
          <DialogDescription>
            Customize your study workspace by toggling specific widgets such as Global Rankings
            or the Study Activity Heatmap for a cleaner, distraction-free UI.
          </DialogDescription>
        </DialogHeader>

        <DashboardPreferencesPanel compact />

        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DashboardPreferencesPanel;
