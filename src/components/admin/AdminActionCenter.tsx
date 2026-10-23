import React, { useState } from "react";
import {
  Bell,
  Coins,
  GraduationCap,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface ActionCenterStats {
  pendingPurchases: number;
  pendingApplications: number;
  pendingSchools: number;
  pendingQuestions: number;
}

interface AdminActionCenterProps {
  stats: ActionCenterStats;
  onSelectTab: (tabKey: string) => void;
}

export const AdminActionCenter: React.FC<AdminActionCenterProps> = ({
  stats,
  onSelectTab,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeQueue, setActiveQueue] = useState<"tokens" | "tutors" | "schools" | "questions" | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const totalPending =
    stats.pendingPurchases +
    stats.pendingApplications +
    stats.pendingSchools +
    stats.pendingQuestions;

  const handleChipClick = (queue: "tokens" | "tutors" | "schools" | "questions", tabKey: string) => {
    setActiveQueue(queue);
    onSelectTab(tabKey);
  };

  const openDrawerFor = (queue: "tokens" | "tutors" | "schools" | "questions") => {
    setActiveQueue(queue);
    setDrawerOpen(true);
  };

  return (
    <>
      <div className="sticky top-16 z-30 mb-6 rounded-2xl border border-border/80 bg-background/80 backdrop-blur-md shadow-xs transition-all duration-200">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          {/* Left: Summary Counter */}
          <div className="flex items-center gap-2.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${totalPending > 0 ? "bg-amber-500/15 text-amber-600 animate-pulse" : "bg-emerald-500/15 text-emerald-600"}`}>
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-foreground">
                {totalPending > 0 ? `${totalPending} Pending Tasks` : "Action Center Clean"}
              </span>
              <span className="text-muted-foreground hidden sm:inline">· Instant Triage</span>
            </div>
          </div>

          {/* Center: Quick Action Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Token Proofs Chip */}
            <button
              onClick={() => handleChipClick("tokens", "tokens")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                stats.pendingPurchases > 0
                  ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
              }`}
              title="Review manual token transfer receipts"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>{stats.pendingPurchases} Token Proofs</span>
            </button>

            {/* Tutor Apps Chip */}
            <button
              onClick={() => handleChipClick("tutors", "tutors")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                stats.pendingApplications > 0
                  ? "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 hover:bg-violet-100"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
              }`}
              title="Review new educator applications"
            >
              <GraduationCap className="w-3.5 h-3.5 text-violet-600" />
              <span>{stats.pendingApplications} Tutor Apps</span>
            </button>

            {/* Flagged Questions Chip */}
            <button
              onClick={() => handleChipClick("questions", "questions")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                stats.pendingQuestions > 0
                  ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
              }`}
              title="Inspect reported question errors"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>{stats.pendingQuestions} Flagged Qs</span>
            </button>

            {/* School Apps Chip */}
            {stats.pendingSchools > 0 && (
              <button
                onClick={() => handleChipClick("schools", "schools")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                title="Review institutional campus applications"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{stats.pendingSchools} School Apps</span>
              </button>
            )}
          </div>

          {/* Right: Quick Drawer Trigger */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDrawerFor(activeQueue || "tokens")}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
            >
              Triage Drawer
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Fast-Action Side Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4 text-amber-500" />
              Moderation &amp; Triage Drawer
            </SheetTitle>
            <SheetDescription className="text-xs">
              Quickly clear bottlenecks without losing context in your active view.
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {/* Queue Selector inside drawer */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveQueue("tokens")}
                className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                  activeQueue === "tokens"
                    ? "border-amber-500 bg-amber-500/10 font-semibold text-amber-900 dark:text-amber-200"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <Badge variant={stats.pendingPurchases > 0 ? "warning" : "outline"} className="text-[10px] py-0">
                    {stats.pendingPurchases}
                  </Badge>
                </div>
                <span>Token Proofs</span>
              </button>

              <button
                onClick={() => setActiveQueue("tutors")}
                className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                  activeQueue === "tutors"
                    ? "border-violet-500 bg-violet-500/10 font-semibold text-violet-900 dark:text-violet-200"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <GraduationCap className="w-4 h-4 text-violet-600" />
                  <Badge variant={stats.pendingApplications > 0 ? "warning" : "outline"} className="text-[10px] py-0">
                    {stats.pendingApplications}
                  </Badge>
                </div>
                <span>Tutor Apps</span>
              </button>

              <button
                onClick={() => setActiveQueue("questions")}
                className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                  activeQueue === "questions"
                    ? "border-rose-500 bg-rose-500/10 font-semibold text-rose-900 dark:text-rose-200"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <FileText className="w-4 h-4 text-rose-600" />
                  <Badge variant={stats.pendingQuestions > 0 ? "danger" : "outline"} className="text-[10px] py-0">
                    {stats.pendingQuestions}
                  </Badge>
                </div>
                <span>Flagged Questions</span>
              </button>

              <button
                onClick={() => setActiveQueue("schools")}
                className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                  activeQueue === "schools"
                    ? "border-emerald-500 bg-emerald-500/10 font-semibold text-emerald-900 dark:text-emerald-200"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <Badge variant={stats.pendingSchools > 0 ? "success" : "outline"} className="text-[10px] py-0">
                    {stats.pendingSchools}
                  </Badge>
                </div>
                <span>School Partners</span>
              </button>
            </div>

            {/* Quick Context Summary Card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Queue Focus
                </span>
                <Badge variant="outline" className="text-[11px] capitalize">
                  {activeQueue || "tokens"}
                </Badge>
              </div>

              {activeQueue === "tokens" && (
                <div className="space-y-2 text-xs">
                  <p className="text-muted-foreground">
                    Students who paid via bank transfer have submitted payment reference receipts. Verify credits and activate their tokens.
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => {
                      setDrawerOpen(false);
                      onSelectTab("tokens");
                    }}
                  >
                    Open Token Approvals Tab ({stats.pendingPurchases})
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              )}

              {activeQueue === "tutors" && (
                <div className="space-y-2 text-xs">
                  <p className="text-muted-foreground">
                    Aspiring university tutors awaiting credential verification and departmental accreditation.
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={() => {
                      setDrawerOpen(false);
                      onSelectTab("tutors");
                    }}
                  >
                    Open Tutor Management Tab ({stats.pendingApplications})
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              )}

              {activeQueue === "questions" && (
                <div className="space-y-2 text-xs">
                  <p className="text-muted-foreground">
                    Community and student dispute flags on CBT questions (wrong answer key, typo, LaTeX render issue).
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => {
                      setDrawerOpen(false);
                      onSelectTab("questions");
                    }}
                  >
                    Open Question Moderation ({stats.pendingQuestions})
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              )}

              {activeQueue === "schools" && (
                <div className="space-y-2 text-xs">
                  <p className="text-muted-foreground">
                    Secondary and tertiary institutional requests for bulk white-label CBT licensing.
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      setDrawerOpen(false);
                      onSelectTab("schools");
                    }}
                  >
                    Open School Applications ({stats.pendingSchools})
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AdminActionCenter;
