import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface InstallAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-2.5 mb-3 flex items-center justify-center shadow-xs">
            <img src={logo} alt="OverraPrep AI" className="w-full h-full object-contain" />
          </div>
          <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
            Install OverraPrep AI
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
              Android &amp; Web
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Experience 100% offline-ready CBT simulation, instant AI explanations, and seamless exam prep on your Android phone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Benefit Highlights */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl border border-border/80 bg-muted/30 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                <Zap className="w-4 h-4" />
                <span>Zero Lag CBT</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Runs completely client-side without network drops during mock exams.
              </p>
            </div>
            <div className="p-3 rounded-xl border border-border/80 bg-muted/30 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Low Data Mode</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Offline question banks cached for Nigerian campus networks.
              </p>
            </div>
          </div>

          {/* Quick Install Action or Manual Steps */}
          {deferredPrompt ? (
            <Button
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-md gap-2"
              onClick={handleInstallClick}
            >
              <Download className="w-4 h-4" />
              1-Tap Install on Android Phone
            </Button>
          ) : (
            <div className="rounded-xl border border-amber-200/60 bg-amber-500/5 p-3.5 space-y-2 text-xs">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-600" />
                How to install on Chrome / Android:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11.5px]">
                <li>Tap the <strong>browser menu (⋮)</strong> at top-right.</li>
                <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>Launch OverraPrep directly from your app drawer.</li>
              </ol>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
            <span>Play Store Android APK Ready</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified PWA
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallAppModal;
