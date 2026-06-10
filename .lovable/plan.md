
## Goal
Give every student a calm, well-organized course area where courses are grouped by Level, locked when off-level, and visually premium. Also tighten Today's Focus so it always feels alive and on-brand.

## What students will see

### 1. Level-gated Course Directory (`/courses`) — full redesign
- **Level switcher pill** at the top: shows current level (e.g. "300 Level") with a one-tap "Change level" sheet that updates the profile. Off-level browsing is allowed but locked.
- **Sticky tabs**: `My Courses` · `Recommended for {level}` · `Browse all`.
- **Grouped by Level sections** (100 / 200 / 300 / 400 / 500 / JAMB / Secondary). Each level section has a small header chip + count. The student's level is auto-expanded and highlighted; other levels collapse with a "Show 100 Level courses" reveal.
- **Department filter** + search (code, name, dept). Sort by code.
- **Empty / no-scope state**: friendly CTA "Set your level to unlock your courses" → opens the level sheet.

### 2. Beautiful Course Card
A single redesigned card used everywhere (directory, My Courses, dashboard rail):
- White card, soft gold border, subtle gradient header strip color-keyed per department (Engineering / Sciences / Arts / etc.).
- Top row: **course code badge** (gold) + **level chip** + **lock icon** if off-level.
- Title (display font, 2-line clamp), department subtitle.
- Mini-stats row: materials count · quizzes count · enrolled? check.
- Hover/press: gentle lift + gold ring.
- Primary action morphs by state: `Add` (eligible) → `Open` (enrolled) → `Locked — switch to {level}` (off-level, opens level sheet).

### 3. My Courses page
- Hero shows level + department label and progress summary ("4 of 8 active this week").
- Enrolled courses grouped by **Level** (in case profile changed) then sorted by recent activity.
- "Recommended for {level}" rail under the enrolled section, one-tap add.
- Cap remains 12 courses with a clear meter.

### 4. Dashboard rail (`CourseRail`)
- Replace the rotating ring percentage with a real "last opened / next up" line so it stops feeling random.
- Header "My Courses · {level}" with a "Manage" link.
- Empty state CTA goes to the new directory.

### 5. Today's Focus
- Switch the dark `bg-neutral-900` block to the locked **white + gold** style to match the rest of the dashboard.
- Always render 3 slots with smart fallbacks so it never collapses:
  1. **Continue** — most recently opened course (from `recently_opened_courses`, fall back to first enrolled).
  2. **Review** — SRS due count, or "Start a 5-card warm-up" when 0.
  3. **Practice** — newest active quiz in any enrolled course, or "Generate a quiz from a material" CTA.
- Each row shows course code + name + meta + arrow; primary CTA = first slot.
- If the student has no courses yet, the card becomes a single "Pick your courses" panel that deep-links to the new directory.

## Nice extras (small, high-impact)
- **Department color tokens** (gold base + per-dept accent) added to `index.css` so cards and chips share one palette.
- **"For your level" Sparkles badge** on recommended cards.
- **Course progress hint** (materials viewed / quizzes attempted) shown on enrolled cards using existing `useCourseSnapshots` data.
- **Persistent level chip** in the page header so the student always knows what's being filtered.

## Technical notes (for engineers)
- Data: all level filtering uses `profiles.level` via `useStudentScope`. No schema changes.
- Lock logic: `course.level && course.level !== student.level` → locked card, action opens a level-switch sheet calling `useStudentLevel.setLevel`.
- New component: `src/components/courses/CourseCardV2.tsx` (replaces `CourseCard` usage in directory, My Courses, dashboard rail).
- New component: `src/components/courses/LevelSection.tsx` (collapsible level group with header + count).
- New component: `src/components/courses/ChangeLevelSheet.tsx` (bottom sheet using `LEVEL_OPTIONS` from `useStudentLevel`).
- Edit `src/pages/courses/CourseDirectory.tsx` and `src/pages/student/MyCourses.tsx` to use grouped sections and the new card.
- Edit `src/components/student/dashboard/v2/CourseRail.tsx` to drop the fake percentage and surface "last opened".
- Edit `src/components/student/dashboard/v2/TodayFocusCard.tsx`: rewrite styles to white/gold, integrate `useRecentlyOpenedCourses`, add fallbacks so all 3 slots render.
- Add department-accent CSS vars in `src/index.css`.
- No DB migration required.

## Out of scope (ask if you want them next)
- Adding cover images per course (would need a `cover_url` column).
- Auto-syncing enrollment from a university timetable.
- Hiding off-level courses entirely (current plan keeps them visible-but-locked, which I recommend for discovery; say the word and I'll switch to hard hide).
