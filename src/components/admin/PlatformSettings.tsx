import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Percent, Info, CalendarClock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export function PlatformSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [commissionRate, setCommissionRate] = useState("80");

  // Tomorrow's-exam pill (student dashboard)
  const [examEnabled, setExamEnabled] = useState(false);
  const [examPrefix, setExamPrefix] = useState("Heads-up: tomorrow is");
  const [examLabel, setExamLabel] = useState("");
  const [examEmoji, setExamEmoji] = useState("📚");
  const [isSavingExam, setIsSavingExam] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("*")
        .order("key");

      if (data) {
        setSettings(data);
        const commission = data.find((s) => s.key === "tutor_commission_rate");
        if (commission) setCommissionRate(commission.value);

        const map = Object.fromEntries(data.map((s) => [s.key, s.value]));
        setExamEnabled((map.upcoming_exam_enabled ?? "false").toLowerCase() === "true");
        setExamPrefix(map.upcoming_exam_prefix ?? "Heads-up: tomorrow is");
        setExamLabel(map.upcoming_exam_label ?? "");
        setExamEmoji(map.upcoming_exam_emoji ?? "📚");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const upsertSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key, value, updated_by: user?.id }, { onConflict: "key" });
    if (error) throw error;
  };

  const handleSaveExamPill = async () => {
    setIsSavingExam(true);
    try {
      await Promise.all([
        upsertSetting("upcoming_exam_enabled", examEnabled ? "true" : "false"),
        upsertSetting("upcoming_exam_prefix", examPrefix),
        upsertSetting("upcoming_exam_label", examLabel),
        upsertSetting("upcoming_exam_emoji", examEmoji),
      ]);
      toast.success("Tomorrow's exam pill updated");
      fetchSettings();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save");
    } finally {
      setIsSavingExam(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveCommission = async () => {
    const rate = parseInt(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Commission rate must be between 0 and 100");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          value: commissionRate,
          updated_by: user?.id,
        })
        .eq("key", "tutor_commission_rate");

      if (error) throw error;

      toast.success("Commission rate updated successfully");
      fetchSettings();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const platformShare = 100 - parseInt(commissionRate || "80");

  return (
    <div className="space-y-6">
      {/* Commission Settings */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <Percent className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Commission Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure how revenue is split between tutors and the platform
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="commission">Tutor Commission Rate (%)</Label>
              <div className="flex gap-2">
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
                <Button onClick={handleSaveCommission} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Percentage of token revenue that goes to tutors
              </p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Revenue Split Preview</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-foreground">Tutor receives:</span>
                  <span className="font-semibold text-accent">{commissionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground">Platform receives:</span>
                  <span className="font-semibold text-primary">{platformShare}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Example Calculation</p>
              <p className="text-muted-foreground">
                If a quiz costs 10 tokens and {commissionRate}% goes to tutors:
              </p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>• Tutor earns: {Math.round(10 * (parseInt(commissionRate) / 100))} tokens</li>
                <li>• Platform earns: {Math.round(10 * (platformShare / 100))} tokens</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* All Settings */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">All Settings</h3>
        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
            >
              <div>
                <p className="font-medium text-foreground">{setting.key}</p>
                {setting.description && (
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-mono text-foreground">{setting.value}</p>
                <p className="text-xs text-muted-foreground">
                  Updated: {new Date(setting.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}