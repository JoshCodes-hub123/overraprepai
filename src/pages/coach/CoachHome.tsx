import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  Lightbulb,
  MessageSquarePlus,
  NotebookPen,
  Timer,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useCoachContext } from "@/hooks/useCoachContext";
import { useAITutorThreads } from "@/hooks/useAITutorThreads";
import { CoachActionRow } from "@/components/coach/CoachActionRow";
import overraMark from "@/assets/overra-coach-mark.png";

/**
 * Overra AI — the coach home. A calm entry point: who Overra is talking to,
 * what they can ask for, and their recent conversations. No chrome, no noise.
 */
const CoachHome = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { contextLine, suggestions } = useCoachContext();
  const { threads, loading } = useAITutorThreads();

  const firstName = useMemo(() => {
    const n = (profile as any)?.full_name || (profile as any)?.username || "";
    return String(n).trim().split(" ")[0] || "there";
  }, [profile]);

  const recent = threads.filter((t) => t.last_message_preview).slice(0, 4);

  return (
    <>
      <SEO
        title="Overra AI — Your academic companion"
        description="Ask Overra to explain topics, quiz you, and plan your study around your real courses."
        noindex
      />
      <div
        className="min-h-screen bg-brand-surface pb-28 text-brand-ink"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
      >
        <div className="mx-auto w-full max-w-2xl px-5">
          {/* Identity */}
          <header className="flex items-start gap-3.5">
            <img
              src={overraMark}
              alt=""
              aria-hidden
              className="h-11 w-11 shrink-0 rounded-brand-sm object-cover"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-bold leading-tight tracking-tight text-brand-ink">
                Hi {firstName}, what are we studying?
              </h1>
              {contextLine && (
                <p className="mt-1 truncate text-[13px] text-brand-ink-soft">{contextLine}</p>
              )}
            </div>
          </header>

          {/* Primary ask */}
          <button
            type="button"
            onClick={() => navigate("/coach/chat")}
            className="mt-5 flex w-full items-center gap-3 rounded-brand border border-brand-line bg-brand-soft px-4 py-3.5 text-left"
          >
            <MessageSquarePlus className="h-4.5 w-4.5 shrink-0 text-env" aria-hidden />
            <span className="flex-1 text-[15px] text-brand-ink-soft">Ask Overra anything…</span>
            <ChevronRight className="h-4 w-4 text-brand-ink-soft" aria-hidden />
          </button>

          {/* Quick academic actions */}
          <section className="mt-6" aria-labelledby="coach-actions">
            <h2
              id="coach-actions"
              className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-brand-ink-soft"
            >
              Study with Overra
            </h2>
            <div className="space-y-2">
              <CoachActionRow
                icon={Lightbulb}
                label="Explain a topic"
                hint="Broken down simply, step by step"
                mode="explain"
                prompt="Explain a topic to me simply. Ask me which topic first."
              />
              <CoachActionRow
                icon={ClipboardList}
                label="Practice questions"
                hint="Exam-style, one at a time"
                mode="practice"
                prompt="Give me practice questions. Ask me the topic first."
              />
              <CoachActionRow
                icon={Timer}
                label="Test me"
                hint="Quick timed check of what you know"
                mode="test"
                prompt="Test me on a topic of my choice. Ask me the topic, then quiz me one question at a time."
              />
              <CoachActionRow
                icon={NotebookPen}
                label="Summarise my notes"
                hint="Turn long notes into key points"
                mode="summary"
                prompt="I'll paste some notes. Summarise them into key points I can revise."
              />
              <CoachActionRow
                icon={BookOpen}
                label="Plan my revision"
                hint="A realistic plan for this week"
                mode="revision"
                prompt="Help me plan my revision for this week around my courses."
              />
            </div>
          </section>

          {/* Suggestions built from the student's real courses and topics */}
          {suggestions.length > 0 && (
            <section className="mt-7" aria-labelledby="coach-suggested">
              <h2
                id="coach-suggested"
                className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-brand-ink-soft"
              >
                Based on your courses
              </h2>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <button
                    key={`${s.scope}-${s.label}`}
                    type="button"
                    onClick={() => {
                      const p = new URLSearchParams({ q: s.prompt });
                      if (s.courseId) p.set("course", s.courseId);
                      if (s.topicId) p.set("topic", s.topicId);
                      navigate(`/coach/chat?${p.toString()}`);
                    }}
                    className="w-full rounded-brand border border-brand-line bg-brand-surface px-4 py-3 text-left hover:bg-brand-soft"
                  >
                    <span className="block text-[11.5px] font-bold uppercase tracking-[0.14em] text-env">
                      {s.scope}
                      {s.topic ? ` · ${s.topic}` : ""}
                    </span>
                    <span className="mt-1 block text-[14.5px] font-medium text-brand-ink">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Recent conversations */}
          {!loading && recent.length > 0 && (
            <section className="mt-7" aria-labelledby="coach-recent">
              <h2
                id="coach-recent"
                className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-brand-ink-soft"
              >
                Recent
              </h2>
              <div className="divide-y divide-brand-line overflow-hidden rounded-brand border border-brand-line">
                {recent.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/coach/chat/${t.id}`)}
                    className="flex w-full items-center gap-3 bg-brand-surface px-4 py-3 text-left hover:bg-brand-soft"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-brand-ink">
                        {t.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-brand-ink-soft">
                        {t.last_message_preview}
                      </span>
                    </span>
                    {t.last_message_at && (
                      <span className="shrink-0 text-[11.5px] text-brand-ink-soft">
                        {formatDistanceToNowStrict(new Date(t.last_message_at), {
                          addSuffix: false,
                        })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default CoachHome;
