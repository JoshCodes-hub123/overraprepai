/**
 * SaveOfflineButton — one button, two modes:
 *
 *   1. mode="resource"  → caches a user_resource (PDF / note / study pack)
 *      into the offline library so it opens with no internet.
 *
 *   2. mode="quiz"      → fetches a quiz's questions and saves them to the
 *      offline quiz store. Student can practice on the bus with no data.
 *
 * Cache primitives already existed (`offlineLibraryCache`, `offlineQuizStore`);
 * this button is the missing user-facing affordance.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudDownload, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  cacheMaterialFromUrl, cacheMaterialOffline, getCachedMaterial, removeCachedMaterial,
} from "@/lib/offlineLibraryCache";
import {
  saveOfflineSet, getOfflineSet, deleteOfflineSet, type OfflineQuestion,
} from "@/lib/offlineQuizStore";
import { getResourceSignedUrl, type UserResource } from "@/lib/userResources";

type Props =
  | {
      mode: "resource";
      resource: UserResource;
      size?: "sm" | "default";
      compact?: boolean;
    }
  | {
      mode: "quiz";
      quizId: string;
      title: string;
      courseName?: string | null;
      size?: "sm" | "default";
      compact?: boolean;
    };

export const SaveOfflineButton = (props: Props) => {
  const { user } = useAuth();
  const size = props.size ?? "sm";
  const compact = props.compact ?? true;
  const id = props.mode === "resource" ? `res:${props.resource.id}` : `quiz:${props.quizId}`;

  const [cached, setCached] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (props.mode === "resource") {
          const c = await getCachedMaterial(id);
          if (alive) setCached(!!c);
        } else {
          const { set } = await getOfflineSet(id);
          if (alive) setCached(!!set);
        }
      } catch {
        if (alive) setCached(false);
      }
    })();
    return () => { alive = false; };
  }, [id, props.mode]);

  const download = async () => {
    if (!user?.id) { toast.error("Sign in to save offline"); return; }
    setBusy(true);
    try {
      if (props.mode === "resource") {
        const r = props.resource;
        // Note-style resources may have inline text in meta.content — cache directly.
        const inline = (r.meta as any)?.content;
        if ((r.kind === "note" || r.kind === "study_pack") && typeof inline === "string" && inline.length > 0) {
          const blob = new Blob([inline], { type: "text/plain" });
          await cacheMaterialOffline({
            id, title: r.title, mime: "text/plain", ext: "txt",
            blob, cached_at: Date.now(),
          });
        } else {
          const url = await getResourceSignedUrl(r.storage_path, 1800);
          if (!url) throw new Error("Couldn't get a download link");
          await cacheMaterialFromUrl({ id, title: r.title, url });
        }
        toast.success("Saved for offline");
      } else {
        const { data, error } = await supabase
          .from("quiz_questions")
          .select("questions(*)")
          .eq("quiz_id", props.quizId)
          .order("order_index");
        if (error) throw error;
        const questions: OfflineQuestion[] = (data || []).map((row: any) => {
          const q = row.questions;
          return {
            id: q.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option,
            explanation: q.explanation ?? null,
            image_url: q.image_url ?? null,
            course_name: props.courseName ?? null,
          };
        });
        if (questions.length === 0) throw new Error("This quiz has no questions yet");
        await saveOfflineSet(
          {
            id,
            title: props.title,
            source: "manual",
            course_name: props.courseName ?? null,
            question_count: questions.length,
            downloaded_at: Date.now(),
            user_id: user.id,
          },
          questions,
        );
        toast.success(`Saved ${questions.length} questions for offline`);
      }
      setCached(true);
    } catch (e: any) {
      console.error("[offline-save]", e);
      toast.error(e?.message || "Couldn't save offline");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      if (props.mode === "resource") await removeCachedMaterial(id);
      else await deleteOfflineSet(id);
      setCached(false);
      toast.success("Removed from offline");
    } finally {
      setBusy(false);
    }
  };

  if (cached === null) {
    return (
      <Button size={size} variant="ghost" disabled className={compact ? "h-7 px-2 text-xs" : ""}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </Button>
    );
  }

  if (cached) {
    return (
      <Button
        size={size}
        variant="outline"
        onClick={remove}
        disabled={busy}
        className={
          compact
            ? "h-7 px-2 text-xs border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
        Saved offline
        <Trash2 className="w-3 h-3 ml-1.5 opacity-60" />
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant="outline"
      onClick={download}
      disabled={busy}
      className={compact ? "h-7 px-2 text-xs" : ""}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CloudDownload className="w-3.5 h-3.5 mr-1" />}
      Save offline
    </Button>
  );
};

export default SaveOfflineButton;
