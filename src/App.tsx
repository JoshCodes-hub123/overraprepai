import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import InstallNudge from "@/components/system/InstallNudge";
import GlobalPaywall from "@/components/system/GlobalPaywall";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AnimatedRoutes from "@/components/layout/AnimatedRoutes";
import BiometricUnlock from "@/components/native/BiometricUnlock";
import OfflineBanner from "@/components/native/OfflineBanner";
import BottomTabBar from "@/components/app-shell/BottomTabBar";
import NewStudyPackFAB from "@/components/student/NewStudyPackFAB";
import StudentMenuFab from "@/components/student/StudentMenuFab";
import MiniPlayerBar from "@/components/audio/MiniPlayerBar";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import EmailVerificationBanner from "@/components/auth/EmailVerificationBanner";
import RoleBadge from "@/components/auth/RoleBadge";

import { NetworkStatus } from "@/components/system/NetworkStatus";
import ScrollToTop from "@/components/system/ScrollToTop";
import PageViewTracker from "@/components/system/PageViewTracker";
import UpdatePrompt from "@/components/system/UpdatePrompt";
import ReportProblemFab from "@/components/system/ReportProblemFab";
import { initPushNotifications } from "@/lib/native/push";
import { Capacitor } from "@capacitor/core";
import { useRecordDeviceLogin } from "@/hooks/useDeviceHistory";
import { prefetchStudentDashboard } from "@/lib/routePrefetch";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1,
      // Keep cache warm for 24h so returning users see the dashboard
      // instantly while fresh data hydrates in the background.
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Persist the React Query cache to localStorage. On a return visit the
// dashboard paints from cache in <1s while live data revalidates.
try {
  // Lazy import to avoid blocking first paint.
  void import("@tanstack/react-query-persist-client").then(({ persistQueryClient }) => {
    void import("@tanstack/query-sync-storage-persister").then(({ createSyncStoragePersister }) => {
      const persister = createSyncStoragePersister({
        storage: window.localStorage,
        key: "overra-rq-cache-v1",
        throttleTime: 1500,
      });
      persistQueryClient({
        queryClient: queryClient as any,
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24h
        buster: "v1",
      });
    });
  });
} catch { /* noop */ }

// Auto-register push when a user signs in (native only).
function PushBootstrap() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id && Capacitor.isNativePlatform()) {
      initPushNotifications(user.id);
    }
  }, [user?.id]);
  return null;
}

// Phase 8: log device on every authenticated load so users can audit history.
function DeviceTracker() {
  const { user } = useAuth();
  useRecordDeviceLogin(user?.id);
  return null;
}

// Warm the student dashboard chunk during browser idle on every app load,
// so the very first navigation after sign-in paints instantly.
function DashboardWarmup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => { prefetchStudentDashboard(); }, []);

  // The moment a user is authenticated, prime the dashboard's first data
  // queries into the React Query cache so the page paints with real
  // content instead of section skeletons on first load.
  useEffect(() => {
    if (!user?.id) return;
    const idle = (cb: () => void) => {
      const w = window as any;
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(cb, { timeout: 1500 });
      else setTimeout(cb, 0);
    };
    idle(() => {
      // Recently opened courses (Continue Learning section)
      qc.prefetchQuery({
        queryKey: ["recent-courses", user.id, 8],
        queryFn: async () => {
          const { data } = await (supabase as any)
            .from("recently_opened_courses")
            .select("course_id, opened_at, courses(id, code, name, department, level)")
            .order("opened_at", { ascending: false })
            .limit(8);
          return data ?? [];
        },
      }).catch(() => { /* noop */ });
    });
  }, [user?.id, qc]);

  return null;
}

// Persist the last meaningful in-app route for signed-in users so the next
// login can resume exactly where they left off.
const RESUME_SKIP_PREFIXES = ["/auth", "/install", "/r/", "/quiz/", "/reset-password", "/forgot-password"];
function LastRouteTracker() {
  const { user } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (!user?.id) return;
    const path = location.pathname + location.search;
    if (path === "/" || RESUME_SKIP_PREFIXES.some((p) => path.startsWith(p))) return;
    try { localStorage.setItem(`overra_last_route:${user.id}`, path); } catch { /* noop */ }
  }, [user?.id, location.pathname, location.search]);
  return null;
}

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <OfflineBanner />
          <NetworkStatus />
            <UpdatePrompt />
          <BrowserRouter>
            <ScrollToTop />
            <PageViewTracker />
            <AuthProvider>
              <PushBootstrap />
              <DeviceTracker />
              <DashboardWarmup />
              <LastRouteTracker />
              <BiometricUnlock>
                <PaymentTestModeBanner />
                <EmailVerificationBanner />
                <InstallNudge />
                <GlobalPaywall />
                
                <main id="main-content" className="pb-16 md:pb-0">
                  <AnimatedRoutes />
                </main>
                <BottomTabBar />
                <StudentMenuFab />
                <NewStudyPackFAB />
                <ReportProblemFab />
                <MiniPlayerBar />
                <RoleBadge />
              </BiometricUnlock>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
