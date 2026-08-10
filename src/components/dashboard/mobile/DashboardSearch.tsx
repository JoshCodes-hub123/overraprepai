import { Search } from "lucide-react";

/**
 * A quiet, single-line search entry. Tapping it opens the existing command
 * palette so there is only ever one search implementation in the app.
 */
export function DashboardSearch({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-brand border border-brand-line bg-brand-surface px-4 py-3 text-left transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env"
      aria-label="Search courses, topics and materials"
    >
      <Search className="h-4.5 w-4.5 shrink-0 text-brand-ink-soft" aria-hidden />
      <span className="flex-1 truncate text-[14px] text-brand-ink-soft">
        Search courses, topics, materials…
      </span>
      <kbd className="hidden rounded-brand-sm border border-brand-line px-1.5 py-0.5 text-[11px] font-semibold text-brand-ink-soft/80 sm:block">
        ⌘K
      </kbd>
    </button>
  );
}

export default DashboardSearch;
