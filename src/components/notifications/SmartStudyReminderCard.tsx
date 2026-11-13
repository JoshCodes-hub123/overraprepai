import React, { useEffect, useState, useMemo } from "react";
import {
  Bell,
  BellRing,
  Clock,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  Send,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import {
  loadSmartReminderConfig,
  saveSmartReminderConfig,
  analyzeStudentHistoricalStudyTime,
  getEffectiveReminderSchedule,
  getNativeNotificationPermission,
  requestNativeNotificationPermission,
  sendSmartStudyPushNotification,
  formatTime12h,
  type SmartStudyReminderConfig,
} from "@/lib/smartStudyReminders";

interface SmartStudyReminderCardProps {
  courseCode?: string;
  compact?: boolean;
}

const PRESET_TIMES = [
  { label: "Morning", time24: "06:30" },
  { label: "Afternoon", time24: "16:00" },
  { label: "Evening", time24: "20:00" },
  { label: "Night Owl", time24: "22:00" },
];

export const SmartStudyReminderCard: React.FC<SmartStudyReminderCardProps> = ({
  courseCode,
  compact = false,
}) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<SmartStudyReminderConfig>(() =>
    loadSmartReminderConfig(user?.id)
  );
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    getNativeNotificationPermission()
  );
  const [showCustomize, setShowCustomize] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setConfig(loadSmartReminderConfig(user.id));
    analyzeStudentHistoricalStudyTime(user.id).then((updated) => {
      setConfig(updated);
    });

    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<SmartStudyReminderConfig>).detail;
      if (detail) setConfig(detail);
    };
    window.addEventListener("overra:smart-reminder-updated", onUpdated);
    return () => window.removeEventListener("overra:smart-reminder-updated", onUpdated);
  }, [user?.id]);

  const schedule = useMemo(() => getEffectiveReminderSchedule(config), [config]);

  const handleToggleEnabled = async (checked: boolean) => {
    if (checked && permission !== "granted" && permission !== "unsupported") {
      const nextPerm = await requestNativeNotificationPermission();
      setPermission(nextPerm);
      if (nextPerm === "denied") {
        toast.error(
          "Browser notifications are blocked. Allow notifications in your browser site settings to receive push alerts."
        );
      } else if (nextPerm === "granted") {
        toast.success("Native push notifications enabled! You'll be notified 15 mins before study time.");
      }
    }
    const updated = saveSmartReminderConfig(user?.id, { enabled: checked });
    setConfig(updated);
    if (!checked) {
      toast.info("Smart Study Reminders paused.");
    }
  };

  const handleSwitchMode = (mode: "auto" | "custom") => {
    const updated = saveSmartReminderConfig(user?.id, { mode });
    setConfig(updated);
    toast.success(
      mode === "auto"
        ? `Synced to your peak study hour (${formatTime12h(updated.detectedStudyTime)})`
        : `Using custom study time (${formatTime12h(updated.customStudyTime)})`
    );
  };

  const handleCustomTimeChange = (newTime24: string) => {
    if (!newTime24) return;
    const updated = saveSmartReminderConfig(user?.id, {
      mode: "custom",
      customStudyTime: newTime24,
      enabled: true,
    });
    setConfig(updated);
  };

  const handleSendTestPush = async () => {
    setSendingTest(true);
    try {
      const nextPerm = await requestNativeNotificationPermission();
      setPermission(nextPerm);
      const delivered = await sendSmartStudyPushNotification({
        userId: user?.id,
        studyTime12: schedule.studyTime12,
        courseCode,
        isTest: true,
      });
      if (delivered) {
        toast.success(
          `Test push sent! Scheduled daily for ${schedule.reminderTime12} (15m before ${schedule.studyTime12}).`
        );
      } else {
        toast.success(
          `Reminder scheduled for ${schedule.reminderTime12} (15m before ${schedule.studyTime12}). Enable browser notifications for lock-screen push.`
        );
      }
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <section
      aria-label="Smart Study Reminders"
      className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3.5"
    >
      {/* Top Row: Title + Native Push Status + Master Switch */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              config.enabled
                ? "bg-amber-500/15 border-[#D4AF37]/40 text-[#996515] dark:text-amber-400"
                : "bg-muted border-border text-muted-foreground"
            }`}
          >
            {config.enabled ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground tracking-tight">
                Smart Study Reminder
              </h3>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FAF0D6] dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold text-[#996515] dark:text-amber-400">
                <Sparkles className="w-2.5 h-2.5" />
                {config.mode === "auto" ? "AI Peak-Hour Sync" : "Custom Schedule"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">
              Notifies you{" "}
              <strong className="font-semibold text-foreground">15 minutes before</strong> your{" "}
              <span className="font-mono font-bold text-foreground tabular-nums">
                {schedule.studyTime12}
              </span>{" "}
              study window (push at{" "}
              <span className="font-mono font-bold text-[#B8860B] dark:text-amber-400 tabular-nums">
                {schedule.reminderTime12}
              </span>
              ).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={config.enabled}
            onCheckedChange={handleToggleEnabled}
            aria-label="Toggle Smart Study Reminder"
          />
        </div>
      </div>

      {/* Permission Prompt Bar if permission not yet granted */}
      {config.enabled && permission === "default" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/60 bg-amber-50/70 dark:bg-amber-950/25 px-3 py-2 text-xs">
          <span className="text-amber-950 dark:text-amber-200 font-medium">
            Allow browser push alerts to receive the 15-minute heads-up on your lock screen.
          </span>
          <button
            type="button"
            onClick={async () => {
              const p = await requestNativeNotificationPermission();
              setPermission(p);
              if (p === "granted") {
                toast.success("Native push notifications enabled!");
              }
            }}
            className="px-3 py-1 rounded-lg bg-[#D4AF37] text-neutral-950 font-bold text-xs hover:brightness-105 transition cursor-pointer shrink-0"
          >
            Allow Push Alerts
          </button>
        </div>
      )}

      {config.enabled && permission === "denied" && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 dark:bg-rose-950/20 px-3 py-2 text-xs text-rose-800 dark:text-rose-300">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>
            Browser notifications are blocked for this site. In-app reminders will still appear in your Notification Center.
          </span>
        </div>
      )}

      {/* Action Footer: Auto-Detected Summary + Customize Toggle + Test Push */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60 text-xs">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>
              Alert: <strong className="text-foreground">{schedule.reminderTime12}</strong>
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="hidden sm:inline">
            {config.analyzedSessionsCount > 0
              ? `Learned from ${config.analyzedSessionsCount} active study sessions`
              : `Defaulting to ${formatTime12h(config.detectedStudyTime)} peak slot`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSendTestPush}
            disabled={sendingTest}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/60 text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            <Send className="w-3 h-3 text-[#B8860B]" />
            <span>{sendingTest ? "Sending…" : "Test Push"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCustomize((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/60 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{showCustomize ? "Hide Schedule" : "Adjust Time"}</span>
          </button>
        </div>
      </div>

      {/* Expandable Schedule & Override Drawer */}
      {(showCustomize || !compact) && showCustomize && (
        <div className="pt-3 border-t border-border/60 space-y-3 animate-in fade-in duration-150">
          {/* Mode Selector: Auto-Detect vs Custom Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSwitchMode("auto")}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                config.mode === "auto"
                  ? "border-[#D4AF37] bg-amber-500/10"
                  : "border-border bg-background hover:bg-muted/40"
              }`}
            >
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
                  Auto-Detect Peak Hour
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Typical active time:{" "}
                  <strong className="font-mono text-foreground">
                    {formatTime12h(config.detectedStudyTime)}
                  </strong>
                </p>
              </div>
              {config.mode === "auto" && (
                <CheckCircle2 className="w-4 h-4 text-[#B8860B] shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode("custom")}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                config.mode === "custom"
                  ? "border-[#D4AF37] bg-amber-500/10"
                  : "border-border bg-background hover:bg-muted/40"
              }`}
            >
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
                  Custom Study Time Override
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pick your own daily study start time
                </p>
              </div>
              {config.mode === "custom" && (
                <CheckCircle2 className="w-4 h-4 text-[#B8860B] shrink-0" />
              )}
            </button>
          </div>

          {/* Custom Time Picker + Quick Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET_TIMES.map((preset) => {
                const isSelected =
                  config.mode === "custom" && config.customStudyTime === preset.time24;
                return (
                  <button
                    key={preset.time24}
                    type="button"
                    onClick={() => handleCustomTimeChange(preset.time24)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-[#D4AF37]"
                    }`}
                  >
                    {preset.label} ({formatTime12h(preset.time24)})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="custom-study-time-input"
                className="text-xs font-semibold text-muted-foreground whitespace-nowrap"
              >
                Exact time:
              </label>
              <input
                id="custom-study-time-input"
                type="time"
                value={config.customStudyTime}
                onChange={(e) => handleCustomTimeChange(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SmartStudyReminderCard;
