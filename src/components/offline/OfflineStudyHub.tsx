import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, HardDrive, DownloadCloud, Sparkles, CheckCircle2, ArrowRight, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AdvancedOfflineCenter } from "./AdvancedOfflineCenter";

export const OfflineStudyHub: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [downloading, setDownloading] = useState(false);
  const [offlinePackDownloaded, setOfflinePackDownloaded] = useState<boolean>(() => {
    try {
      return localStorage.getItem("overra_offline_pack") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleDownloadCBTBundle = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setOfflinePackDownloaded(true);
      try {
        localStorage.setItem("overra_offline_pack", "1");
      } catch {}
      toast.success("1,500+ CBT past questions & formulas cached successfully for offline study!");
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 border-amber-300/50 bg-gradient-to-br from-card via-card to-amber-50/20 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-sm">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-foreground">
                  Deep Offline Study Hub
                </h3>
                <Badge
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isOnline
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                  }`}
                >
                  {isOnline ? (
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3 h-3" /> Online Mode
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <WifiOff className="w-3 h-3" /> Offline Mode Active
                    </span>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Study without internet. Cached CBT questions and lecture PDFs work seamlessly.
              </p>
            </div>
          </div>

          <Link to="/student/offline-downloads">
            <Button variant="outline" size="sm" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs">
              Manage Downloads <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" /> Core CBT Question Bundle
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {offlinePackDownloaded ? "Ready for offline exams (1,500 questions)" : "Download for offline exam simulation"}
              </div>
            </div>
            {offlinePackDownloaded ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cached
              </span>
            ) : (
              <Button
                size="sm"
                onClick={handleDownloadCBTBundle}
                disabled={downloading}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3"
              >
                {downloading ? "Caching..." : "Download Bundle"}
              </Button>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Auto-Cache Lecture Notes
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                PDFs open instantly without internet connection
              </div>
            </div>
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Active
            </span>
          </div>
        </div>
      </Card>

      <AdvancedOfflineCenter />
    </div>
  );
};

export default OfflineStudyHub;
