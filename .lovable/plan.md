# Phase 9 — Remaining Roadmap

Sub-Phase 9.1 is **DONE** (tutor/admin upload RLS fixes, signed URLs for private buckets, onboarding "Get Started" CTA fix, SmartSummary collapsible + copy + mobile polish, `audio_sessions` table groundwork).

Below is what's still pending, grouped into focused sub-phases. I will ship one at a time and stop for your sign-off between each.

---

## Sub-Phase 9.1b — Audio Learning refactor (NEXT)
Sections 7 + finish 8.

- New `AudioPlayerContext` + persistent `MiniPlayer` (portal, bottom of viewport, pause/skip 15s/close, survives navigation)
- Refactor `/audio` page: large artwork, 48px touch targets, waveform progress, playback-rate chip (0.75/1/1.25/1.5×), swipe-to-skip on mobile
- "Continue Listening" row backed by `audio_sessions` (auto-save position every 5s)
- Summary page: add export-to-PDF button (reuse `jsPDF`), final pass on 360/390/414px
- QA at 360 / 390 / 414 / 768px

## Sub-Phase 9.2 — Community Interaction + Opportunity Engagement
Sections 1 + 10 (engagement counts).

- New tables: `opportunity_comments`, `opportunity_reactions`, `material_comments` (lecture-note comments). Tutor-post comments reuse existing `community_post_comments`.
- Counters on `opportunities`: `view_count`, `comment_count`, `bookmark_count` (triggers).
- Threaded replies (1 level deep), emoji reactions (👍 ❤️ 🎯 💡 — 4 max, no spam).
- Realtime subscriptions on Opportunity Hub + Dashboard "Recent Opportunities" strip.
- Clean academic styling: muted borders, no avatars-on-avatars stacks, no infinite scroll noise.

## Sub-Phase 9.3 — 7-Day Challenges + Badges + Welcome Polish
Sections 2 + 3.

- Tables: `challenges` (admin-curated + seeded), `challenge_enrollments`, `challenge_progress`, `user_badges`, `badge_definitions`.
- Seeded set: Consistent Study (7d), Quiz Master (5 quizzes), Flashcard Champion (50 cards), Audio Learner (3 sessions), Early Revision (review before deadline).
- Admin page `/admin/challenges` (CRUD + activate/deactivate).
- Student `/challenges` page: enroll, progress ring, claim reward (tokens + badge).
- Auto-tracking triggers (quiz_attempts → quiz challenge, srs_reviews → flashcard, audio_sessions → audio).
- Subtle premium login welcome: streak chip + once-per-day soft confetti on streak milestones (3/7/14/30) — uses existing `canvas-confetti`, single burst, gold particles only.

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
