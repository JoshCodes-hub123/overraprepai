# Fix 404 dead links + sticky splash loader

## What's actually broken

I traced every `"/student/..."` link in the codebase against the routes registered in `AnimatedRoutes.tsx`. Two paths are referenced from UI but **not registered** — they 404:

| Link in UI | Where | Registered? |
|---|---|---|
| `/student/challenges` | `HeroQuestCard` (7-Day Hero Quest on dashboard) | ❌ — page exists at `/challenges` only |
| `/student/weak-area-drill` | `PremiumQuickActions` Weak Areas button | ❌ — only `/student/weak/:courseId` (needs a course) exists |

The Challenges page itself (`src/pages/student/Challenges.tsx`) is already fully built — list, badges, enroll, claim. It's just unreachable from the dashboard CTA. Same story for the weak-area button.

The splash screen you screenshotted ("Hmm, that took a while… Reload app") is the pre-React boot fallback in `index.html`. It fires after 12s if React hasn't mounted, which on slow mobile networks happens **before** the first chunk finishes downloading — so reloading sometimes works (cache warms up) and sometimes shows the same screen again.

## Fixes

### 1. Register the missing routes (the real fix for the 404)

In `src/components/layout/AnimatedRoutes.tsx`, add aliases next to the existing entries:

```tsx
<Route path="/student/challenges" element={<PageTransition><Challenges /></PageTransition>} />
<Route path="/student/weak-area-drill" element={<PageTransition><MasteryBreakdown /></PageTransition>} />
```

`MasteryBreakdown` is the per-course weak-area picker, which is what the Quick Action implies. Keeps existing `/challenges` and `/student/weak/:courseId` working for any deep links.

### 2. Harden the boot splash so reloads recover reliably

Edit `index.html`:

- Bump `FALLBACK_MS` from **12 000 → 25 000** so flaky 3G/4G doesn't trip it on a healthy load.
- Change the Reload button to a cache-busted reload (`?_cb=Date.now()`) so a stuck/stale chunk gets re-requested from the server instead of being served from disk cache again.
- Add an automatic, **one-time** silent reload on real chunk errors before showing the fallback (mirror what `ErrorBoundary` already does), gated by `sessionStorage["overra_boot_reload_at"]` so we never loop.

### 3. Sweep — confirm nothing else 404s

I already diffed used vs registered `/student/*` paths; those two were the only mismatches. After applying step 1, no other student-area link points at a missing route.

## Files touched

- `src/components/layout/AnimatedRoutes.tsx` — 2 new `<Route>` aliases
- `index.html` — bump timeout, smarter reload, one-shot chunk-error reload

## Out of scope (explicitly)

- No changes to the Challenges page UI/logic — it's complete.
- No backend / migration work.
- No changes to the LeaderboardPage, ActivityFeed, badges modal — those are already wired.
