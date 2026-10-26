import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Mail,
  Shield,
  KeyRound,
  GraduationCap,
  Sparkles,
  Palette,
  Smartphone,
  LogOut,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  Zap,
} from "lucide-react";
import AppScreen from "@/components/app-shell/AppScreen";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLiteMode } from "@/lib/liteMode";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/lib/avatar";
import { DashboardPreferencesPanel } from "@/components/student/dashboard/DashboardPreferencesMenu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const [lite, setLite] = useLiteMode();

  // Account form fields
  const [fullName, setFullName] = useState<string>("");
  const [matricNo, setMatricNo] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);

  // Sync profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setMatricNo((profile as any).matric_no || "");
      setPhone((profile as any).phone || "");
    }
  }, [profile]);

  const initials = (fullName || user?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSaveAccount = async () => {
    if (!user) return;
    try {
      setIsSaving(true);
      const updates = {
        full_name: fullName.trim(),
        matric_no: matricNo.trim(),
        phone: phone.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Account profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      setIsResettingPassword(true);
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset link sent to ${user.email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut?.();
      toast.success("Signed out successfully");
      navigate("/auth", { replace: true });
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <AppScreen title="Profile & Account" subtitle="Manage your identity, theme, and security" back>
      <SEO
        title="Profile & Account Settings — OverraPrep AI"
        description="Manage your account profile, campus credentials, security and display theme."
      />

      <div className="max-w-2xl mx-auto pb-28 space-y-6">
        {/* =========================================================
            1. USER IDENTITY CARD
           ========================================================= */}
        <section className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="relative group">
              <Avatar className="w-20 h-20 ring-4 ring-primary/20 shadow-sm">
                <AvatarImage src={resolveAvatarUrl(profile) || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Link
                to="/profile/edit"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-slate-950 shadow-md hover:scale-105 transition-transform"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="font-display text-lg font-bold text-foreground">
                  {profile?.full_name || "OverraPrep Student"}
                </h2>
                <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/40 text-primary">
                  {(profile as any)?.role || "Student"}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.email}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  {(profile as any)?.department || "University Department"}
                </span>
                {(profile as any)?.level && (
                  <span className="font-medium text-foreground">
                    Level {(profile as any).level}00
                  </span>
                )}
              </div>
            </div>

            <Button variant="outline" size="sm" asChild className="shrink-0 text-xs">
              <Link to="/profile/edit">Full Bio & Avatar</Link>
            </Button>
          </div>
        </section>

        {/* =========================================================
            2. THEME & APPEARANCE (Integrated with ThemeToggle)
           ========================================================= */}
        <section className="space-y-2">
          <h3 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-primary/80">
            Appearance & Display
          </h3>
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-2xl inline-flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                  <Palette className="w-5 h-5" strokeWidth={1.8} />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Theme Mode</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose between Light mode, Dark mode, or match your device System
                  </p>
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-xs font-semibold px-2 py-0.5 capitalize border-border"
              >
                Active: {resolvedTheme}
              </Badge>
            </div>

            {/* Seamless 3-Way Segmented Control */}
            <div className="pt-1">
              <ThemeToggle variant="segmented" className="w-full" />
            </div>

            {/* Theme Visual Cards */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all",
                  theme === "light"
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                    : "border-border/60 bg-muted/30 opacity-75"
                )}
              >
                <div className="w-full h-8 rounded-lg bg-white border border-neutral-200 mb-2 flex items-center justify-center shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </div>
                <span className="block text-[11px] font-bold">Light</span>
                <span className="block text-[9px] text-muted-foreground">Clean daytime</span>
              </div>

              <div
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all",
                  theme === "dark"
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                    : "border-border/60 bg-muted/30 opacity-75"
                )}
              >
                <div className="w-full h-8 rounded-lg bg-neutral-900 border border-neutral-700 mb-2 flex items-center justify-center shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                </div>
                <span className="block text-[11px] font-bold">Dark</span>
                <span className="block text-[9px] text-muted-foreground">Midnight study</span>
              </div>

              <div
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all",
                  theme === "system"
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                    : "border-border/60 bg-muted/30 opacity-75"
                )}
              >
                <div className="w-full h-8 rounded-lg bg-gradient-to-r from-white via-neutral-400 to-neutral-900 border border-border mb-2 flex items-center justify-center shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                </div>
                <span className="block text-[11px] font-bold">System</span>
                <span className="block text-[9px] text-muted-foreground">Auto device sync</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            2B. DASHBOARD PREFERENCES MENU (WIDGET VISIBILITY TOGGLES)
           ========================================================= */}
        <section id="dashboard-preferences" className="space-y-2">
          <h3 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-primary/80">
            Dashboard Preferences
          </h3>
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Widget Visibility</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle specific dashboard and analytics widgets such as Global Rankings or the
                Study Activity Heatmap for a cleaner UI
              </p>
            </div>
            <DashboardPreferencesPanel />
          </div>
        </section>

        {/* =========================================================
            3. ACCOUNT MANAGEMENT FORM
           ========================================================= */}
        <section className="space-y-2">
          <h3 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-primary/80">
            Account Management
          </h3>
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full-name" className="text-xs font-semibold text-foreground">
                Full Legal Name
              </Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Samuel Adebayo"
                className="bg-background/80"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="matric-no" className="text-xs font-semibold text-foreground">
                  Matriculation / Student ID
                </Label>
                <Input
                  id="matric-no"
                  value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value)}
                  placeholder="e.g. CSC/2021/0458"
                  className="bg-background/80 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone-num" className="text-xs font-semibold text-foreground">
                  Phone Number
                </Label>
                <Input
                  id="phone-num"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234..."
                  className="bg-background/80"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Email Address</Label>
              <div className="relative">
                <Input value={user?.email || ""} disabled className="bg-muted/50 pr-10 text-muted-foreground text-xs" />
                <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Email address is linked to your university authentication credentials.
              </p>
            </div>

            {/* Academic Shortcut Card */}
            <Link
              to="/settings/academic"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-border/80 bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl inline-flex items-center justify-center bg-primary/10 text-primary">
                  <GraduationCap className="w-4 h-4" />
                </span>
                <div>
                  <span className="block text-xs font-bold text-foreground">Campus & Academic Path</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {(profile as any)?.university || "Federal University"} · {(profile as any)?.department || "Set department"}
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-primary">Edit →</span>
            </Link>

            <Button
              onClick={handleSaveAccount}
              disabled={isSaving}
              className="w-full gap-2 rounded-xl shadow-xs font-semibold"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Account Changes
            </Button>
          </div>
        </section>

        {/* =========================================================
            4. SECURITY & SESSIONS
           ========================================================= */}
        <section className="space-y-2">
          <h3 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-primary/80">
            Security & Credentials
          </h3>
          <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl inline-flex items-center justify-center bg-primary/10 text-primary">
                  <KeyRound className="w-4 h-4" />
                </span>
                <div>
                  <span className="block text-xs font-bold text-foreground">Password Reset</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Send a secure reset link to your email address
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasswordReset}
                disabled={isResettingPassword}
                className="text-xs shrink-0"
              >
                {isResettingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send Link"}
              </Button>
            </div>

            <div className="border-t border-border/50 pt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl inline-flex items-center justify-center bg-primary/10 text-primary">
                  <Smartphone className="w-4 h-4" />
                </span>
                <div>
                  <span className="block text-xs font-bold text-foreground">Active Devices & Sessions</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Review which mobile and desktop devices are logged in
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs shrink-0">
                <Link to="/settings/devices">Manage</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* =========================================================
            5. NETWORK & DATA SAVER
           ========================================================= */}
        <section className="space-y-2">
          <h3 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-primary/80">
            Network Optimization
          </h3>
          <div className="rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-xl inline-flex items-center justify-center bg-primary/10 text-primary">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <span className="block text-xs font-bold text-foreground">Data Saver (Lite Mode)</span>
                <span className="block text-[11px] text-muted-foreground">
                  Reduces background effects to save data on 2G/3G campus WiFi
                </span>
              </div>
            </div>
            <Switch
              checked={lite}
              onCheckedChange={(v) => {
                setLite(v);
                toast.success(v ? "Lite mode enabled" : "Lite mode disabled");
              }}
            />
          </div>
        </section>

        {/* =========================================================
            6. DANGER ZONE & SIGN OUT
           ========================================================= */}
        <section className="space-y-2">
          <h3 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-rose-500/80">
            Session & Account Actions
          </h3>
          <div className="rounded-3xl border border-rose-200/50 dark:border-rose-950/60 bg-card p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-foreground">Sign Out of OverraPrep</span>
                <span className="block text-[11px] text-muted-foreground">
                  Safely log out from this browser session
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 text-xs font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppScreen>
  );
};

export default ProfileSettings;
