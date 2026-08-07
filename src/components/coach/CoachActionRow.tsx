import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CoachActionRowProps {
  icon: LucideIcon;
  label: string;
  hint?: string;
  /** Prompt sent straight into a new Overra conversation. */
  prompt: string;
  mode?: string;
  courseId?: string;
  topicId?: string;
}

/**
 * A large, single-tap academic action. Rows, not cards: quieter and easier to
 * hit one-handed on a 360px screen.
 */
export function CoachActionRow({
  icon: Icon,
  label,
  hint,
  prompt,
  mode,
  courseId,
  topicId,
}: CoachActionRowProps) {
  const navigate = useNavigate();

  const open = () => {
    const params = new URLSearchParams({ q: prompt });
    if (mode) params.set("mode", mode);
    if (courseId) params.set("course", courseId);
    if (topicId) params.set("topic", topicId);
    navigate(`/coach/chat?${params.toString()}`);
  };

  return (
    <button
      type="button"
      onClick={open}
      className="flex w-full min-h-[60px] items-center gap-3.5 rounded-brand border border-brand-line bg-brand-surface px-4 py-3.5 text-left transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-brand-sm bg-env-soft text-env">
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-brand-ink">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-[13px] text-brand-ink-soft">{hint}</span>}
      </span>
    </button>
  );
}

export default CoachActionRow;
