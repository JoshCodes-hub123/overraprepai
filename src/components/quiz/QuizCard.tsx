import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, ArrowRight, ChevronDown, Clock, Sparkles, Users,
} from "lucide-react";
import TutorAvatar from "@/components/tutor/TutorAvatar";
import { TutorOrgBadge } from "@/components/tutor/TutorOrgBadge";
import { cn } from "@/lib/utils";

export interface QuizCardData {
  id: string;
  title: string;
  description?: string | null;
  question_count?: number | null;
  duration_minutes?: number | null;
  is_premium?: boolean | null;
  token_cost?: number | null;
  created_at?: string | null;
  attempt_count?: number | null;
  avg_rating?: number | null;
  course_code?: string | null;
  tutor?: {
    id?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    organisation_name?: string | null;
    organisation_logo_url?: string | null;
  } | null;
}

interface Props {
  quiz: QuizCardData;
  /** "compact-rich" = stacked rich list item, "full" = larger card */
  variant?: "compact-rich" | "full";
}

const isNew = (iso?: string | null) => {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
};

export function QuizCard({ quiz, variant = "compact-rich" }: Props) {
  const [open, setOpen] = useState(false);
  const t = quiz.tutor;
  const tutorName = t?.full_name || "Tutor";
  const showNew = isNew(quiz.created_at);

  return (
    <article
      className={cn(
        "group rounded-2xl border border-amber-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-amber-300 hover:shadow-md transition-all",
        variant === "full" ? "p-4" : "p-3.5",
      )}
    >
      {/* Top row: code + badges */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {quiz.course_code && (
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-amber-800">
            {quiz.course_code}
          </span>
        )}
        {showNew && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold">
            <Sparkles className="w-2.5 h-2.5" /> NEW
          </span>
        )}
        {quiz.is_premium && (quiz.token_cost ?? 0) > 0 && (
          <span className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-bold">
            {quiz.token_cost} tokens
          </span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <span className="shrink-0 h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
          <ClipboardList className="w-4.5 h-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-[14.5px] text-neutral-900 leading-snug line-clamp-2">
            {quiz.title}
          </h3>

          {/* Tutor row with org */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Link
              to={t?.id ? `/tutor/${t.id}` : "#"}
              className="flex items-center gap-1.5 min-w-0 hover:opacity-80"
              onClick={(e) => !t?.id && e.preventDefault()}
            >
              <TutorAvatar
                src={t?.avatar_url}
                name={tutorName}
                className="w-5 h-5"
                fallbackClassName="text-[9px]"
              />
              <span className="text-[11.5px] font-semibold text-neutral-700 truncate max-w-[14ch]">
                {tutorName}
              </span>
            </Link>
            <TutorOrgBadge
              name={t?.organisation_name}
              logoUrl={t?.organisation_logo_url}
              size="xs"
            />
          </div>

          {/* Meta strip */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <ClipboardList className="w-3 h-3" />
              {quiz.question_count ?? "—"} Qs
            </span>
            {quiz.duration_minutes ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {quiz.duration_minutes} min
              </span>
            ) : null}
            {(quiz.attempt_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {quiz.attempt_count}
              </span>
            )}
            {(quiz.avg_rating ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                ★ {(quiz.avg_rating ?? 0).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <Link
          to={`/quiz/${quiz.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-bold shadow-sm transition"
        >
          Start quiz <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        {quiz.description ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-amber-200 text-amber-800 text-[11px] font-semibold hover:bg-amber-50 transition"
          >
            Details
            <ChevronDown
              className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")}
            />
          </button>
        ) : null}
      </div>

      {/* Collapsible details */}
      <AnimatePresence initial={false}>
        {open && quiz.description && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-amber-100 space-y-2">
              <p className="text-[12px] text-neutral-600 leading-relaxed">
                {quiz.description}
              </p>
              {t?.id && (
                <Link
                  to={`/tutor/${t.id}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800"
                >
                  View tutor profile <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

export default QuizCard;
