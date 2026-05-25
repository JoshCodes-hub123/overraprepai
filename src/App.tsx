import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AnimatedRoutes from "@/components/layout/AnimatedRoutes";
import BiometricUnlock from "@/components/native/BiometricUnlock";
import OfflineBanner from "@/components/native/OfflineBanner";
import BottomTabBar from "@/components/app-shell/BottomTabBar";
import NewStudyPackFAB from "@/components/student/NewStudyPackFAB";
import MiniPlayerBar from "@/components/audio/MiniPlayerBar";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import EmailVerificationBanner from "@/components/auth/EmailVerificationBanner";
import RoleBadge from "@/components/auth/RoleBadge";
import { NetworkStatus } from "@/components/system/NetworkStatus";
import ScrollToTop from "@/components/system/ScrollToTop";
import PageViewTracker from "@/components/system/PageViewTracker";
import UpdatePrompt from "@/components/system/UpdatePrompt";
import { initPushNotifications } from "@/lib/native/push";
import { Capacitor } from "@capacitor/core";
import { useRecordDeviceLogin } from "@/hooks/useDeviceHistory";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1,
      gcTime: 1000 * 60 * 10,
    },
  },
});

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
              <BiometricUnlock>
                <PaymentTestModeBanner />
                <EmailVerificationBanner />
                <div className="pb-16 md:pb-0">
                  <AnimatedRoutes />
                </div>
                <BottomTabBar />
                <NewStudyPackFAB />
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
