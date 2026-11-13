import { supabase } from "@/integrations/supabase/client";

export type ReminderMode = "auto" | "custom";

export interface SmartStudyReminderConfig {
  enabled: boolean;
  mode: ReminderMode;
  /** Target study start time in 24h "HH:MM" format (e.g. "20:00"). Reminder fires 15m before. */
  customStudyTime: string;
  /** Automatically learned typical study time in 24h "HH:MM" format */
  detectedStudyTime: string;
  /** Number of historical sessions analyzed */
  analyzedSessionsCount: number;
  /** 24-hour activity histogram (index 0..23 -> session count) */
  hourlyHistogram: number[];
  /** Last date ("YYYY-MM-DD") the 15-min reminder was fired */
  lastFiredDate: string | null;
  /** Lead time in minutes (always 15 per product spec) */
  leadMinutes: number;
}

const CONFIG_STORAGE_KEY_PREFIX = "overra_smart_reminder_cfg_v1:";
const ACTIVITY_LOG_KEY_PREFIX = "overra_active_study_timestamps_v1:";

const DEFAULT_STUDY_TIME = "20:00"; // 8:00 PM typical evening study slot

function getStorageKey(userId?: string | null): string {
  return `${CONFIG_STORAGE_KEY_PREFIX}${userId || "guest"}`;
}

function getActivityKey(userId?: string | null): string {
  return `${ACTIVITY_LOG_KEY_PREFIX}${userId || "guest"}`;
}

export function getDefaultReminderConfig(): SmartStudyReminderConfig {
  const defaultHistogram = Array(24).fill(0);
  defaultHistogram[20] = 2; // sensible evening baseline
  return {
    enabled: true,
    mode: "auto",
    customStudyTime: DEFAULT_STUDY_TIME,
    detectedStudyTime: DEFAULT_STUDY_TIME,
    analyzedSessionsCount: 0,
    hourlyHistogram: defaultHistogram,
    lastFiredDate: null,
    leadMinutes: 15,
  };
}

export function loadSmartReminderConfig(userId?: string | null): SmartStudyReminderConfig {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return getDefaultReminderConfig();
    const parsed = JSON.parse(raw);
    const base = getDefaultReminderConfig();
    return {
      ...base,
      ...parsed,
      hourlyHistogram:
        Array.isArray(parsed.hourlyHistogram) && parsed.hourlyHistogram.length === 24
          ? parsed.hourlyHistogram
          : base.hourlyHistogram,
      leadMinutes: 15,
    };
  } catch {
    return getDefaultReminderConfig();
  }
}

export function saveSmartReminderConfig(
  userId: string | null | undefined,
  patch: Partial<SmartStudyReminderConfig>
): SmartStudyReminderConfig {
  const current = loadSmartReminderConfig(userId);
  const next: SmartStudyReminderConfig = {
    ...current,
    ...patch,
    leadMinutes: 15,
  };
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("overra:smart-reminder-updated", { detail: next }));
  } catch {
    /* ignore storage quota */
  }
  return next;
}

/**
 * Records an active study timestamp for the user (throttled to at most once every 20 minutes)
 * so the analyzer continuously refines their typical study hour.
 */
export function recordActiveStudyTimestamp(userId?: string | null): void {
  if (!userId) return;
  try {
    const key = getActivityKey(userId);
    const raw = localStorage.getItem(key);
    const list: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const last = list[list.length - 1] || 0;
    if (now - last < 20 * 60 * 1000) return; // throttle 20 mins
    const updated = [...list.slice(-80), now];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

/**
 * Given a target study time "HH:MM" (e.g. "20:00"), subtracts 15 minutes
 * and returns the reminder trigger time "HH:MM" (e.g. "19:45").
 */
export function computeReminderTriggerTime(studyTimeHHMM: string, leadMinutes = 15): string {
  const [hStr, mStr] = (studyTimeHHMM || DEFAULT_STUDY_TIME).split(":");
  const hour = Math.max(0, Math.min(23, parseInt(hStr || "20", 10) || 20));
  const minute = Math.max(0, Math.min(59, parseInt(mStr || "0", 10) || 0));

  const totalMinutes = (hour * 60 + minute - leadMinutes + 1440) % 1440;
  const remHour = Math.floor(totalMinutes / 60);
  const remMin = totalMinutes % 60;
  return `${String(remHour).padStart(2, "0")}:${String(remMin).padStart(2, "0")}`;
}

/**
 * Formats a 24h "HH:MM" string into human-readable 12-hour format (e.g. "7:45 PM").
 */
export function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = (hhmm || DEFAULT_STUDY_TIME).split(":");
  const h24 = parseInt(hStr || "20", 10);
  const min = parseInt(mStr || "0", 10);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${period}`;
}

/**
 * Returns the active study time ("HH:MM") based on whether the student is in
 * "auto" or "custom" mode, along with the 15-minute prior reminder trigger time.
 */
export function getEffectiveReminderSchedule(cfg: SmartStudyReminderConfig): {
  studyTime24: string;
  studyTime12: string;
  reminderTime24: string;
  reminderTime12: string;
  minutesUntilReminder: number;
} {
  const studyTime24 =
    cfg.mode === "custom" ? cfg.customStudyTime || DEFAULT_STUDY_TIME : cfg.detectedStudyTime || DEFAULT_STUDY_TIME;
  const reminderTime24 = computeReminderTriggerTime(studyTime24, 15);

  const [rH, rM] = reminderTime24.split(":").map((n) => parseInt(n, 10) || 0);
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const targetMins = rH * 60 + rM;
  const diff = (targetMins - nowMins + 1440) % 1440;

  return {
    studyTime24,
    studyTime12: formatTime12h(studyTime24),
    reminderTime24,
    reminderTime12: formatTime12h(reminderTime24),
    minutesUntilReminder: diff,
  };
}

/**
 * Analyzes the student's historical active hours across Supabase (`quiz_attempts`,
 * `study_sessions`) and local active session logs to compute their Peak Study Time.
 */
export async function analyzeStudentHistoricalStudyTime(
  userId: string
): Promise<SmartStudyReminderConfig> {
  const current = loadSmartReminderConfig(userId);
  const histogram = Array(24).fill(0);
  const minuteBuckets: number[][] = Array.from({ length: 24 }, () => []);
  let totalPoints = 0;

  const ingestTimestamp = (isoOrMs: string | number | null | undefined, weight = 1) => {
    if (!isoOrMs) return;
    const d = new Date(isoOrMs);
    if (Number.isNaN(d.getTime())) return;
    const hr = d.getHours();
    const min = d.getMinutes();
    histogram[hr] += weight;
    minuteBuckets[hr].push(min);
    totalPoints += 1;
  };

  // 1. Read local active session timestamps
  try {
    const rawLocal = localStorage.getItem(getActivityKey(userId));
    if (rawLocal) {
      const localList: number[] = JSON.parse(rawLocal);
      localList.forEach((ts) => ingestTimestamp(ts, 1.5));
    }
  } catch {
    /* ignore */
  }

  // 2. Query recent quiz_attempts & study_sessions from Supabase
  try {
    const [attemptsRes, sessionsRes] = await Promise.allSettled([
      supabase
        .from("quiz_attempts")
        .select("completed_at, started_at")
        .eq("student_id", userId)
        .order("started_at", { ascending: false })
        .limit(40),
      (supabase as any)
        .from("study_sessions")
        .select("created_at, started_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    if (attemptsRes.status === "fulfilled" && Array.isArray(attemptsRes.value.data)) {
      attemptsRes.value.data.forEach((row: any) => {
        ingestTimestamp(row.started_at || row.completed_at, 2);
      });
    }

    if (sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value.data)) {
      sessionsRes.value.data.forEach((row: any) => {
        ingestTimestamp(row.started_at || row.created_at, 2);
      });
    }
  } catch {
    /* offline or table unavailable — local timestamps still work */
  }

  let detectedStudyTime = current.detectedStudyTime || DEFAULT_STUDY_TIME;

  if (totalPoints > 0) {
    let peakHour = 20;
    let maxScore = -1;
    for (let h = 0; h < 24; h++) {
      if (histogram[h] > maxScore) {
        maxScore = histogram[h];
        peakHour = h;
      }
    }

    // Round average minute within peak hour to nearest 15-minute slot (00, 15, 30, 45)
    const minsInPeak = minuteBuckets[peakHour];
    let roundedMin = 0;
    if (minsInPeak.length > 0) {
      const avgMin = minsInPeak.reduce((a, b) => a + b, 0) / minsInPeak.length;
      roundedMin = (Math.round(avgMin / 15) * 15) % 60;
    }

    detectedStudyTime = `${String(peakHour).padStart(2, "0")}:${String(roundedMin).padStart(2, "0")}`;
  } else {
    histogram[20] = 2;
    histogram[19] = 1;
    histogram[21] = 1;
  }

  return saveSmartReminderConfig(userId, {
    detectedStudyTime,
    analyzedSessionsCount: totalPoints,
    hourlyHistogram: histogram,
  });
}

/**
 * Checks browser Notification permission state safely.
 */
export function getNativeNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Requests browser Notification permission cleanly.
 */
export async function requestNativeNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Dispatches a native push notification (via Service Worker registration when available,
 * with fallback to `new Notification`) AND syncs an in-app notification row.
 */
export async function sendSmartStudyPushNotification(options: {
  userId?: string | null;
  studyTime12: string;
  courseCode?: string;
  isTest?: boolean;
}): Promise<boolean> {
  const { userId, studyTime12, courseCode, isTest = false } = options;
  const courseLabel = courseCode ? ` for ${courseCode}` : "";
  const title = isTest
    ? `Smart Study Reminder Active (${studyTime12})`
    : `15 mins to your ${studyTime12} study session!`;
  const body = isTest
    ? `We'll notify you 15 minutes before your typical ${studyTime12} study window${courseLabel} so your streak stays unbroken.`
    : `Your peak focus window starts at ${studyTime12}. Jump into a quick 10-minute CBT drill${courseLabel} now!`;

  let deliveredNative = false;

  const perm = await requestNativeNotificationPermission();
  if (perm === "granted") {
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.showNotification === "function") {
          await reg.showNotification(title, {
            body,
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            tag: isTest ? "overra-smart-reminder-test" : "overra-smart-reminder-daily",
            renotify: true,
            data: { url: "/practice" },
          } as any);
          deliveredNative = true;
        }
      }

      if (!deliveredNative) {
        const n = new Notification(title, {
          body,
          icon: "/pwa-192x192.png",
          tag: isTest ? "overra-smart-reminder-test" : "overra-smart-reminder-daily",
        });
        n.onclick = () => {
          window.focus();
          window.location.href = "/practice";
        };
        deliveredNative = true;
      }
    } catch (err) {
      console.warn("Native push notification fallback:", err);
    }
  }

  // Also record in the user's real-time notifications table so the bell badge updates
  if (userId && !isTest) {
    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        title,
        message: body,
        type: "info",
        link: "/practice",
      });
    } catch {
      /* ignore if offline */
    }
  }

  return deliveredNative;
}

/**
 * Starts a background watcher that checks every 45 seconds whether the current clock time
 * is within the student's 15-minute pre-study reminder window, firing once per day.
 */
export function startSmartReminderWatcher(userId: string): () => void {
  recordActiveStudyTimestamp(userId);
  void analyzeStudentHistoricalStudyTime(userId);

  const checkAndFire = async () => {
    const cfg = loadSmartReminderConfig(userId);
    if (!cfg.enabled) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    if (cfg.lastFiredDate === todayStr) return;

    const schedule = getEffectiveReminderSchedule(cfg);
    const [remH, remM] = schedule.reminderTime24.split(":").map((n) => parseInt(n, 10) || 0);
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const remMins = remH * 60 + remM;

    // Trigger if current time is within [reminderTime, reminderTime + 14 minutes]
    const delta = nowMins - remMins;
    if (delta >= 0 && delta <= 14) {
      saveSmartReminderConfig(userId, { lastFiredDate: todayStr });
      await sendSmartStudyPushNotification({
        userId,
        studyTime12: schedule.studyTime12,
        isTest: false,
      });
    }
  };

  const intervalId = window.setInterval(checkAndFire, 45 * 1000);
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      recordActiveStudyTimestamp(userId);
      void checkAndFire();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Initial check shortly after mount
  const initTimer = window.setTimeout(checkAndFire, 3000);

  return () => {
    window.clearInterval(intervalId);
    window.clearTimeout(initTimer);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
