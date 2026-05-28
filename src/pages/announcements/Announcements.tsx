import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Megaphone, Loader2, Trash2, Pin } from "lucide-react";
import { toast } from "sonner";
import EntityComments from "@/components/comments/EntityComments";

interface Ann {
  id: string;
  tutor_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  tutor_name?: string;
}

export default function Announcements() {
  const { user, hasRole } = useAuth();
  const isTutor = !!user && hasRole("tutor");
  const [items, setItems] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tutor_announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    const list = (data as Ann[]) ?? [];
    const ids = [...new Set(list.map((a) => a.tutor_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      list.forEach((a) => (a.tutor_name = map.get(a.tutor_id) || "Tutor"));
    }
    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("announcements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tutor_announcements" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const post = async () => {
    if (!user || !title.trim() || !body.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("tutor_announcements").insert({
      tutor_id: user.id,
      title: title.trim().slice(0, 200),
      body: body.trim().slice(0, 4000),
    });
    setPosting(false);
    if (error) return toast.error(error.message);
    toast.success("Announcement posted");
    setTitle("");
    setBody("");
    setOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete announcement?")) return;
    const { error } = await supabase.from("tutor_announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
  };

  const togglePin = async (a: Ann) => {
    await supabase.from("tutor_announcements").update({ is_pinned: !a.is_pinned }).eq("id", a.id);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <SEO title="Announcements" description="Updates and announcements from tutors." />
      <DashboardNav role={(hasRole?.("admin") ? "admin" : hasRole?.("tutor") ? "tutor" : "student")} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Announcements</h1>
            <p className="text-muted-foreground">News and updates from your tutors.</p>
          </div>
          {isTutor && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Megaphone className="w-4 h-4 mr-2" /> New announcement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Post Announcement</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Title *</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                  </div>
                  <div>
                    <Label>Message *</Label>
                    <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={4000} />
                  </div>
                  <Button
                    onClick={post}
                    disabled={posting || !title.trim() || !body.trim()}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Publish
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
        ) : items.length === 0 ? (
          <div className="border rounded-2xl bg-white p-10 text-center">
            <Megaphone className="w-10 h-10 mx-auto mb-3 text-amber-500" />
            <p className="font-semibold">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <article key={a.id} className="border rounded-2xl bg-white p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {a.is_pinned && <Pin className="w-4 h-4 text-amber-600" />}
                    <h3 className="font-semibold text-lg">{a.title}</h3>
                  </div>
                  {isTutor && a.tutor_id === user?.id && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => togglePin(a)}>
                        <Pin className={`w-4 h-4 ${a.is_pinned ? "text-amber-600" : ""}`} />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {a.tutor_name} · {new Date(a.created_at).toLocaleString()}
                </p>
                <p className="mt-3 text-foreground whitespace-pre-wrap">{a.body}</p>
                <EntityComments entityType="announcement" entityId={a.id} />
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
