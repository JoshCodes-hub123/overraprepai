## 1. Fix missing student role after university pick

**Cause:** `handle_new_user` trigger inserts a `student` row in `user_roles`, but some older accounts (created before the trigger, or where the trigger errored on referral lookup) reach `ChooseUniversity` without a role. `useAuth` papers over it client-side (falls back to `["student"]`) but no row exists in DB, so RLS-gated reads (favorites, bookmarks, leaderboards) silently fail.

**Fix:** in `src/pages/onboarding/ChooseUniversity.tsx`, when the user picks a university, also defensively upsert a `student` row:
```ts
await supabase.from("user_roles").upsert(
  { user_id: user.id, role: "student" },
  { onConflict: "user_id,role", ignoreDuplicates: true }
);
```
Runs alongside the profile update. Idempotent — no-op for users who already have the role. No migration needed.

## 2. Redesign the student dashboard — simple, beautiful, calm

New order on `/student/dashboard` (5 blocks, nothing else):

```text
┌─────────────────────────────────────┐
│  TopHeader  (greeting · streak · 🔔) │
├─────────────────────────────────────┤
│         SolutionHub (hero)          │   3 gold tiles: Quiz · Summarize · AI Tutor
├─────────────────────────────────────┤
│   Quizzes from your courses         │   CourseQuizzesSection (rich QuizCards)
├─────────────────────────────────────┤
│   Today  (one primary CTA)          │
├─────────────────────────────────────┤
│   7-day Hero Quest                  │
└─────────────────────────────────────┘
```

**Removed from dashboard:** `TokenBalanceCard`, `ExamCountdownCard` (countdown is already visible inside Quest + Today; keeps the page calm).

**Polish pass (presentation only, semantic tokens, no new deps):**
- Tighter vertical rhythm: consistent `space-y-4` between blocks, `pt-5` at top.
- Section eyebrow labels (uppercase, tracked) above SolutionHub and CourseQuizzes so blocks read as separate "rooms".
- SolutionHub: slightly larger touch targets on mobile, gentle stagger entrance, gold-on-white only (matches locked palette).
- Soft divider line (`border-t border-amber-100/50`) between SolutionHub and CourseQuizzes.

## 3. Move wallet/tokens to the Me hub

- Replace the existing plain "Wallet" tile inside `MeHubPage` with the full `TokenBalanceCard` rendered at the top of the page (above the section tiles). Same component, same data, just relocated.
- Keep the "Wallet" tile in the Account section as a deep link to `/wallet` for top-ups (so the card + the tile coexist — card for at-a-glance, tile for action).

## Files

**Edit**
- `src/pages/onboarding/ChooseUniversity.tsx` — upsert student role on pick
- `src/pages/student/StudentDashboard.tsx` — remove `TokenBalanceCard` + `ExamCountdownCard` imports/usage, add section eyebrows, tighten spacing
- `src/pages/hubs/MeHubPage.tsx` — render `<TokenBalanceCard />` at the top

**No new files. No migrations. No business-logic changes** (token economy, paywall, free-uses behavior all untouched — only where the card is displayed changes).

## Out of scope
- Restructuring tutor dashboard (already done in earlier turn)
- Wallet logic, paywall, free-uses
- Onboarding flow beyond the role-upsert defensive fix
