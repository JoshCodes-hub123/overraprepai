import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Grid3X3,
  Plus,
  Target,
  CheckCircle2,
} from "lucide-react";
import type { DailyAnalyticsPoint } from "@/hooks/useStudyAnalytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HeatmapMetricMode = "minutes" | "questions" | "accuracy";
export type HeatmapViewMode = "month" | "matrix";

interface StudyActivityHeatmapProps {
  dailyMap: Record<string, DailyAnalyticsPoint>;
  full90DaySeries: DailyAnalyticsPoint[];
  currentStreak: number;
  longestStreak: number;
  onRequestLogForDate?: (dateKey: string) => void;
  className?: string;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface IntensityTierInfo {
  tier: 0 | 1 | 2 | 3 | 4;
  shortLabel: string;
  rangeLabel: string;
  cellClass: string;
  swatchClass: string;
  svgFill: string;
}

function getIntensityTier(
  point: DailyAnalyticsPoint | undefined,
  metric: HeatmapMetricMode,
  isFutureDay: boolean
): IntensityTierInfo {
  if (isFutureDay || !point || !point.streakActive) {
    return {
      tier: 0,
      shortLabel: isFutureDay ? "Upcoming" : "Rest",
      rangeLabel: metric === "minutes" ? "0m" : metric === "questions" ? "0 Qs" : "No quiz",
      cellClass:
        "bg-muted/35 border-border/60 text-muted-foreground hover:border-border",
      swatchClass: "bg-muted/60 border-border/80",
      svgFill: "#e2e8f0",
    };
  }

  let level: 1 | 2 | 3 | 4 = 1;
  if (metric === "minutes") {
    const m = point.studyMinutes;
    if (m >= 60) level = 4;
    else if (m >= 41) level = 3;
    else if (m >= 21) level = 2;
    else level = 1;
  } else if (metric === "questions") {
    const q = point.questionsPracticed;
    if (q >= 45) level = 4;
    else if (q >= 31) level = 3;
    else if (q >= 16) level = 2;
    else level = 1;
  } else {
    const a = point.quizAccuracy;
    if (a >= 85) level = 4;
    else if (a >= 75) level = 3;
    else if (a >= 65) level = 2;
    else level = 1;
  }

  switch (level) {
    case 1:
      return {
        tier: 1,
        shortLabel: "Light",
        rangeLabel:
          metric === "minutes" ? "1–20m" : metric === "questions" ? "1–15 Qs" : "<65%",
        cellClass:
          "bg-amber-500/12 border-amber-400/40 text-foreground hover:border-amber-400",
        swatchClass: "bg-amber-500/20 border-amber-400/50",
        svgFill: "#fde68a",
      };
    case 2:
      return {
        tier: 2,
        shortLabel: "Moderate",
        rangeLabel:
          metric === "minutes" ? "21–40m" : metric === "questions" ? "16–30 Qs" : "65–74%",
        cellClass:
          "bg-amber-500/25 border-amber-500/55 text-foreground hover:border-amber-500",
        swatchClass: "bg-amber-500/40 border-amber-500/60",
        svgFill: "#fbbf24",
      };
    case 3:
      return {
        tier: 3,
        shortLabel: "High",
        rangeLabel:
          metric === "minutes" ? "41–60m" : metric === "questions" ? "31–44 Qs" : "75–84%",
        cellClass:
          "bg-amber-500/45 border-amber-600/70 text-slate-950 dark:text-amber-50 hover:border-amber-500",
        swatchClass: "bg-amber-500/65 border-amber-600/80",
        svgFill: "#f59e0b",
      };
    case 4:
      return {
        tier: 4,
        shortLabel: "Intense",
        rangeLabel:
          metric === "minutes" ? "60m+" : metric === "questions" ? "45+ Qs" : "85%+",
        cellClass:
          "bg-emerald-600/85 dark:bg-emerald-500/80 border-emerald-700 dark:border-emerald-400 text-white hover:border-emerald-300",
        swatchClass: "bg-emerald-600 border-emerald-700",
        svgFill: "#059669",
      };
  }
}

export function StudyActivityHeatmap({
  dailyMap,
  full90DaySeries,
  currentStreak,
  longestStreak,
  onRequestLogForDate,
  className,
}: StudyActivityHeatmapProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = format(today, "yyyy-MM-dd");

  const [viewMode, setViewMode] = useState<HeatmapViewMode>("month");
  const [metricMode, setMetricMode] = useState<HeatmapMetricMode>("minutes");
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  // Earliest month allowed is 2 months back from current month (within 90-day dataset)
  const earliestMonth = useMemo(() => startOfMonth(subMonths(today, 2)), [today]);
  const latestMonth = useMemo(() => startOfMonth(today), [today]);

  const canGoPrevMonth = isAfter(displayedMonth, earliestMonth);
  const canGoNextMonth = isAfter(latestMonth, displayedMonth);

  // Build calendar grid days for displayedMonth (Monday start of week -> Sunday end of week)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(displayedMonth);
    const monthEnd = endOfMonth(displayedMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((dateObj) => {
      const dateKey = format(dateObj, "yyyy-MM-dd");
      const inCurrentMonth = isSameMonth(dateObj, displayedMonth);
      const isFutureDay = isAfter(dateObj, today) && !isToday(dateObj);
      const point = dailyMap[dateKey];
      const intensity = getIntensityTier(point, metricMode, isFutureDay);

      return {
        dateObj,
        dateKey,
        dayNumber: format(dateObj, "d"),
        fullLabel: format(dateObj, "EEE, MMM d, yyyy"),
        shortLabel: format(dateObj, "MMM d"),
        inCurrentMonth,
        isTodayDate: isToday(dateObj),
        isFutureDay,
        point,
        intensity,
      };
    });
  }, [displayedMonth, dailyMap, metricMode, today]);

  // Monthly consistency statistics for displayedMonth
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(displayedMonth);
    const monthEnd = endOfMonth(displayedMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let elapsedDays = 0;
    let activeDays = 0;
    let totalMinutes = 0;
    let totalQuestions = 0;
    let accuracySum = 0;
    let bestMonthStreak = 0;
    let runningStreak = 0;
    let peakDay: { label: string; minutes: number; questions: number } | null = null;

    for (const d of daysInMonth) {
      const isFuture = isAfter(d, today) && !isToday(d);
      if (isFuture) continue;
      elapsedDays += 1;

      const key = format(d, "yyyy-MM-dd");
      const pt = dailyMap[key];
      if (pt && pt.streakActive) {
        activeDays += 1;
        totalMinutes += pt.studyMinutes;
        totalQuestions += pt.questionsPracticed;
        accuracySum += pt.quizAccuracy;
        runningStreak += 1;
        if (runningStreak > bestMonthStreak) bestMonthStreak = runningStreak;

        if (!peakDay || pt.studyMinutes > peakDay.minutes) {
          peakDay = {
            label: format(d, "MMM d"),
            minutes: pt.studyMinutes,
            questions: pt.questionsPracticed,
          };
        }
      } else {
        runningStreak = 0;
      }
    }

    const consistencyPct =
      elapsedDays > 0 ? Math.round((activeDays / elapsedDays) * 100) : 0;
    const meanAccuracy = activeDays > 0 ? Math.round(accuracySum / activeDays) : 0;

    return {
      monthLabel: format(displayedMonth, "MMMM yyyy"),
      elapsedDays,
      totalMonthDays: daysInMonth.length,
      activeDays,
      consistencyPct,
      totalMinutes,
      totalQuestions,
      meanAccuracy,
      bestMonthStreak,
      peakDay,
    };
  }, [displayedMonth, dailyMap, today]);

  // Build 13-week SVG/Grid matrix (columns = weeks, rows = Mon..Sun)
  const matrixWeeks = useMemo(() => {
    const matrixEnd = endOfWeek(today, { weekStartsOn: 1 });
    const matrixStart = startOfWeek(subDays(today, 83), { weekStartsOn: 1 }); // 12 full weeks + current week
    const allDays = eachDayOfInterval({ start: matrixStart, end: matrixEnd });

    const weeks: {
      weekKey: string;
      monthHeader: string | null;
      days: {
        dateObj: Date;
        dateKey: string;
        label: string;
        isFutureDay: boolean;
        isTodayDate: boolean;
        point?: DailyAnalyticsPoint;
        intensity: IntensityTierInfo;
      }[];
    }[] = [];

    let lastMonthStr = "";
    for (let i = 0; i < allDays.length; i += 7) {
      const chunk = allDays.slice(i, i + 7);
      const firstDay = chunk[0];
      const monthStr = format(firstDay, "MMM");
      const monthHeader = monthStr !== lastMonthStr ? monthStr : null;
      lastMonthStr = monthStr;

      weeks.push({
        weekKey: format(firstDay, "yyyy-MM-dd"),
        monthHeader,
        days: chunk.map((d) => {
          const dateKey = format(d, "yyyy-MM-dd");
          const isFutureDay = isAfter(d, today) && !isToday(d);
          const point = dailyMap[dateKey];
          return {
            dateObj: d,
            dateKey,
            label: format(d, "EEE, MMM d"),
            isFutureDay,
            isTodayDate: isToday(d),
            point,
            intensity: getIntensityTier(point, metricMode, isFutureDay),
          };
        }),
      });
    }

    return weeks;
  }, [today, dailyMap, metricMode]);

  // Selected day details
  const selectedDayInfo = useMemo(() => {
    const pt = dailyMap[selectedDateKey];
    let parsedDate = today;
    try {
      parsedDate = parseISO(selectedDateKey);
    } catch {
      parsedDate = today;
    }
    const isFutureDay = isAfter(parsedDate, today) && !isToday(parsedDate);
    const intensity = getIntensityTier(pt, metricMode, isFutureDay);

    return {
      dateKey: selectedDateKey,
      formattedDate: format(parsedDate, "EEEE, MMM d, yyyy"),
      shortDate: format(parsedDate, "MMM d"),
      isTodayDate: isToday(parsedDate),
      isFutureDay,
      point: pt,
      intensity,
    };
  }, [selectedDateKey, dailyMap, metricMode, today]);

  // Legend tiers for the current metric mode
  const legendTiers = useMemo(() => {
    if (metricMode === "minutes") {
      return [
        { label: "Rest (0m)", swatch: "bg-muted/60 border-border/80" },
        { label: "1–20m", swatch: "bg-amber-500/20 border-amber-400/50" },
        { label: "21–40m", swatch: "bg-amber-500/40 border-amber-500/60" },
        { label: "41–60m", swatch: "bg-amber-500/65 border-amber-600/80" },
        { label: "60m+ Peak", swatch: "bg-emerald-600 border-emerald-700" },
      ];
    }
    if (metricMode === "questions") {
      return [
        { label: "Rest (0 Qs)", swatch: "bg-muted/60 border-border/80" },
        { label: "1–15 Qs", swatch: "bg-amber-500/20 border-amber-400/50" },
        { label: "16–30 Qs", swatch: "bg-amber-500/40 border-amber-500/60" },
        { label: "31–44 Qs", swatch: "bg-amber-500/65 border-amber-600/80" },
        { label: "45+ Qs", swatch: "bg-emerald-600 border-emerald-700" },
      ];
    }
    return [
      { label: "Rest", swatch: "bg-muted/60 border-border/80" },
      { label: "<65%", swatch: "bg-amber-500/20 border-amber-400/50" },
      { label: "65–74%", swatch: "bg-amber-500/40 border-amber-500/60" },
      { label: "75–84%", swatch: "bg-amber-500/65 border-amber-600/80" },
      { label: "85%+ Mastery", swatch: "bg-emerald-600 border-emerald-700" },
    ];
  }, [metricMode]);

  const total90Active = useMemo(
    () => full90DaySeries.filter((d) => d.streakActive).length,
    [full90DaySeries]
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-5 space-y-5",
        className
      )}
    >
      {/* =====================================================================
          HEADER & CONTROLS (VIEW SWITCHER + METRIC FILTER + MONTH NAV)
         ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
              03. Study Activity Heatmap & Monthly Consistency
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap font-mono tabular-nums">
            <span>
              {monthStats.activeDays}/{monthStats.elapsedDays} active days in{" "}
              {format(displayedMonth, "MMM")} ({monthStats.consistencyPct}%)
            </span>
            <span aria-hidden="true">·</span>
            <span>{currentStreak}d current streak</span>
            <span aria-hidden="true">·</span>
            <span>{longestStreak}d best streak</span>
            <span aria-hidden="true">·</span>
            <span>{total90Active}/90 days active quarter</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          {/* Metric Selector */}
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/70 border border-border/70"
            role="group"
            aria-label="Heatmap intensity metric"
          >
            {(
              [
                { id: "minutes", label: "Study Mins" },
                { id: "questions", label: "Questions" },
                { id: "accuracy", label: "Accuracy %" },
              ] as { id: HeatmapMetricMode; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMetricMode(item.id)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer",
                  metricMode === item.id
                    ? "bg-card text-foreground shadow-2xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Layout View Switcher: Monthly Calendar vs 90-Day Matrix */}
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/70 border border-border/70"
            role="group"
            aria-label="Heatmap calendar layout"
          >
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer",
                viewMode === "month"
                  ? "bg-card text-foreground shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Month Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer",
                viewMode === "matrix"
                  ? "bg-card text-foreground shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>12-Week Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MAIN BODY: CALENDAR HEATMAP (LEFT 8 COLS) + DAY INSPECTOR (RIGHT 4 COLS)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Calendar Grid or 12-Week D3/SVG Matrix */}
        <div className="lg:col-span-8 space-y-4">
          {viewMode === "month" ? (
            <>
              {/* Month Navigation Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-sm sm:text-base font-bold text-foreground">
                    {monthStats.monthLabel}
                  </h4>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    · {monthStats.totalMinutes} mins · {monthStats.totalQuestions} Qs
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayedMonth(startOfMonth(today));
                      setSelectedDateKey(todayKey);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border/70 bg-background hover:bg-muted/60 text-foreground transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    disabled={!canGoPrevMonth}
                    onClick={() =>
                      setDisplayedMonth((prev) => startOfMonth(subMonths(prev, 1)))
                    }
                    aria-label="Previous month"
                    className="p-1.5 rounded-lg border border-border/70 bg-background hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!canGoNextMonth}
                    onClick={() =>
                      setDisplayedMonth((prev) => startOfMonth(addMonths(prev, 1)))
                    }
                    aria-label="Next month"
                    className="p-1.5 rounded-lg border border-border/70 bg-background hover:bg-muted/60 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Column Headers (Mon - Sun) */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {WEEKDAY_LABELS.map((dayName) => (
                  <div
                    key={dayName}
                    className="text-[11px] font-semibold text-muted-foreground py-1"
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Monthly Calendar Heatmap Grid */}
              <div
                className="grid grid-cols-7 gap-1.5"
                role="grid"
                aria-label={`Study activity calendar for ${monthStats.monthLabel}`}
              >
                {calendarDays.map((cell) => {
                  const isSelected = cell.dateKey === selectedDateKey;
                  const pt = cell.point;
                  const active = Boolean(pt?.streakActive && !cell.isFutureDay);

                  let metricReadout = "—";
                  if (!cell.isFutureDay && pt) {
                    if (metricMode === "minutes") {
                      metricReadout = active ? `${pt.studyMinutes}m` : "0m";
                    } else if (metricMode === "questions") {
                      metricReadout = active ? `${pt.questionsPracticed}Q` : "0Q";
                    } else {
                      metricReadout = active ? `${pt.quizAccuracy}%` : "—";
                    }
                  }

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      disabled={cell.isFutureDay}
                      onClick={() => {
                        setSelectedDateKey(cell.dateKey);
                        if (!cell.inCurrentMonth) {
                          setDisplayedMonth(startOfMonth(cell.dateObj));
                        }
                      }}
                      title={`${cell.fullLabel}: ${
                        active
                          ? `${pt?.studyMinutes} mins · ${pt?.questionsPracticed} questions · ${pt?.quizAccuracy}% accuracy`
                          : cell.isFutureDay
                            ? "Upcoming date"
                            : "Rest day (0 mins logged)"
                      }`}
                      className={cn(
                        "group relative flex flex-col justify-between p-2 sm:p-2.5 min-h-[60px] sm:min-h-[68px] rounded-xl border text-left transition-all cursor-pointer",
                        cell.intensity.cellClass,
                        !cell.inCurrentMonth && "opacity-40",
                        cell.isFutureDay && "opacity-30 cursor-not-allowed",
                        isSelected &&
                          "ring-2 ring-amber-500 ring-offset-1 ring-offset-background"
                      )}
                    >
                      {/* Top row: Date number + Active flame or Today indicator */}
                      <div className="flex items-center justify-between w-full gap-1">
                        <span
                          className={cn(
                            "font-mono text-xs font-bold tabular-nums leading-none",
                            cell.isTodayDate &&
                              "underline decoration-2 underline-offset-2"
                          )}
                        >
                          {cell.dayNumber}
                        </span>
                        {active ? (
                          <Flame
                            className={cn(
                              "w-3 h-3 shrink-0",
                              cell.intensity.tier === 4
                                ? "text-amber-200 fill-amber-200"
                                : "text-amber-500 fill-amber-500"
                            )}
                          />
                        ) : cell.isTodayDate ? (
                          <span className="font-mono text-[9px] font-bold uppercase">
                            Now
                          </span>
                        ) : null}
                      </div>

                      {/* Bottom row: Metric value + tier label */}
                      <div className="mt-2 flex items-baseline justify-between gap-1 w-full">
                        <span className="font-mono text-[11px] sm:text-xs font-extrabold tabular-nums leading-none">
                          {metricReadout}
                        </span>
                        <span className="hidden sm:inline text-[9px] font-medium opacity-80 truncate">
                          {cell.intensity.shortLabel}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* 12-Week SVG/Grid Consistency Matrix View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-sm sm:text-base font-bold text-foreground">
                    12-Week Consistency Matrix
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Multi-month study rhythm across the last 84 days (click any cell to inspect)
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                  {total90Active} active days
                </span>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="min-w-[540px] space-y-1.5">
                  {/* Month Labels Row */}
                  <div className="grid grid-cols-[36px_repeat(12,minmax(0,1fr))] gap-1.5 items-center">
                    <div />
                    {matrixWeeks.slice(-12).map((wk) => (
                      <div
                        key={wk.weekKey}
                        className="text-[11px] font-semibold text-muted-foreground truncate"
                      >
                        {wk.monthHeader || ""}
                      </div>
                    ))}
                  </div>

                  {/* 7 Rows for Mon..Sun across 12 Weeks */}
                  {WEEKDAY_LABELS.map((dayName, dayIdx) => (
                    <div
                      key={dayName}
                      className="grid grid-cols-[36px_repeat(12,minmax(0,1fr))] gap-1.5 items-center"
                    >
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {dayName}
                      </span>
                      {matrixWeeks.slice(-12).map((wk) => {
                        const cell = wk.days[dayIdx];
                        if (!cell) return <div key={wk.weekKey} />;
                        const isSelected = cell.dateKey === selectedDateKey;
                        const active = Boolean(
                          cell.point?.streakActive && !cell.isFutureDay
                        );

                        return (
                          <button
                            key={cell.dateKey}
                            type="button"
                            disabled={cell.isFutureDay}
                            onClick={() => setSelectedDateKey(cell.dateKey)}
                            title={`${cell.label}: ${
                              active
                                ? `${cell.point?.studyMinutes}m · ${cell.point?.questionsPracticed} Qs · ${cell.point?.quizAccuracy}%`
                                : "Rest day"
                            }`}
                            className={cn(
                              "h-7 rounded-lg border font-mono text-[10px] font-bold tabular-nums flex items-center justify-center transition-all cursor-pointer",
                              cell.intensity.cellClass,
                              cell.isFutureDay && "opacity-25 cursor-not-allowed",
                              isSelected &&
                                "ring-2 ring-amber-500 ring-offset-1 ring-offset-background"
                            )}
                          >
                            {active
                              ? metricMode === "minutes"
                                ? `${cell.point?.studyMinutes}m`
                                : metricMode === "questions"
                                  ? `${cell.point?.questionsPracticed}`
                                  : `${cell.point?.quizAccuracy}%`
                              : format(cell.dateObj, "d")}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5-Tier Intensity Scale Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-foreground">Intensity Scale:</span>
              {legendTiers.map((tier) => (
                <span key={tier.label} className="inline-flex items-center gap-1.5">
                  <span
                    className={cn("w-3 h-3 rounded-xs border", tier.swatch)}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[11px] tabular-nums">{tier.label}</span>
                </span>
              ))}
            </div>
            <span className="text-[11px]">
              Select any date cell to inspect or log study time
            </span>
          </div>
        </div>

        {/* Right Column: Selected Day Inspector + Monthly Consistency Breakdown */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Date Telemetry Inspector */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3.5">
            <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">
                  Selected Date Telemetry
                </div>
                <h4 className="font-display text-sm font-bold text-foreground mt-0.5">
                  {selectedDayInfo.formattedDate}
                </h4>
              </div>
              <span className="font-mono text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400">
                {selectedDayInfo.intensity.shortLabel} ({selectedDayInfo.intensity.rangeLabel})
              </span>
            </div>

            {selectedDayInfo.point && selectedDayInfo.point.streakActive ? (
              <div className="grid grid-cols-2 gap-2.5 font-mono tabular-nums">
                <div className="p-2.5 rounded-lg bg-card border border-border/60">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-sans">
                    <span>Study Time</span>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-base font-extrabold text-foreground mt-1">
                    {selectedDayInfo.point.studyMinutes} mins
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-card border border-border/60">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-sans">
                    <span>Questions</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-base font-extrabold text-foreground mt-1">
                    {selectedDayInfo.point.questionsPracticed} Qs
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-card border border-border/60">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-sans">
                    <span>Quiz Accuracy</span>
                    <Target className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-base font-extrabold text-foreground mt-1">
                    {selectedDayInfo.point.quizAccuracy}%
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-card border border-border/60">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-sans">
                    <span>Readiness Index</span>
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-base font-extrabold text-foreground mt-1">
                    {selectedDayInfo.point.performanceIndex}/100
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-1.5">
                <p className="text-xs font-semibold text-foreground">
                  No Study Activity Logged on {selectedDayInfo.shortDate}
                </p>
                <p className="text-xs text-muted-foreground">
                  Record offline reading or past-question practice for this date to build your
                  monthly consistency score.
                </p>
              </div>
            )}

            {onRequestLogForDate && !selectedDayInfo.isFutureDay && (
              <Button
                type="button"
                size="sm"
                onClick={() => onRequestLogForDate(selectedDayInfo.dateKey)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl h-9 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {selectedDayInfo.point?.streakActive
                  ? `Add Session to ${selectedDayInfo.shortDate}`
                  : `Log Study Session for ${selectedDayInfo.shortDate}`}
              </Button>
            )}
          </div>

          {/* Monthly Consistency Summary Ledger */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                {monthStats.monthLabel} Summary
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {monthStats.consistencyPct}% Consistent
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${Math.min(100, monthStats.consistencyPct)}%` }}
              />
            </div>

            <div className="divide-y divide-border/60 text-xs pt-1">
              <div className="py-1.5 flex items-center justify-between">
                <span className="text-muted-foreground">Active Study Days</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {monthStats.activeDays} / {monthStats.elapsedDays} days
                </span>
              </div>
              <div className="py-1.5 flex items-center justify-between">
                <span className="text-muted-foreground">Best Streak in Month</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {monthStats.bestMonthStreak} days
                </span>
              </div>
              <div className="py-1.5 flex items-center justify-between">
                <span className="text-muted-foreground">Monthly Mean Accuracy</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {monthStats.meanAccuracy}%
                </span>
              </div>
              <div className="py-1.5 flex items-center justify-between">
                <span className="text-muted-foreground">Peak Study Day</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {monthStats.peakDay
                    ? `${monthStats.peakDay.label} · ${monthStats.peakDay.minutes}m`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudyActivityHeatmap;
