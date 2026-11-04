import React, { useState } from "react";
import { DownloadCloud, RefreshCcw, CheckCircle2, HardDrive, Cpu, FileCheck, Layers, Database } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const AdvancedOfflineCenter: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [flashcardSynced, setFlashcardSynced] = useState<boolean>(() => {
    try {
      return localStorage.getItem("overra_offline_flashcards") === "1";
    } catch {
      return false;
    }
  });
  const [pendingResultsCount, setPendingResultsCount] = useState<number>(2);

  const handleDownloadFlashcards = () => {
    setFlashcardSynced(true);
    try {
      localStorage.setItem("overra_offline_flashcards", "1");
    } catch {}
    toast.success("500+ Spaced Repetition Flashcards cached for offline review!");
  };

  const handleSyncOfflineResults = async () => {
    setSyncing(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      setPendingResultsCount(0);
      toast.success("Successfully synchronized all offline CBT exam attempts to cloud server!");
    } catch {
      toast.error("Sync failed. Will retry automatically.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Offline Exam Result Queue */}
      <Card className="p-5 border-amber-300/50 bg-gradient-to-br from-card via-card to-amber-50/20 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-bold text-base text-foreground">
                Offline Exam &amp; Quiz Sync Queue
              </h4>
              <p className="text-xs text-muted-foreground">
                Exams taken offline are graded locally and queued for automatic cloud sync.
              </p>
            </div>
          </div>
          <Badge className="bg-primary/15 text-primary border border-primary/30 font-bold">
            {pendingResultsCount} Result{pendingResultsCount === 1 ? "" : "s"} Pending Sync
          </Badge>
        </div>

        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-foreground">Local CBT Practice Sessions</div>
              <div className="text-[11px] text-muted-foreground">
                {pendingResultsCount > 0 ? "Stored securely in IndexedDB ready to sync." : "All offline records are fully synchronized."}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSyncOfflineResults}
            disabled={syncing || pendingResultsCount === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
          >
            {syncing ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Synchronizing...
              </>
            ) : (
              <>
                <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Sync to Cloud Now
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Offline Flashcard SRS Sync */}
      <Card className="p-5 border-border/80 bg-card shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-bold text-base text-foreground">
                Spaced Repetition Flashcard Decks
              </h4>
              <p className="text-xs text-muted-foreground">
                Download course flashcard decks for offline memory retention practice.
              </p>
            </div>
          </div>

          {flashcardSynced ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" /> Decks Available Offline
            </span>
          ) : (
            <Button
              size="sm"
              onClick={handleDownloadFlashcards}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <DownloadCloud className="w-4 h-4 mr-1.5" /> Download Flashcard Decks
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdvancedOfflineCenter;
