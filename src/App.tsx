import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import InstallNudge from "@/components/system/InstallNudge";
import GlobalPaywall from "@/components/system/GlobalPaywall";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AnimatedRoutes from "@/components/layout/AnimatedRoutes";
import BiometricUnlock from "@/components/native/BiometricUnlock";
import OfflineBanner from "@/components/native/OfflineBanner";
import BottomTabBar from "@/components/app-shell/BottomTabBar";
import ConsistentBackButton from "@/components/navigation/ConsistentBackButton";
import MiniPlayerBar from "@/components/audio/MiniPlayerBar";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import EmailVerificationBanner from "@/components/auth/EmailVerificationBanner";
import RoleBadge from "@/components/auth/RoleBadge";

import { NetworkStatus } from "@/components/system/NetworkStatus";
import LiteModeApplier from "@/components/system/LiteModeApplier";
import OfflineAttemptSyncBanner from "@/components/offline/OfflineAttemptSyncBanner";
import ScrollToTop from "@/components/system/ScrollToTop";
import PageViewTracker from "@/components/system/PageViewTracker";
import UpdatePrompt from "@/components/system/UpdatePrompt";
import EnvironmentThemeApplier from "@/components/system/EnvironmentThemeApplier";

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

const ACADEMIC_QUERY_KEY_ROOT = /(?:^|[-_])(course|courses|topic|topics|question|questions|quiz|quizzes|subject|subjects|jamb|curriculum|curricula|material|materials|study|learning|learn|exam|exams|readiness|flashcard|flashcards|mock|weak-area|intel|arena|theory|srs|quick-jump)(?:[-_]|$)/i;

function AccountQueryCacheBoundary({ children }: { children: ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const client = useQueryClient();
  const currentProfile = user && profile?.id === user.id ? profile as any : null;
  const scopePartition = currentProfile
    ? JSON.stringify([
        currentProfile.environment_type ?? "unresolved",
        currentProfile.academic_path ?? "unresolved",
        currentProfile.university ?? "unresolved",
      ])
    : null;
  const identity = isLoading || (user && !scopePartition)
    ? null
    : user
    ? `${user.id}:${encodeURIComponent(scopePartition!)}`
    : "anonymous";
  const sessionIdentity = isLoading ? null : user?.id ?? "anonymous";
  const [readyIdentity, setReadyIdentity] = useState<string | null>(null);
  const activeSession = useRef<string | null>(null);
  const activeScope = useRef<string | null>(null);
  const pendingRestore = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const handlePurge = () => {
      client.clear();
    };
    window.addEventListener("overra:session_purged", handlePurge);
    return () => window.removeEventListener("overra:session_purged", handlePurge);
  }, [client]);

  useEffect(() => {
    if (!sessionIdentity) return;

    let cancelled = false;
    let stopPersistence = () => {};

    void (async () => {
      await pendingRestore.current.catch(() => {});
      if (cancelled) return;

      if (activeSession.current !== sessionIdentity) {
        client.clear();
      } else if (activeScope.current !== scopePartition) {
        client.removeQueries({
          predicate: (query) => {
            const root = query.queryKey[0];
            return typeof root === "string" && ACADEMIC_QUERY_KEY_ROOT.test(root);
          },
        });
      }
      activeSession.current = sessionIdentity;
      activeScope.current = scopePartition;

      if (!identity) {
        setReadyIdentity(null);
        return;
      }
      if (identity === "anonymous") {
        setReadyIdentity(identity);
        return;
      }

      try {
        const [{ persistQueryClient }, { createSyncStoragePersister }] = await Promise.all([
          import("@tanstack/react-query-persist-client"),
          import("@tanstack/query-sync-storage-persister"),
        ]);
        if (cancelled) return;

        const persister = createSyncStoragePersister({
          storage: window.localStorage,
          key: `overra-rq-cache-v3:${identity}`,
          throttleTime: 1500,
        });
        const [unsubscribe, restored] = persistQueryClient({
          queryClient: client,
          persister,
          maxAge: 1000 * 60 * 60 * 24,
          buster: "v3",
        });
        stopPersistence = unsubscribe;
        const restoreTask = Promise.resolve(restored).then(() => undefined).catch(() => undefined);
        pendingRestore.current = restoreTask;
        await restoreTask;
      } catch {
        // Cache persistence is optional; the live query path remains available.
      }

      if (!cancelled) setReadyIdentity(identity);
    })();

    return () => {
      cancelled = true;
      stopPersistence();
    };
  }, [client, identity, scopePartition, sessionIdentity]);

  if (!identity || readyIdentity !== identity) return null;
  return children;
}

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
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <InstallPrompt />
            <OfflineBanner />
            <NetworkStatus />
            <LiteModeApplier />
            <UpdatePrompt />
            <BrowserRouter>
              <ScrollToTop />
              <PageViewTracker />
              <AuthProvider>
                <AccountQueryCacheBoundary>
                  <PushBootstrap />
                  <EnvironmentThemeApplier />

                  <OfflineAttemptSyncBanner />
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
                    <ConsistentBackButton />
                    <BottomTabBar />
                    <ReportProblemFab />
                    <MiniPlayerBar />
                    <RoleBadge />
                  </BiometricUnlock>
                </AccountQueryCacheBoundary>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
