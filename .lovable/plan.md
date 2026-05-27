## Phase 9 — Sub-phasing strategy

Phase 9 is 12 sections of work. To go deep without shallow coverage, I'll ship it as 4 sub-phases. After each one I'll stop and ask you to approve the next.

```
Sub-Phase 9.1  →  Fix-first (urgent)         ← we build this now
Sub-Phase 9.2  →  Engagement (comments + challenges + welcome polish)
Sub-Phase 9.3  →  Academic core (Study Mode + Readiness + Smart reminders)
Sub-Phase 9.4  →  Future-standard (Planner, Countdown, Weakness AI, Mobile-first polish)
```

---

## Sub-Phase 9.1 — Scope (this build)

Covers Sections **5, 4, 7, 8** from your brief.

### 1. Section 5 — Tutor upload RLS + bucket alignment (CRITICAL)

Problem: tutor uploads fail with `new row violates row-level security policy`.

Root cause from the code:
- `TutorCourseEditor.tsx` uploads to `lecture-notes` and `course-images` buckets — these were originally admin-only buckets, so storage RLS rejects tutors.
- `useTutorCurricula.ts` uses `tutor-materials` (correct, scoped to tutor folder), but `TutorCourseEditor` (the course-resources flow students use) was never aligned.

Fix (migration + small code edit):
- Mirror the admin upload pattern for tutors: allow authenticated tutors (`has_role(auth.uid(),'tutor')`) to `INSERT/UPDATE/DELETE` in `lecture-notes` and `course-images` **only inside their own `tutor/{auth.uid()}/...` folder**. Public SELECT stays as is.
- Update `TutorCourseEditor.tsx` upload paths to prefix `tutor/${user.id}/...` so the storage policy passes.
- Audit & GRANT-check every public-schema table touched by tutor uploads (`tutor_curriculum_materials`, `course_resources`, etc.) — add missing `INSERT/UPDATE/DELETE` policies for tutors mirroring the admin policies, and the matching `GRANT`s.
- Run `supabase--linter` after the migration; fix any new warnings.

Result: tutors upload PDFs, notes, images, flashcards, quizzes under courses/topics exactly like admins do.

### 2. Section 4 — "I'm new / Get Started" fix

- Audit `MobileWelcome` + `OnboardingTour` + `QuickActions` "Quick Start" tile end-to-end.
- Repair broken CTAs: every button on the new-user path navigates somewhere meaningful (course picker → first study pack).
- Persist `profiles.onboarded_at` correctly so the tour doesn't re-trigger.
- First-time guidance overlay on Dashboard if `onboarded_at IS NULL`: 3-step coachmarks (Pick a course → Open a study pack → Try Overra AI). Uses existing `framer-motion` tour primitives.

### 3. Section 7 — Audio Learning polish (mobile-first)

Refactor `/audio` page only — no business-logic change to `text-to-speech` edge function:
- New sticky **MiniPlayer** that survives navigation (Context + portal), pause/skip/close.
- Restructure player card: large artwork-style header, larger touch targets (48px), waveform-style progress with scrubbing, 15s skip back/forward, playback-rate chip (0.75× / 1× / 1.25× / 1.5×).
- "Continue listening" row at the top, sourced from a new `audio_sessions` table (id, user_id, source_text_hash, voice, position_seconds, duration_seconds, title, updated_at).
- Mobile fit: vertical stack <640px, generous spacing, no horizontal overflow, safe-area padding.
- Swipe-left/right on player surface = prev/next track (touch handler, no extra dep).

### 4. Section 8 — Summary page polish (mobile-first)

- Audit `Summary.tsx` / summary panel: switch layout to single column on mobile, collapsible `<details>` sections per heading, copy + export-to-PDF buttons in the action bar (reuse `jsPDF`).
- Typography pass: `prose` sizing tuned for 360–414px viewports, line-height 1.6, generous bottom padding.
- Stop overflow: replace any fixed-width tables/code with horizontal scroll containers.

---

## What this sub-phase does NOT touch

To keep the build deep and safe, these wait for later sub-phases:
- Comments / opportunity engagement → 9.2
- 7-day challenges + badges → 9.2
- Welcome confetti / dopamine motion → 9.2
- AI Study Mode + Readiness exam → 9.3
- Smart engagement reminders → 9.3
- Activity metrics, AI Planner, Exam Countdown, Weakness AI, mobile-app polish pass → 9.4

---

## Files I expect to touch in 9.1

Code:
- `src/pages/tutor/TutorCourseEditor.tsx` (upload path prefix)
- `src/pages/student/MobileWelcome.tsx`, `src/components/onboarding/OnboardingTour.tsx` (Get Started)
- `src/pages/Audio.tsx` (or `AudioLearning.tsx`) + new `src/components/audio/MiniPlayer.tsx`, `AudioPlayerContext.tsx`
- `src/pages/Summary.tsx` / summary components
- `src/App.tsx` (mount MiniPlayer provider)

Database (one migration):
- Storage policies for `lecture-notes` and `course-images` (tutor write inside `tutor/{uid}/`)
- New `audio_sessions` table + RLS + GRANTs
- Any missing tutor INSERT/UPDATE/DELETE policies on curriculum tables

---

## Acceptance checklist for 9.1

- [ ] Tutor can upload a PDF to a course topic without RLS error, and student sees it.
- [ ] Brand-new user lands on Dashboard, sees 3-step coachmarks, and every CTA navigates correctly.
- [ ] Audio page passes mobile QA at 360 / 390 / 414 px — no overflow, MiniPlayer persists across routes, position resumes.
- [ ] Summary page is single-column, collapsible, copy + export work, no horizontal scroll.
- [ ] `supabase--linter` reports no new warnings introduced by the migration.

After this ships and you confirm, I'll ask you to approve **Sub-Phase 9.2 — Engagement** (comments + opportunity activity + 7-day challenges + welcome dopamine).
