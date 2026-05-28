## 1. Remove the "Welcome back / Let's make today legendary" overlay
- Delete `src/components/auth/LoginCelebration.tsx`.
- Remove its import + `<LoginCelebration />` mount from `src/App.tsx`.
- Stop setting the `overra_fresh_login` flag in `useAuth` (search & clean) so nothing else can trigger it.

## 2. 404 / Error → always a "Back home" button
- `NotFound.tsx` already has it — leave as is.
- `RouteErrorBoundary.tsx` chunk-error branch only shows **Reload**; add a secondary **Go home** button under it so users are never trapped.
- Add the same Home button to the top-level `ErrorBoundary.tsx` fallback (currently has reload-only — verify and add).

## 3. Complete the Challenges system
Tables (`challenges`, `challenge_enrollments`, `challenge_progress`, `badge_definitions`, `user_badges`) and progress triggers (`trg_quiz_attempt_to_challenge`, `trg_audio_session_to_challenge`, `trg_srs_review_to_challenge`, `bump_challenge_progress`, `claim_challenge_reward`) already exist but **no rows are seeded** — so `/student/challenges` shows "No challenges available yet".

- **Seed `badge_definitions`** (8 badges, bronze→gold): `consistent-learner`, `quiz-master`, `flashcard-pro`, `night-owl`, `social-butterfly`, `streak-legend`, `top-10`, `champion`.
- **Seed `challenges`** (6 active weekly): e.g. *Answer 50 questions*, *Review 100 flashcards*, *7-day streak*, *5 AI study sessions*, *Listen to 3 audio summaries*, *Score 80%+ on 3 quizzes*. Each links to a badge slug + token reward (10–40).
- Verify the existing triggers wire to the right tables (quiz_attempts, audio_sessions, srs_cards). If a trigger is missing for any seeded `goal_type`, add a thin RPC `bump_challenge_progress(_goal_type, _delta)` call from the relevant React Query mutation as a fallback.
- Polish `Challenges.tsx`: show "X completed / Y active / Z claimed" stat strip above the list, and a "How it works" collapsible.

## 4. Complete the Leaderboard with rank-of-me
- `get_student_leaderboard` already scores by accuracy + cards + streak + AI activity + engagement. Keep it.
- Add a new RPC `get_my_leaderboard_rank(_user uuid)` returning `{ rank, total, score, percentile, badge_tier }` so a user can see their own number even if outside top 20.
- Add a "You" sticky row at the bottom of `Leaderboard.tsx` showing the caller's rank + score + computed badge tier (Bronze < 30, Silver 30–60, Gold 60–80, Diamond 80+).
- Activity-tier helper `src/lib/activityBadge.ts` (pure function) → `{ tier, label, color, icon }` reused by header + leaderboard so they never drift.

## 5. Surface rank + activity badge in the Dashboard header
- New hook `useMyActivityBadge()` → calls `get_my_leaderboard_rank`, returns `{ rank, total, tier, label }`, `staleTime: 5min`.
- In `MobileGreetingHeader.tsx`, add a compact pill to the right cluster (between streak and bell): `#{rank} · {tier}` with the tier icon (Crown/Medal/Award/Star) and gradient by tier. Tap → `/leaderboard`.
- In desktop `DashboardHero` (or its header strip), show the same badge inline next to the user's name.

## 6. Technical notes
- All DB changes via one migration (seeds + new RPC). Seeds use `INSERT … ON CONFLICT (slug) DO NOTHING` so re-running is safe.
- RPC signatures:
  - `public.get_my_leaderboard_rank(_user uuid) RETURNS TABLE(rank int, total int, score numeric, percentile int)` — `STABLE SECURITY DEFINER`, scopes to same 30-day window as `get_student_leaderboard`.
- Badge tier thresholds and colors live in `src/lib/activityBadge.ts` only; no duplicated logic.
- No new tables → no new RLS work; `badge_definitions` already public-readable.
- Keep visuals on the locked White + Gold + Inter palette (no navy).

```text
Header (mobile)
┌────────────────────────────────────────────────┐
│ [avatar]  Good morning,             [#12 ★Gold] [🔔]
│           Welcome back, Tope                    │
│           Let's make today productive.          │
│  🔥 On a 7-day study streak!                    │
└────────────────────────────────────────────────┘
```

## Out of scope
- Tutor leaderboard (already done) — no change.
- Team challenges — already done; only adding the self-rank for the student tab.
