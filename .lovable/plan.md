## Goal

Three intertwined fixes:
1. **Student dashboard is solution-first** — quizzes, AI document summary, and AI tutor are the very first thing every student sees.
2. **Every quiz looks like a product** — rich, attractive, well-described card with the tutor's face, name, and organisation badge.
3. **Tutors carry their organisation everywhere** — free-text org name + logo on their profile, surfaced on quiz cards and tutor pages, kept off noisy surfaces to stay clean.

No clutter. No new tabs piled on. Existing pieces get re-ordered, re-skinned, and lightly extended.

---

## 1. Solution Hub on the dashboard (top of `StudentDashboard.tsx`)

New order on `/student/dashboard`:

```text
1. TopHeader (greeting + streak + bell)              [unchanged]
2. SolutionHub  ← NEW, the hero
3. CourseQuizzesSection  ← promoted from hubs into Home
4. TokenBalanceCard                                  [moved down]
5. TodayCard
6. HeroQuestCard
7. ExamCountdownCard
```

### New component: `src/components/student/dashboard/SolutionHub.tsx`
A single block titled **"What do you want to do?"** with 3 large gold-bordered tiles:

- **Take a Quiz** → `/courses` (primary, biggest, gold-filled). Subtext: "Practice past questions with instant AI explanations." Live badge: `{N} new quizzes this week` from `quizzes.created_at`.
- **Summarize a Document** → `/library` (Personal Library upload + AI summary). Subtext: "Upload notes or a PDF — get the key points in seconds."
- **Ask AI Tutor** → `/ai-tutor`. Subtext: "Stuck on a topic? Get a step-by-step walkthrough."

Each tile: icon in a soft amber chip, bold title, one-line subtext, "Open →" affordance. Mobile = stacked, desktop = 3-col grid. Uses existing semantic tokens (no raw colors).

### Promote `CourseQuizzesSection`
Already exists and is great — just import it into `StudentDashboard.tsx` directly under SolutionHub so quizzes for the student's own courses are immediately visible without a tab switch.

---

## 2. Rich quiz cards (collapsible)

### New component: `src/components/quiz/QuizCard.tsx`
One shared card used by `CourseQuizzesSection`, course `CourseHub` quizzes tab, and Browse views.

**Always visible (rich top):**
- Course code chip (gold outline) · difficulty pill · "NEW" badge if `created_at` within 7 days
- Big title (font-display, 2-line clamp)
- Tutor row: `TutorAvatar` (32px) + tutor name + **org badge** (small pill with org logo + org name, falls back to text-only if no logo)
- Meta strip: `{question_count} questions · {duration_minutes} min · {attempts} taken · ⭐ {avg_rating}`
- Primary **Start** button (amber, full width on mobile) + secondary "Preview" link

**Collapsible "More details" (chevron toggle):**
- Quiz description (`quizzes.description`)
- Topics covered (first 5 from `quiz_questions.topic` distinct) as chips
- Tutor bio one-liner + "View tutor →" link to `/tutor/{tutor_id}` public profile
- Last attempt summary if the student has one (score + date)

Animation: framer-motion height auto, ease-out 180ms. State is local (per card). No layout shift in surrounding list.

### Wire-up
- `CourseQuizzesSection.tsx` — replace the inline `<li>` list with `<QuizCard variant="compact-rich" />`. Query is extended to also pull `description`, `tutor_id`, and the tutor join (name, avatar_url, organisation_name, organisation_logo_url).
- `pages/courses/CourseHub.tsx` quizzes tab — same component, `variant="full"`.
- `pages/tutor/BrowseTutors.tsx` — unchanged for now (already polished), but the tutor card now also shows the org badge.

---

## 3. Tutor organisation + picture

### Schema
Add two columns to `profiles`:
- `organisation_name TEXT` (free-text, nullable)
- `organisation_logo_url TEXT` (nullable, public URL in existing `tutor-profiles` bucket)

No new table — keeps it simple per your "free-text + logo" pick. No admin curation required.

### Tutor edit screen (`pages/profile/EditProfile.tsx` tutor section, or `pages/tutor/TutorOnboarding.tsx` if that's where tutors edit their public info — will detect and use the right one)
Add a **"Your organisation"** card:
- Text input: "Organisation name" (e.g. "FUTA · Mechanical Engineering", "TopRank Tutors", "Independent")
- Logo uploader: drag-drop, 1MB max, square, uploaded to `tutor-profiles/{user_id}/org-logo.webp` via existing upload helper
- Tiny live preview of the badge as it will appear on quiz cards

### Display surfaces (chosen for clarity, not clutter)
- **Quiz cards** (new `QuizCard` above) — avatar + name + org badge
- **Public tutor profile** `/tutor/:id` — hero shows large avatar, name, and org badge under name
- **BrowseTutors result cards** — small org pill under tutor name
- Skipped (to stay clean): leaderboards, message lists, comment authors → these stay as avatar + name only.

### New component: `src/components/tutor/TutorOrgBadge.tsx`
Small reusable pill: `<img logo /> + name` with sizes `xs | sm | md`, gracefully renders name-only when no logo. Used everywhere above.

---

## Technical section

**Files added**
- `src/components/student/dashboard/SolutionHub.tsx`
- `src/components/quiz/QuizCard.tsx`
- `src/components/tutor/TutorOrgBadge.tsx`

**Files edited**
- `src/pages/student/StudentDashboard.tsx` — insert SolutionHub + CourseQuizzesSection, reorder.
- `src/components/student/dashboard/CourseQuizzesSection.tsx` — extend query with tutor join + description; render `QuizCard`.
- `src/pages/courses/CourseHub.tsx` — quizzes tab uses `QuizCard`.
- `src/pages/tutor/BrowseTutors.tsx` — render `TutorOrgBadge` on result card.
- `src/pages/profile/EditProfile.tsx` (or tutor onboarding equivalent) — add org name + logo fields.

**Migration**
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organisation_name TEXT,
  ADD COLUMN IF NOT EXISTS organisation_logo_url TEXT;
```
(No new RLS — existing `profiles` policies already cover read/write by owner + public read of public fields.)

**Data fetch**
Existing `quizzes` query gains a `profiles!quizzes_tutor_id_fkey (id, full_name, avatar_url, organisation_name, organisation_logo_url)` join. React Query keys updated so cache invalidates cleanly.

**Design tokens**
All new UI uses semantic tokens (`bg-card`, `text-foreground`, `border-amber-100`, `bg-amber-500`, etc.) — no raw hex. Honors the locked white + gold + Inter system.

**Non-goals (explicitly out of scope this round)**
- Admin-curated partner list (your pick was free-text only).
- Changing the tutor dashboard.
- Touching auth, payments, or the wallet.
