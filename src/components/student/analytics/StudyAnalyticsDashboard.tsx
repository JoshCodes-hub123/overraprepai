import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Flame,
  TrendingUp,
  Target,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import {
  useStudyAnalytics,
  type AnalyticsTimeframe,
} from "@/hooks/useStudyAnalytics";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { DashboardPreferencesDialog } from "@/components/student/dashboard/DashboardPreferencesMenu";
import { StudyActivityHeatmap } from "@/components/student/analytics/StudyActivityHeatmap";
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

const TIMEFRAME_OPTIONS: { value: AnalyticsTimeframe; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "14d", label: "14 Days" },
  { value: "30d", label: "30 Days" },
];

const QUICK_COURSES = ["PHY 102", "MTS 102", "CSC 103", "CHE 102", "GNS 102", "BIO 104"];

export function StudyAnalyticsDashboard({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>("14d");
  const {
    dailySeries,
    full30DaySeries,
    full90DaySeries,
    dailyMap,
    courseBars,
    summary,
    logStudySession,
  } = useStudyAnalytics(timeframe);
  const { preferences, visibleCount, totalCount } = useDashboardPreferences();
  const [prefsDialogOpen, setPrefsDialogOpen] = useState(false);

  const todayKey = format(new Date(), "yyyy-MM-dd");

  // Quick Log Study Session modal state
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logTargetDate, setLogTargetDate] = useState<string>(todayKey);
  const [logCourse, setLogCourse] = useState("PHY 102");
  const [logMinutes, setLogMinutes] = useState(30);
  const [logQuestions, setLogQuestions] = useState(20);
  const [logAccuracy, setLogAccuracy] = useState(85);

  const last14Days = full30DaySeries.slice(-14);

  const handleOpenLogModal = (dateKey?: string) => {
    setLogTargetDate(dateKey || todayKey);
    setLogDialogOpen(true);
  };

  const handleConfirmLog = () => {
    logStudySession({
      courseCode: logCourse,
      minutes: logMinutes,
      questions: logQuestions,
      accuracy: logAccuracy,
      dateKey: logTargetDate,
    });
    setLogDialogOpen(false);
  };

  return (
    <section className={cn("space-y-6", className)} aria-label="Study Analytics Dashboard">
      {/* =====================================================================
          HEADER & TIMEFRAME FILTER BAR
         ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Study Analytics & Performance Trends
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
            <span>Composite Readiness {summary.performanceScore}%</span>
            <span aria-hidden="true">·</span>
            <span>{summary.totalQuestions} questions practiced</span>
            <span aria-hidden="true">·</span>
            <span>{Math.round((summary.totalStudyMinutes / 60) * 10) / 10} hrs studied</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
          {/* Interactive Segmented Timeframe Control */}
          <div
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/80 border border-border/70"
            role="group"
            aria-label="Select analytics timeframe"
          >
            {TIMEFRAME_OPTIONS.map((opt) => {
              const active = timeframe === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeframe(opt.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer",
                    active
                      ? "bg-card text-foreground shadow-2xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPrefsDialogOpen(true)}
            className="text-xs font-semibold rounded-xl h-9 px-3 whitespace-nowrap shrink-0"
            title="Toggle visibility of Heatmap, Global Rankings, and other widgets"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            <span>Widgets ({visibleCount}/{totalCount})</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenLogModal(todayKey)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl h-9 px-3.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Log Study Session
          </Button>
        </div>
      </div>

      {/* =====================================================================
          4 KPI SUMMARY STRIP (TABULAR NUMERALS, SINGLE-ELEVATION)
         ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Performance Index</span>
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground">
              {summary.performanceScore}%
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {summary.accuracyDelta >= 0 ? `+${summary.accuracyDelta}%` : `${summary.accuracyDelta}%`}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>First-class target 75%</span>
            <span aria-hidden="true">·</span>
            <span>{timeframe.toUpperCase()} window</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Quiz Accuracy Trend</span>
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground">
              {summary.avgAccuracy}%
            </span>
            <span className="text-xs text-muted-foreground">mean</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">{summary.totalQuestions}</span>
            <span>questions graded</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Daily Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground">
              {summary.currentStreak}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">days</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Personal best {summary.longestStreak}d</span>
            <span aria-hidden="true">·</span>
            <span>{summary.activeDaysInWindow} active in window</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Focused Study Time</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground">
              {summary.totalStudyMinutes}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">mins</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              {Math.round(summary.totalStudyMinutes / Math.max(1, summary.activeDaysInWindow))}m
            </span>
            <span>daily avg</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          OPTIONAL GLOBAL RANKINGS STANDING BANNER (WHEN ENABLED)
         ===================================================================== */}
      {preferences.showGlobalRankings && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-foreground">
                  Global Rankings & Peer Comparison
                </h3>
                <span className="font-mono text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400">
                  · {summary.currentStreak}d Streak · {summary.avgAccuracy}% Accuracy
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compare your daily study streak and CBT quiz mastery against students across all campuses
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/leaderboard")}
            className="text-xs font-semibold rounded-xl shrink-0 self-start sm:self-center"
          >
            <span>Compare Global Rankings</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      )}

      {/* =====================================================================
          CHART 1: PERFORMANCE PROGRESS OVER TIME (AREA CHART)
          & CHART 2: QUIZ ACCURACY TRENDS (LINE CHART)
         ===================================================================== */}
      {preferences.showPerformanceCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 1. Performance Progress Over Time */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-foreground">
                  01. Performance Progress Over Time
                </h3>
                <span className="font-mono text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400">
                  {summary.performanceScore}/100
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Composite mastery index combining CBT score accuracy and daily study consistency
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldPerformanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    domain={[40, 100]}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Performance Index"]}
                  />
                  <ReferenceLine
                    y={75}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{
                      value: "First Class (75%)",
                      position: "insideTopRight",
                      fill: "#10b981",
                      fontSize: 10,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="performanceIndex"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#goldPerformanceFill)"
                    activeDot={{ r: 5, fill: "#f59e0b", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Quiz Accuracy Trends */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between">
            <div className="mb-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-foreground">
                  02. Quiz Accuracy Trends
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-0.5 bg-amber-500" />
                    Session %
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-0.5 bg-emerald-600" />
                    Rolling Avg
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily CBT practice accuracy compared against your 3-day rolling trend line
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    domain={[40, 100]}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value}%`,
                      name === "rollingAccuracy" ? "Rolling Avg" : "Daily Accuracy",
                    ]}
                  />
                  <ReferenceLine y={60} stroke="#f43f5e" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="quizAccuracy"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f59e0b" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rollingAccuracy"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: CALENDAR-BASED STUDY ACTIVITY HEATMAP
         ===================================================================== */}
      {preferences.showHeatmap && (
        <StudyActivityHeatmap
          dailyMap={dailyMap}
          full90DaySeries={full90DaySeries}
          currentStreak={summary.currentStreak}
          longestStreak={summary.longestStreak}
          onRequestLogForDate={(dateKey) => handleOpenLogModal(dateKey)}
        />
      )}

      {/* =====================================================================
          CHART 4: DAILY STUDY STREAKS & PRACTICE VOLUME (BAR CHART)
          & CHART 5: COURSE ACCURACY COMPARISON
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 4. Daily Study Streaks & Activity Volume */}
        <div
          className={cn(
            "rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-5",
            preferences.showCourseMastery ? "lg:col-span-7" : "lg:col-span-12"
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-foreground">
                04. Daily Study Streaks & Practice Volume
              </h3>
              <span className="font-mono text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400">
                {summary.currentStreak}d Active Streak
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily focused study minutes and 14-day streak ribbon
            </p>
          </div>

          {/* 14-Day Streak Calendar Strip */}
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-1">
            {last14Days.map((day) => (
              <div
                key={day.dateKey}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-colors",
                  day.streakActive
                    ? "border-amber-300/90 bg-amber-500/15 text-amber-950 dark:text-amber-200"
                    : "border-border/60 bg-muted/40 text-muted-foreground"
                )}
                title={`${day.label}: ${day.studyMinutes} mins · ${day.questionsPracticed} questions`}
              >
                <span className="text-[10px] font-medium opacity-75">{day.shortDay.slice(0, 2)}</span>
                <div className="my-1">
                  {day.streakActive ? (
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  ) : (
                    <span className="block w-1.5 h-1.5 rounded-full bg-muted-foreground/30 my-1" />
                  )}
                </div>
                <span className="font-mono text-[10px] font-bold tabular-nums">
                  {day.dateKey.slice(-2)}
                </span>
              </div>
            ))}
          </div>

          {/* Study Minutes Bar Chart */}
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={14}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  unit="m"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, _name, props) => [
                    `${value} mins (${props.payload.questionsPracticed} Qs)`,
                    "Study Volume",
                  ]}
                />
                <Bar dataKey="studyMinutes" radius={[6, 6, 0, 0]} maxBarSize={28}>
                  {dailySeries.map((entry) => (
                    <Cell
                      key={entry.dateKey}
                      fill={entry.studyMinutes >= 35 ? "#d97706" : entry.studyMinutes > 0 ? "#fbbf24" : "#e2e8f0"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Course-by-Course Mastery Bar Chart & Table (5 columns on desktop) */}
        {preferences.showCourseMastery && (
          <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-foreground">
                  05. Accuracy by Course
                </h3>
                <button
                  type="button"
                  onClick={() => navigate("/practice")}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Practice CBT</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Subject standing and average response speed across semester courses
              </p>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={courseBars}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <YAxis
                    type="category"
                    dataKey="courseCode"
                    width={62}
                    tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Course Accuracy"]}
                  />
                  <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} barSize={16}>
                    {courseBars.map((c) => (
                      <Cell
                        key={c.courseCode}
                        fill={
                          c.accuracy >= 80
                            ? "#10b981"
                            : c.accuracy >= 65
                              ? "#f59e0b"
                              : "#f43f5e"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* High-Density Tabular Course Telemetry */}
            <div className="divide-y divide-border/60 border-t border-border/60 pt-2">
              {courseBars.slice(0, 5).map((c) => (
                <div
                  key={c.courseCode}
                  className="py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-foreground">{c.courseCode}</span>
                    <span className="text-muted-foreground mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-muted-foreground truncate">{c.courseName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                    <span className="text-muted-foreground">{c.avgSpeedSec}s/q</span>
                    <span
                      className={cn(
                        "font-bold",
                        c.accuracy >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : c.accuracy >= 65
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {c.accuracy}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          LOG DAILY STUDY SESSION DIALOG
         ===================================================================== */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Log Daily Study Session</DialogTitle>
            <DialogDescription>
              Record your offline textbook reading or past-question drill for{" "}
              <span className="font-mono font-bold text-foreground">{logTargetDate}</span> to keep
              your heatmap and performance charts up to date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label
                htmlFor="study-date"
                className="text-xs font-semibold text-foreground block mb-1.5"
              >
                Session Date
              </label>
              <input
                id="study-date"
                type="date"
                max={todayKey}
                value={logTargetDate}
                onChange={(e) => setLogTargetDate(e.target.value || todayKey)}
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Course Code
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {QUICK_COURSES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLogCourse(code)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg font-mono text-xs font-bold border transition-colors cursor-pointer",
                      logCourse === code
                        ? "bg-amber-500 text-slate-950 border-amber-500"
                        : "bg-card text-foreground border-border hover:border-amber-300"
                    )}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label
                  htmlFor="study-mins"
                  className="text-xs font-semibold text-foreground block mb-1"
                >
                  Minutes
                </label>
                <input
                  id="study-mins"
                  type="number"
                  min={5}
                  max={360}
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(Math.max(5, Number(e.target.value) || 15))}
                  className="w-full h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs font-bold tabular-nums"
                />
              </div>
              <div>
                <label
                  htmlFor="study-qs"
                  className="text-xs font-semibold text-foreground block mb-1"
                >
                  Questions
                </label>
                <input
                  id="study-qs"
                  type="number"
                  min={1}
                  max={200}
                  value={logQuestions}
                  onChange={(e) => setLogQuestions(Math.max(1, Number(e.target.value) || 10))}
                  className="w-full h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs font-bold tabular-nums"
                />
              </div>
              <div>
                <label
                  htmlFor="study-acc"
                  className="text-xs font-semibold text-foreground block mb-1"
                >
                  Accuracy %
                </label>
                <input
                  id="study-acc"
                  type="number"
                  min={10}
                  max={100}
                  value={logAccuracy}
                  onChange={(e) =>
                    setLogAccuracy(Math.min(100, Math.max(10, Number(e.target.value) || 75)))
                  }
                  className="w-full h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs font-bold tabular-nums"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmLog}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Save to Analytics
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DashboardPreferencesDialog open={prefsDialogOpen} onOpenChange={setPrefsDialogOpen} />
    </section>
  );
}

export default StudyAnalyticsDashboard;
