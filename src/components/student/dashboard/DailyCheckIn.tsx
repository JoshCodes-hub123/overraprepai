import { Flame, Check, Coins, Gift } from "lucide-react";
import {
  useDailyCheckIn,
  STREAK_REWARD_SCHEDULE,
} from "@/hooks/useDailyCheckIn";
import { cn } from "@/lib/utils";

export interface DailyCheckInProps {
  variant?: "sidebar" | "card";
  className?: string;
}

/**
 * Daily Check-in component that rewards students with a consecutive login
 * streak bonus (AI Exam Tokens), designed for prominent display in the
 * sidebar and student dashboard.
 */
export function DailyCheckIn({ variant = "sidebar", className }: DailyCheckInProps) {
  const {
    currentStreak,
    isCheckedInToday,
    nextStreakCount,
    todayRewardTokens,
    claimCheckIn,
    isClaiming,
  } = useDailyCheckIn();

  // Active day in the 7-day reward cycle (1..7)
  const activeCycleDay = ((Math.max(1, isCheckedInToday ? currentStreak : nextStreakCount) - 1) % 7) + 1;

  if (variant === "sidebar") {
    return (
      <section
        aria-label="Daily Check-in Streak Bonus"
        className={cn(
          "rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 p-3.5 shadow-2xs",
          className
        )}
      >
        {/* Top Row: Streak Count + Today's Bonus */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-2xs">
              <Flame className="h-4 w-4 fill-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xs font-extrabold text-neutral-900">
                  Daily Check-in
                </span>
                <span className="text-neutral-400" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-xs font-extrabold tabular-nums text-amber-700">
                  {currentStreak}d
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 truncate">
                {isCheckedInToday
                  ? "Streak bonus claimed today"
                  : `Day ${nextStreakCount} bonus ready`}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-extrabold tabular-nums text-amber-800 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              +{todayRewardTokens}
            </span>
          </div>
        </div>

        {/* 7-Day Streak Milestone Strip */}
        <div className="mt-3 grid grid-cols-7 gap-1">
          {STREAK_REWARD_SCHEDULE.map((slot) => {
            const isCompleted =
              slot.day < activeCycleDay || (slot.day === activeCycleDay && isCheckedInToday);
            const isTodayTarget = slot.day === activeCycleDay && !isCheckedInToday;

            return (
              <div
                key={slot.day}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg border text-center transition-colors",
                  isCompleted
                    ? "border-amber-400 bg-amber-500 text-slate-950 font-bold"
                    : isTodayTarget
                      ? "border-amber-400 bg-amber-100/90 text-amber-950 ring-1 ring-amber-400/50 font-bold"
                      : "border-amber-200/60 bg-white/80 text-neutral-500"
                )}
                title={`Day ${slot.day}: +${slot.tokens} Tokens`}
              >
                <span className="text-[9px] leading-none opacity-80">D{slot.day}</span>
                <div className="my-0.5 flex items-center justify-center h-3.5">
                  {isCompleted ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <span className="font-mono text-[9.5px] font-extrabold tabular-nums">
                      +{slot.tokens}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={claimCheckIn}
          disabled={isCheckedInToday || isClaiming}
          className={cn(
            "mt-3 w-full h-9 rounded-xl font-display text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0",
            isCheckedInToday
              ? "bg-emerald-500/15 text-emerald-800 border border-emerald-300/70 cursor-default"
              : "bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 shadow-xs cursor-pointer"
          )}
        >
          {isCheckedInToday ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Checked In · Come Back Tomorrow</span>
            </>
          ) : isClaiming ? (
            <span>Claiming Bonus…</span>
          ) : (
            <>
              <Gift className="w-3.5 h-3.5" />
              <span>Claim +{todayRewardTokens} Streak Tokens</span>
            </>
          )}
        </button>
      </section>
    );
  }

  // Dashboard Card Variant
  return (
    <section
      aria-label="Daily Check-in Streak Bonus"
      className={cn(
        "rounded-2xl border border-amber-200/80 dark:border-border bg-gradient-to-r from-amber-50/70 via-card to-card p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
          <Flame className="h-5 w-5 fill-slate-950" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-sm font-bold text-foreground">
              Daily Consecutive Check-in
            </h3>
            <span className="text-muted-foreground" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {currentStreak} Day Streak
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isCheckedInToday
              ? `You claimed today's streak bonus. Log in tomorrow for Day ${currentStreak + 1} (+${
                  STREAK_REWARD_SCHEDULE[currentStreak % 7]?.tokens ?? 15
                } Tokens).`
              : `Log in consecutively to multiply your daily AI Exam Token bonus (+${todayRewardTokens} Tokens today).`}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={claimCheckIn}
        disabled={isCheckedInToday || isClaiming}
        className={cn(
          "h-9 px-4 rounded-xl font-display text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0",
          isCheckedInToday
            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 cursor-default"
            : "bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 shadow-xs cursor-pointer"
        )}
      >
        {isCheckedInToday ? (
          <>
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Checked In Today</span>
          </>
        ) : (
          <>
            <Gift className="w-3.5 h-3.5" />
            <span>Claim +{todayRewardTokens} Streak Tokens</span>
          </>
        )}
      </button>
    </section>
  );
}

export default DailyCheckIn;
