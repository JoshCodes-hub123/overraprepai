import { useNavigate } from "react-router-dom";
import {
  User, Bell, Shield, Smartphone, CreditCard, Wallet, Gift,
  Palette, Globe, Download, LogOut, ChevronRight, HelpCircle,
  FileText, Lock, Sparkles, Trash2, Zap, GraduationCap,
} from "lucide-react";
import AppScreen from "@/components/app-shell/AppScreen";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/seo/SEO";
import { Switch } from "@/components/ui/switch";
import { useLiteMode } from "@/lib/liteMode";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DashboardPreferencesPanel } from "@/components/student/dashboard/DashboardPreferencesMenu";

type Row = { icon: any; label: string; hint?: string; to?: string; onClick?: () => void; danger?: boolean };
type Group = { title: string; rows: Row[] };

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [lite, setLite] = useLiteMode();

  const handleSignOut = async () => {
    await signOut?.();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  };

  const handleDelete = () => {
    toast.message("To delete your account, contact support@overraprepai.com");
  };

  const groups: Group[] = [
    {
      title: "Account",
      rows: [
        { icon: User, label: "Profile & Account", hint: "Identity, theme & dashboard preferences", to: "/settings/profile" },
        { icon: User, label: "Edit Public Bio", hint: "Photo, bio & socials", to: "/profile/edit" },
        { icon: GraduationCap, label: "Academic settings", hint: "University campus & department", to: "/settings/academic" },
        { icon: Sparkles, label: "Study preferences", hint: "Goals & schedule", to: "/profile/preparation" },
        { icon: Wallet, label: "Wallet & tokens", hint: "Top up and history", to: "/wallet" },
        { icon: CreditCard, label: "Subscription", hint: "Plan & billing", to: "/subscription" },
        { icon: Gift, label: "Refer & earn", hint: "Invite friends", to: "/referrals" },
      ],
    },
    {
      title: "Preferences",
      rows: [
        { icon: Bell, label: "Notifications", hint: "Email, push & in-app", to: "/settings/notifications" },
        { icon: Shield, label: "Privacy", hint: "Who can see what", to: "/settings/privacy" },
        { icon: Smartphone, label: "Devices & sessions", hint: "Active sign-ins", to: "/settings/devices" },
        { icon: Download, label: "Install the app", hint: "Add to home screen", to: "/install" },
      ],
    },
    {
      title: "About",
      rows: [
        { icon: HelpCircle, label: "Help & support", to: "/help" },
        { icon: FileText, label: "Terms of service", to: "/legal/terms" },
        { icon: Lock, label: "Privacy policy", to: "/legal/privacy" },
      ],
    },
    {
      title: "Danger zone",
      rows: [
        { icon: LogOut, label: "Sign out", onClick: handleSignOut },
        { icon: Trash2, label: "Delete account", onClick: handleDelete, danger: true },
      ],
    },
  ];

  return (
    <AppScreen title="Settings" subtitle={user?.email ?? ""} back>
      <SEO title="Settings — OverraPrep AI" description="Manage your account, preferences and privacy." />
      <div className="max-w-2xl mx-auto pb-28 space-y-6">
        {/* Appearance & Theme Toggle */}
        <section>
          <h2 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-primary/80 mb-2">
            Appearance
          </h2>
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                <Palette className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold leading-tight text-foreground">Theme Mode</span>
                <span className="block text-[12px] text-muted-foreground mt-0.5">
                  Select clean Light, deep navy Dark, or match your device System
                </span>
              </div>
            </div>
            <ThemeToggle variant="segmented" className="w-full" />
          </div>
        </section>

        {/* Dashboard Preferences Widget Toggles */}
        <section>
          <h2 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-primary/80 mb-2">
            Dashboard Preferences
          </h2>
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
            <div>
              <span className="block text-[14.5px] font-semibold leading-tight text-foreground">
                Widget Visibility
              </span>
              <span className="block text-[12px] text-muted-foreground mt-0.5">
                Show or hide Global Rankings, Study Activity Heatmap, and other dashboard widgets
              </span>
            </div>
            <DashboardPreferencesPanel compact />
          </div>
        </section>

        {/* Data saver / Lite mode — placed up top for low-network students */}
        <section>
          <h2 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-primary/80 mb-2">
            Network
          </h2>
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="w-full flex items-center gap-3 px-4 py-3.5">
              <span className="h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                <Zap className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14.5px] font-semibold leading-tight text-foreground">Data saver (Lite mode)</span>
                <span className="block text-[12px] text-muted-foreground mt-0.5">
                  Skip splash video & heavy effects. Best on 2G/3G.
                </span>
              </span>
              <Switch
                checked={lite}
                onCheckedChange={(v) => {
                  setLite(v);
                  toast.success(v ? "Lite mode on — saving your data" : "Lite mode off");
                }}
              />
            </div>
          </div>
        </section>

        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-primary/80 mb-2">
              {g.title}
            </h2>
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              {g.rows.map((r, i) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.label}
                    onClick={() => (r.onClick ? r.onClick() : r.to && navigate(r.to))}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
                      "hover:bg-muted/50 active:bg-muted",
                      i !== g.rows.length - 1 && "border-b border-border/50",
                      r.danger ? "text-red-500" : "text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0",
                        r.danger ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14.5px] font-semibold leading-tight">{r.label}</span>
                      {r.hint && (
                        <span className="block text-[12px] text-muted-foreground mt-0.5 truncate">
                          {r.hint}
                        </span>
                      )}
                    </span>
                    {!r.onClick && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <p className="text-center text-[11px] text-neutral-400 pt-2">
          OverraPrep AI · v2 · Made with care in Nigeria
        </p>
      </div>
    </AppScreen>
  );
};

export default Settings;
