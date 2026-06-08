import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useMyPlaylists, useUpdatePlaylist, useDeletePlaylist, type PlaylistItem } from "@/hooks/useRemediationPlaylists";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import { format } from "date-fns";

export default function RemediationPlaylists() {
  const nav = useNavigate();
  const { data: lists = [], isLoading } = useMyPlaylists();
  const update = useUpdatePlaylist();
  const remove = useDeletePlaylist();

  const toggleItem = async (listId: string, items: PlaylistItem[], itemId: string) => {
    const next = items.map(i => i.id === itemId ? { ...i, done: !i.done } : i);
    await update.mutateAsync({ id: listId, items: next });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this playlist?")) return;
    await remove.mutateAsync(id);
    toast.success("Deleted");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="My Remediation Playlists" description="Track AI study plans against weak topics." />
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="mb-4">
          <PremiumPageHero
            eyebrow="STUDY PLANS"
            title="My remediation playlists"
            subtitle="AI-generated study plans, tracked against your weak topics."
            icon={Bookmark}
            back
          />
        </div>
        {isLoading ? (
          <Loader2 className="w-6 h-6 mx-auto mt-12 animate-spin text-primary" />
        ) : lists.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No saved plans yet</p>
            <p className="text-xs mt-1">Take a mock exam, generate a plan and bookmark it.</p>
            <Button className="mt-4" onClick={() => nav("/exams")}>Browse Mock Exams</Button>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {lists.map(p => {
              const done = p.items.filter(i => i.done).length;
              const pct = p.items.length ? Math.round((done / p.items.length) * 100) : 0;
              return (
                <AccordionItem key={p.id} value={p.id} className="rounded-xl border bg-card px-3 [&_[data-state]]:border-0">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex-1 text-left pr-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{p.title}</h3>
                        {p.completed_at && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(p.created_at), "MMM d")} · {done}/{p.items.length} done
                      </p>
                      <Progress value={pct} className="h-1 mt-1.5" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {p.topic_breakdown?.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {p.topic_breakdown.slice(0, 6).map((t: any, i: number) => {
                          const tp = t.total ? Math.round((t.correct / t.total) * 100) : 0;
                          return (
                            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${tp < 50 ? "bg-destructive/10 text-destructive" : tp < 75 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                              {t.name ?? "Topic"} · {tp}%
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <ul className="space-y-2">
                      {p.items.map(item => (
                        <li key={item.id} className="flex items-start gap-2 text-sm">
                          <Checkbox
                            checked={item.done}
                            onCheckedChange={() => toggleItem(p.id, p.items, item.id)}
                            className="mt-0.5"
                          />
                          <span className={item.done ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-end mt-3">
                      <Button variant="ghost" size="sm" onClick={() => del(p.id)}>
                        <Trash2 className="w-4 h-4 mr-1 text-destructive" /> Delete
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
