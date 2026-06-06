/**
 * Prefetch likely-next routes during browser idle time to make
 * navigations feel instant on mobile. Safe no-op on SSR.
 */
const seen = new Set<string>();

type Loader = () => Promise<unknown>;

function idle(cb: () => void) {
  const w = window as any;
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(cb, { timeout: 2000 });
  else setTimeout(cb, 800);
}

export function prefetchRoutes(loaders: Record<string, Loader>) {
  if (typeof window === "undefined") return;
  idle(() => {
    for (const [key, loader] of Object.entries(loaders)) {
      if (seen.has(key)) continue;
      seen.add(key);
      loader().catch(() => seen.delete(key));
    }
  });
}

/** Common destinations after the dashboard. */
export function prefetchDashboardNeighbors() {
  prefetchRoutes({
    courses: () => import("@/pages/courses/CourseDirectory"),
    library: () => import("@/pages/student/Library"),
    review:  () => import("@/pages/student/Review"),
    leaderboard: () => import("@/pages/LeaderboardPage"),
  });
}

/**
 * Warm the student dashboard chunk + its heaviest child sections
 * so the first paint after login is essentially free.
 * Safe to call multiple times — de-duped by `seen`.
 */
export function prefetchStudentDashboard() {
  prefetchRoutes({
    studentDashboard: () => import("@/pages/student/StudentDashboard"),
    topHeader:        () => import("@/components/student/dashboard/TopHeader"),
    todayCard:        () => import("@/components/student/dashboard/TodayCard"),
    heroQuest:        () => import("@/components/student/dashboard/HeroQuestCard"),
  });
}