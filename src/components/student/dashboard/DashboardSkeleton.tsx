/**
 * Lightweight, paint-fast skeleton shown while the StudentDashboard
 * chunk (or its data) is still loading. Pure CSS — no JS work, no
 * network — so it appears on the first frame after navigation.
 */
export const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <main className="container mx-auto px-4 pt-5 sm:pt-7 max-w-3xl animate-pulse">
        {/* Greeting row */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-amber-100/70" />
            <div className="h-6 w-2/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted/70" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-muted" />
            <div className="h-9 w-9 rounded-full bg-muted" />
          </div>
        </div>

        {/* Hero */}
        <div className="h-36 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-100" />

        {/* Quick actions grid */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted" />
          ))}
        </div>

        {/* Continue learning */}
        <div className="mt-6 space-y-3">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
        </div>
      </main>
    </div>
  );
};

export default DashboardSkeleton;