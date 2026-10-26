import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface DashboardPreferences {
  showHeatmap: boolean;
  showGlobalRankings: boolean;
  showDailyCheckIn: boolean;
  showPerformanceCharts: boolean;
  showPracticeTarget: boolean;
  showCourseMastery: boolean;
}

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  showHeatmap: true,
  showGlobalRankings: true,
  showDailyCheckIn: true,
  showPerformanceCharts: true,
  showPracticeTarget: true,
  showCourseMastery: true,
};

export interface DashboardWidgetMeta {
  key: keyof DashboardPreferences;
  label: string;
  description: string;
  category: "Analytics" | "Social & Gamification" | "Study Workflow";
}

export const DASHBOARD_WIDGET_LIST: DashboardWidgetMeta[] = [
  {
    key: "showHeatmap",
    label: "Study Activity Heatmap",
    description: "Monthly calendar grid and 12-week study consistency matrix",
    category: "Analytics",
  },
  {
    key: "showGlobalRankings",
    label: "Global Rankings & Leaderboard",
    description: "Compare study streaks, quiz volume, and accuracy against peers",
    category: "Social & Gamification",
  },
  {
    key: "showDailyCheckIn",
    label: "Daily Check-in Streak Bonus",
    description: "Consecutive login streak reward widget in sidebar and home",
    category: "Social & Gamification",
  },
  {
    key: "showPerformanceCharts",
    label: "Performance & Accuracy Trends",
    description: "Area and line charts tracking composite readiness and CBT accuracy",
    category: "Analytics",
  },
  {
    key: "showCourseMastery",
    label: "Course-by-Course Mastery",
    description: "Subject accuracy breakdown and response speed telemetry table",
    category: "Analytics",
  },
  {
    key: "showPracticeTarget",
    label: "Daily Practice Target & Pulse",
    description: "Daily academic mission checklist and weekly quiz completion pulse",
    category: "Study Workflow",
  },
];

const STORAGE_PREFIX = "overraprep_dashboard_prefs_v1_";
const PREFS_EVENT = "overraprep:dashboard-prefs-updated";

function readPrefsFromStorage(userId?: string): DashboardPreferences {
  const key = `${STORAGE_PREFIX}${userId || "guest"}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_DASHBOARD_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DASHBOARD_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES;
  }
}

function writePrefsToStorage(userId: string | undefined, prefs: DashboardPreferences) {
  const key = `${STORAGE_PREFIX}${userId || "guest"}`;
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: { userId, prefs } }));
  } catch {
    // ignore storage quota errors
  }
}

export function useDashboardPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<DashboardPreferences>(() =>
    readPrefsFromStorage(user?.id)
  );

  // Sync when user changes or when another component updates preferences
  useEffect(() => {
    setPreferences(readPrefsFromStorage(user?.id));

    const handleSync = () => {
      setPreferences(readPrefsFromStorage(user?.id));
    };

    window.addEventListener(PREFS_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(PREFS_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [user?.id]);

  const toggleWidget = useCallback(
    (key: keyof DashboardPreferences, explicitValue?: boolean) => {
      const current = readPrefsFromStorage(user?.id);
      const nextVal = explicitValue !== undefined ? explicitValue : !current[key];
      const next: DashboardPreferences = {
        ...current,
        [key]: nextVal,
      };
      writePrefsToStorage(user?.id, next);
      setPreferences(next);

      const meta = DASHBOARD_WIDGET_LIST.find((w) => w.key === key);
      if (meta) {
        toast.success(`${meta.label} ${nextVal ? "shown on dashboard" : "hidden for cleaner UI"}`);
      }
    },
    [user?.id]
  );

  const applyPreset = useCallback(
    (preset: "full" | "minimal") => {
      const next: DashboardPreferences =
        preset === "full"
          ? { ...DEFAULT_DASHBOARD_PREFERENCES }
          : {
              showHeatmap: false,
              showGlobalRankings: false,
              showDailyCheckIn: true,
              showPerformanceCharts: true,
              showPracticeTarget: true,
              showCourseMastery: false,
            };
      writePrefsToStorage(user?.id, next);
      setPreferences(next);
      toast.success(
        preset === "full"
          ? "All dashboard widgets enabled"
          : "Minimal Focus UI preset applied"
      );
    },
    [user?.id]
  );

  const visibleCount = Object.values(preferences).filter(Boolean).length;
  const totalCount = Object.keys(DEFAULT_DASHBOARD_PREFERENCES).length;

  return {
    preferences,
    toggleWidget,
    applyPreset,
    visibleCount,
    totalCount,
  };
}
