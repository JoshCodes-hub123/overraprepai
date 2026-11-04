import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Target, Flame } from "lucide-react";

interface ExamReadinessRingsProps {
  readinessPct?: number;
  dailyDone?: number;
  dailyTotal?: number;
  streakDays?: number;
}

export const ExamReadinessRings: React.FC<ExamReadinessRingsProps> = ({
  readinessPct = 78,
  dailyDone = 2,
  dailyTotal = 3,
  streakDays = 5,
}) => {
  const dailyPct = Math.round((dailyDone / Math.max(1, dailyTotal)) * 100);

  return (
    <div className="relative w-full rounded-3xl bg-gradient-to-br from-card/90 via-card/70 to-primary/5 border border-primary/20 p-5 shadow-xl shadow-primary/5 backdrop-blur-xl overflow-hidden">
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-foreground tracking-tight">
              Exam Readiness Rings
            </h3>
            <p className="text-xs text-muted-foreground">First-Class CBT Target Status</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
          Live Tracker
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Ring 1: CBT Readiness */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/60 border border-border/50">
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted/30"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-primary transition-all duration-1000 ease-out"
                strokeDasharray={`${readinessPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-foreground">{readinessPct}%</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Target className="w-3 h-3 text-primary" /> Exam Ready
            </div>
            <div className="text-[11px] text-muted-foreground">Target: 320+ UTME / 1st Class</div>
          </div>
        </div>

        {/* Ring 2: Daily Target */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/60 border border-border/50">
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted/30"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 transition-all duration-1000 ease-out"
                strokeDasharray={`${dailyPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-foreground">{dailyDone}/{dailyTotal}</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" /> Daily Pulse
            </div>
            <div className="text-[11px] text-muted-foreground">{dailyDone} of {dailyTotal} tasks done</div>
          </div>
        </div>

        {/* Ring 3: Streak */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/60 border border-border/50">
          <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
            <Flame className="w-6 h-6 fill-amber-500/20" />
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground">{streakDays} Day Streak</div>
            <div className="text-[11px] text-muted-foreground">Keep the fire burning!</div>
          </div>
        </div>
      </div>
    </div>
  );
};
