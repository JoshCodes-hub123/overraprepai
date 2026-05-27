# Phase 9 — Remaining Roadmap

Sub-Phase 9.1 is **DONE** (tutor/admin upload RLS fixes, signed URLs for private buckets, onboarding "Get Started" CTA fix, SmartSummary collapsible + copy + mobile polish, `audio_sessions` table groundwork).

Below is what's still pending, grouped into focused sub-phases. I will ship one at a time and stop for your sign-off between each.

---

## Sub-Phase 9.1b — Audio Learning refactor (DONE)
Audited existing audio stack — most pieces already shipped:
- `MiniPlayerBar` portal (mounted in `App.tsx`) — pause/seek/close, survives navigation ✅
- `AudioPlayerCard` (664 LOC) — large artwork, waveform, voice/speed/ambient sheets, bookmarks ✅
- Summary PDF export via `exportSummaryPdf` already wired in both `AudioLearning.tsx` and `SmartSummary.tsx` ✅
- Added in this sub-phase: `src/lib/audioSessions.ts` helpers + `globalAudio.ts` now upserts position every 5s + on pause/end → `audio_sessions` table is now actively populated for future Continue Listening features.

## Sub-Phase 9.2 — Opportunity Engagement (DONE)
Shipped:
- Migration: `view_count` / `comment_count` / `bookmark_count` counter columns on `opportunities`, auto-bumped via triggers
- `opportunity_comments` table — threaded (1-level reply), RLS scoped to author + admin delete
- `opportunity_reactions` table — 1 emoji per user per opp (👍 ❤️ 🎯 💡)
- RPC `increment_opportunity_view` + per-session dedup in `trackOpportunityView`
- Realtime publication added for comments + reactions + bookmarks
- Components: `OpportunityComments`, `OpportunityEngagementBar` wired into `OpportunityDetail`
- `useOpportunitiesRealtime` invalidator on the Hub list

Deferred to a later pass: material_comments (lecture-note threads) — tutor-post comments already exist via `community_post_comments`.

## Sub-Phase 9.3 — 7-Day Challenges + Badges + Welcome Polish (DONE)
Shipped:
- Tables: `challenges`, `challenge_enrollments`, `challenge_progress`, `user_badges`, `badge_definitions` (+ GRANT + RLS)
- Seeded 5 challenges + 5 matching badges (Consistent Scholar / Quiz Master / Flashcard Champion / Audio Learner / Early Reviser)
- Auto-tracking triggers wired: `quiz_attempts` → quizzes + study_days, `srs_reviews` → flashcards, `audio_sessions` → audio_sessions
- SECURITY DEFINER RPC `bump_challenge_progress` clamps to `goal_target` + marks `completed`
- New route `/challenges` (student): enroll, progress bar, claim reward (token amount shown, badge awarded into `user_badges`), gold confetti burst on claim
- New route `/admin/challenges`: full CRUD, activate/pause toggle
- Streak chip in mobile greeting now taps to `/challenges` and fires a subtle gold confetti once per day on milestone streaks (3/7/14/30/60/100) via new `src/lib/celebrate.ts` (`canvas-confetti`, respects `prefers-reduced-motion`)

## Sub-Phase 9.4 — AI Study Mode + Readiness Exam
Section 6 + Section 11 (AI Planner, Exam Countdown, Weakness Detection).

- New route `/study-mode/:courseId`: Study tab (materials) → Readiness tab (AI-generated 10-Q exam from course materials via Gemini) → Results tab (strengths, weak topics, recommendations, readiness %).
- Tables: `readiness_exams`, `readiness_attempts`, `weakness_signals`.
- AI Planner: weekly plan generation per course (reuses `exam_readiness_suite`).
- Exam Countdown widget on Dashboard (driven by `courses.exam_date`).
- Weakness Detection: aggregate from quiz_attempts + readiness_attempts, surface top-3 weak topics on dashboard.

## Sub-Phase 9.5 — Smart Reminders + Mobile Polish + Activity Metrics
Sections 9 + 10 (rest) + 12.

- Daily reminder edge function (cron) using existing `notification_preferences` — non-spammy: max 1/day, only if user idle >24h.
- "Continue where you stopped" card on Dashboard from latest `audio_sessions` / unfinished `quiz_attempts` / open SRS deck.
- Mobile polish pass: page transitions tuned, larger touch targets on Dashboard tiles, safe-area insets, skeleton loaders standardized.
- Material/opportunity view tracking → tutor analytics dashboard widget.

---

## Technical guardrails (all sub-phases)
- Every new `public` table: `GRANT` + RLS in same migration.
- Realtime tables explicitly added to `supabase_realtime` publication.
- All AI calls via existing `ai-chat` / `ai-quiz-generator` edge fns + Lovable AI Gateway (no new API keys).
- No new heavy libs — reuse `framer-motion`, `canvas-confetti`, `jsPDF`, `pdfjs-dist`.
- Run `supabase--linter` after every migration.

## What I need from you
Confirm to proceed with **Sub-Phase 9.1b — Audio refactor + MiniPlayer + Continue Listening + Summary PDF export**, or tell me to jump to a different sub-phase first.
