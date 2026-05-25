import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import { Bell, Heart, MessageCircle, AtSign, Mail, MessagesSquare, Megaphone, Moon, Briefcase, Sparkles, Smartphone } from "lucide-react";
import { initPushNotifications } from "@/lib/native/push";
import { Capacitor } from "@capacitor/core";

interface Prefs {
  notify_likes: boolean;
  notify_comments: boolean;
  notify_mentions: boolean;
  notify_messages: boolean;
  notify_announcements: boolean;
  email_notifications: boolean;
  notify_opportunities: boolean;
  notify_posts: boolean;
  email_opportunities: boolean;
  email_posts: boolean;
  push_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const defaults: Prefs = {
  notify_likes: true,
  notify_comments: true,
  notify_mentions: true,
  notify_messages: true,
  notify_announcements: true,
  email_notifications: false,
  notify_opportunities: true,
  notify_posts: true,
  email_opportunities: false,
  email_posts: false,
  push_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

const NotificationSettings = () => {
  const { user, isLoading: authLoading, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await (supabase as any)
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs({ ...defaults, ...data });
      setLoading(false);
    })();
  }, [user]);

  const update = <K extends keyof Prefs>(k: K, v: Prefs[K]) =>
    setPrefs((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { user_id: user.id, ...prefs };
    const { error } = await (supabase as any)
      .from("notification_preferences")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Preferences saved");
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center pt-32"><LoadingSpinner /></div></div>;
  }

  const Row = ({ icon: Icon, title, desc, k }: { icon: any; title: string; desc: string; k: keyof Prefs }) => (
    <div className="flex items-start justify-between gap-4 py-4 border-b last:border-b-0">
      <div className="flex gap-3">
        <div className="mt-0.5"><Icon className="w-5 h-5 text-primary" /></div>
        <div>
          <Label className="font-medium">{title}</Label>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={prefs[k] as boolean} onCheckedChange={(v) => update(k, v as any)} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Notification Settings" description="Choose when you receive alerts." />
      <Navbar />
      <div className="pt-16 md:pt-[72px]"><DashboardNav role={navRole} /></div>
      <main className="container mx-auto px-4 pt-6 pb-16 max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-bold">Notification Settings</h1>
            <p className="text-muted-foreground">Decide what you want to be alerted about.</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New content</CardTitle>
            <CardDescription>Alerts for new opportunities, talent showcases, articles and announcements</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Row icon={Briefcase} title="In-app: Opportunities" desc="Scholarships, internships, hackathons" k="notify_opportunities" />
            <Row icon={Sparkles} title="In-app: Posts" desc="Talent showcases, articles, announcements" k="notify_posts" />
            <Row icon={Mail} title="Email: Opportunities" desc="Get an email when a new opportunity is published" k="email_opportunities" />
            <Row icon={Mail} title="Email: Posts" desc="Get an email when a new post is published" k="email_posts" />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Alerts triggered by other users</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Row icon={Heart} title="Likes" desc="When someone likes your post" k="notify_likes" />
            <Row icon={MessageCircle} title="Comments" desc="When someone comments on your post" k="notify_comments" />
            <Row icon={AtSign} title="Mentions" desc="When someone mentions you" k="notify_mentions" />
            <Row icon={MessagesSquare} title="Direct messages" desc="When you receive a message" k="notify_messages" />
            <Row icon={Megaphone} title="Announcements" desc="Tutor & admin announcements" k="notify_announcements" />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Channels</CardTitle>
            <CardDescription>Where to send your notifications</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Row icon={Mail} title="Email notifications" desc="Receive a daily summary by email" k="email_notifications" />
            <Row icon={Smartphone} title="Push notifications" desc="On the mobile app, get push alerts for selected categories" k="push_enabled" />
            {Capacitor.isNativePlatform() && (
              <div className="pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!user) return;
                    await initPushNotifications(user.id);
                    toast.success("Push permission requested");
                  }}
                >
                  Enable device push
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Moon className="w-4 h-4" /> Quiet hours</CardTitle>
            <CardDescription>Pause non-essential alerts during these hours (optional)</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Start</Label>
              <Input
                type="time"
                value={prefs.quiet_hours_start || ""}
                onChange={(e) => update("quiet_hours_start", e.target.value || null)}
              />
            </div>
            <div>
              <Label className="text-xs">End</Label>
              <Input
                type="time"
                value={prefs.quiet_hours_end || ""}
                onChange={(e) => update("quiet_hours_end", e.target.value || null)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save preferences"}</Button>
        </div>
      </main>
    </div>
  );
};

export default NotificationSettings;
