import { Search } from "lucide-react";

/**
 * A premium, rounded search entry. Tapping it opens the existing command
 * palette so there is only ever one search implementation in the app.
 */
export function DashboardSearch({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-brand-line bg-brand-soft px-4 py-4 text-left transition-colors hover:bg-brand-gold-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env"
      aria-label="Search courses, topics and materials"
    >
      <Search className="h-5 w-5 shrink-0 text-brand-ink-soft" aria-hidden />
      <span className="flex-1 truncate text-[14px] text-brand-ink-soft">
        Search courses, topics, materials…
      </span>
      <kbd className="hidden rounded-lg border border-brand-line bg-brand-surface px-2 py-0.5 text-[11px] font-semibold text-brand-ink-soft/80 sm:block">
        ⌘K
      </kbd>
    </button>
  );
}

export default DashboardSearch;
