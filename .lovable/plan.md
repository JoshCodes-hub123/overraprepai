## Goal
Knock out 9 connected asks without bloating the app. Two blockers first (upload RLS + Startup Check), then UI restructure, gamification, community wall.

## 1. Fix course-document upload (BLOCKER)
Symptom: `new row violates row-level security policy` on Manage → Documents.
Cause: `lecture_notes` INSERT + `storage.objects` (`lecture-notes` bucket) INSERT both require `has_role(auth.uid(),'tutor'|'admin')`. Tutors approved before the role-grant flow existed have no `user_roles` row, so they fail silently.
Fix (one migration):
- Backfill `INSERT INTO user_roles (user_id,'tutor') ... FROM tutor_applications WHERE status='approved'` on conflict do nothing.
- Broaden both INSERT policies: also accept "user is the course's `created_by`" so any course owner can upload regardless of role-cache state.
- Same broadening applied to `quizzes`, `flashcards`, `course_images` so all four Manage tabs work.

## 2. Fix Startup Check
- Edge fn `startup-check` currently calls `auth.getClaims(token)` (wrong arg). Replace with the shared `requireUser()` helper, then check admin via `user_roles`.
- Client: only invoke after `isAdmin === true`; surface server error in the alert.

## 3. Dashboard restructured by functionality hierarchy (UI only)
Same components, re-ordered + grouped by "what students actually do first":
1. TopHeader (greeting + streak + bell + tokens)
2. **HERO row** — `StudyPackHero` (the one big AI entry point)
3. **TODAY row** — `DailyMomentumStrip` (new): streak flame · XP today · Hero Quest dots · readiness %
4. **CONTINUE row** — `PickUpWhereYouLeftOff` + `ContinueLearning`
5. **POWER FEATURES row** — `KeyFeaturesStrip` redesigned as 3 large gradient cards (Overra AI · Study Hub · Theory Prep) — the "amazing features" the user wants visible
6. **QUICK ACTIONS** — bento (already good, slight polish)
7. **EXAM CARD** — `ExamCountdownCard`
8. **COMMUNITY + OPPORTUNITY + SPOTLIGHT** — kept, but under a single "Beyond study" section header so the page stops feeling flat
9. Profile completion nudge moved to bottom (only renders when needed)
Add reusable `<DashboardSectionHeader kicker title cta>` so the page reads like a magazine, plus subtle gold divider bands between groups.

## 4. Global Community Wall
- New page `/community` (replace current discussion list as the default tab) — a single global feed where any signed-in student in the same university can post text/image, like, and reply. No "start a discussion" gate.
- Realtime via Supabase `community_posts` + `community_post_likes` + `community_post_replies` (single new migration with GRANTs + RLS scoped by `university_id`).
- Existing structured community/team pages remain at `/community/teams` etc.
- Look: large hero "FUTA is talking…" header, post composer pinned top (auto-grow textarea, image attach), infinite scroll, gold accents, soft motion on new posts.

## 5. Comments under every opportunity section
- Reuse `OpportunityComments` pattern. Generalise into `EntityComments({entity_type, entity_id})` backed by new `entity_comments` table (RLS: anyone authenticated reads, only author edits/deletes, admins moderate).
- Drop it under: each opportunity section/sub-tab, announcements detail, spotlight detail, fresh-courses preview. One component, many mounts.

## 6. 7-Day Hero Quest (gamified weekly loop)
- Migration: `weekly_quests` (auto-generated per user every Monday) with 7 daily goals (quiz, flashcard, audio, theory, review, share, login). `weekly_quest_progress` row per goal.
- Cron edge fn `weekly-quest-reset` (Mon 00:00 UTC) — uses `pg_cron` row or `supabase functions schedule`.
- `HeroQuestCard` on dashboard: 7 glowing dots, day name, "Be the hero of your week" copy. Completing day 7 → animated cape + adds "Hero of the Week" badge to existing `badges` table → confetti.
- New `/student/quest` page with detail + history.

## 7. Login celebration (dopamine)
- `LoginCelebration` overlay fired once per session by `AuthProvider` post-signin:
  - Confetti gold burst (reuse `celebrateGold`)
  - Big animated "Welcome back, {firstName} 🔥 Day {streak}!"
  - Auto-dismiss 1.4s, reduced-motion respected
- First login of the day → richer burst + "+10 XP daily login" toast (writes to existing xp table) + haptic on native.
- Streak-day milestones (3, 7, 14, 30) trigger a unique medal animation.

## 8. Study Mode → AI Readiness Exam
- `StudyMode.tsx` already exists; expose it from `CourseHub` as a new "Study Mode" tab scoped to that course.
- Flow: read materials → "I'm ready, test me" CTA → calls existing `readiness-exam-generate` → 10 mixed Qs in CBT-style runner → `readiness-exam-grade` returns score + topic breakdown + AI feedback.
- Persist to `readiness_attempts` so `ExamCountdownCard` and the new DailyMomentumStrip can show "Course readiness: 78%".

## 9. "I'm New — Get Started" works end-to-end
- Audit `/start/persona → /start/path → /start/university → /start/faculty → /start/department → /start/level → /start/product` chain.
- Fix any dead-end (saving partial choices to `localStorage` + `profiles` on each step so a refresh resumes).
- Final step → routes straight to `/student/dashboard` with `onboardingComplete=true`, triggering the login celebration.

## Out of scope (call out)
- No new payment tiers, no new AI models, no LiveKit changes.
- Existing pages (challenges, leaderboards, badges, referrals) reused — not rebuilt.

## Technical summary
- Migrations: (a) RLS fix + role backfill for `lecture_notes`/`quizzes`/`flashcards`/`course_images` + storage `lecture-notes` bucket; (b) `weekly_quests` + `weekly_quest_progress`; (c) `entity_comments`; (d) `community_posts` + `community_post_likes` + `community_post_replies` with realtime + GRANTs.
- Edge fns: fix `startup-check` auth; new `weekly-quest-reset` cron.
- Frontend additions: `DashboardSectionHeader`, `DailyMomentumStrip`, `HeroQuestCard`, `LoginCelebration`, `EntityComments`, `CommunityWall`, `CourseHub` Study Mode tab, restructured `StudentDashboard` order.
- Frontend edits: `KeyFeaturesStrip` (3 hero gradient cards), `QuickActionsGrid` (subtle polish), `Ambassadors`/start flow audit.

Approve to build, or want me to split into Build A (blockers 1+2 + dashboard restructure 3) and Build B (community + gamification + study mode)?