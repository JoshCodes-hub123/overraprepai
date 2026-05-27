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

## Sub-Phase 9.4 — AI Study Mode + Readiness Exam (DONE)
Shipped:
- Tables: `readiness_exams`, `readiness_attempts`, `weakness_signals` (+ GRANT + RLS, user-scoped)
- Trigger `fanout_readiness_weaknesses` fans out missed topics from each completed attempt into `weakness_signals` (miss_count bumped on conflict)
- Edge functions: `readiness-exam-generate` (pulls public study_materials + tutor curriculum content_text, asks Gemini 3 Flash for 10 MCQs with per-question `topic`, persists exam, returns sanitized client copy) and `readiness-exam-grade` (computes readiness %, strengths, top-5 weaknesses, AI-curated 3 recommendations with safe fallback)
- New route `/study-mode/:courseId`: Study tab (links to Course Hub / Study Hub / PQ Intelligence + Start exam CTA) → Readiness tab (sticky submit bar, gold-accented option buttons) → Results tab (readiness % with tone verdict, focus topics, strengths chips, AI study plan)
- `ExamCountdownCard` (driven by active `exam_goals` row) added to Dashboard above key features; surfaces top 3 weakness chips when present, links to `/exams`
- `useReadiness.ts` hooks: latest attempt, weakness signals, active exam goal

Deferred: weekly AI Planner generation reusing `exam_readiness_suite` (existing suite already covers this), and a cross-source weakness aggregator from `quiz_attempts` (current dashboard widget already reads `weakness_signals` populated by readiness attempts).

## Sub-Phase 9.5 — Smart Reminders + Mobile Polish + Activity Metrics
Shipped:
- New `PickUpWhereYouLeftOff` card on the Student Dashboard (above Key Features). Surfaces the most recent unfinished audio session (only when >10s played and <95% done) and the most recent in-progress `quiz_attempt`. Two-tile layout with gold (audio → `/audio-learning`) and emerald (quiz → `/quiz/:id`) tones; component renders nothing when both are empty so the dashboard stays calm.

Deferred (already covered or out of scope for now):
- Daily reminder cron — existing `streak-reminders` edge function already covers this with one-per-day cadence based on `study_streaks`.
- Mobile polish pass — Phase 9 dashboards already use safe-area insets (`pb-24 md:pb-12`), `PullToRefresh`, and consistent skeletons; no concrete regressions left to address.
- Material/opportunity view-tracking widget — opportunities already track views via 9.2; tutor-side aggregation for study materials needs a separate counter migration and was descoped to keep the surface uncluttered.

---

## Technical guardrails (all sub-phases)
- Every new `public` table: `GRANT` + RLS in same migration.
- Realtime tables explicitly added to `supabase_realtime` publication.
- All AI calls via existing `ai-chat` / `ai-quiz-generator` edge fns + Lovable AI Gateway (no new API keys).
- No new heavy libs — reuse `framer-motion`, `canvas-confetti`, `jsPDF`, `pdfjs-dist`.
- Run `supabase--linter` after every migration.

## What I need from you
Confirm to proceed with **Sub-Phase 9.1b — Audio refactor + MiniPlayer + Continue Listening + Summary PDF export**, or tell me to jump to a different sub-phase first.
