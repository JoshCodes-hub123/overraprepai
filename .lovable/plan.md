# Student Dashboard V2 — Premium Redesign

Matches the attached mockup: white surface, gold accents, dark "Today's Focus" card, slide-out left sidebar, 5-tab bottom nav (already in place).

## New files (under `src/components/student/dashboard/v2/`)

1. **`TopAppBar.tsx`** — `☰` (opens `SidebarMenu`), centered OverraPrep wordmark + tagline, bell with unread badge (realtime), avatar → `/profile/edit`.
2. **`SidebarMenu.tsx`** — left-side `Sheet`. Nav rows: Dashboard, My Courses, Library, Flashcards, Audio Learning, AI Tutor, Community, Opportunities Hub, Scholarships (`/opportunities?type=scholarship`), Leaderboard, Notifications, Settings, Help & Support. Active state = amber bg. Bottom "Go Premium" mini card linking to `/wallet`.
3. **`HeroGreeting.tsx`** — time-aware greeting + name, one subline, then a 3-cell inline stat strip: 🔥 Day Streak (from `study_streaks`), 🎯 Readiness (from latest `readiness_attempts.score_pct`), ⭐ Hero Points (derived from `useProfileStats`: `quizzes*10 + cards*2 + streak*5`).
4. **`TodayFocusCard.tsx`** — dark `bg-neutral-900` card. Up to 3 prioritised rows + single gold "Continue Learning" CTA:
   - Most recent enrolled course → continue
   - SRS due count (`useDueCards`) → `/review`
   - First active quiz across enrolled courses → `/courses/:id?tab=quizzes`
   Empty state: "Pick your courses to see today's plan".
5. **`CourseRail.tsx`** — horizontal snap scroll of compact 160-px course tiles with SVG progress ring (gold/emerald/indigo rotating), code + name. Trailing "+ Add Course" tile; when `count >= 12` shows disabled "Maximum 12 courses reached." Empty state with "Select Courses" CTA.
6. **`QuickActions4.tsx`** — 4 tiles (Study, Practice, Audio, Ask AI) → `/study`, `/practice`, `/audio`, `/ai-tutor`.
7. **`OpportunitySnapshot.tsx`** — top 2 from `useOpportunities({ limit: 2 })`. Category icon + title + "Apply before {date}". "View All" link.
8. **`CommunityMomentCard.tsx`** — single soft card. Today's `quiz_attempts` count → "{N} students practised on OverraPrep today" (fallback copy when 0). Links to `/community`.

## Edits

- **`src/pages/student/StudentDashboard.tsx`** — replace body with the new ordered stack:
  `TopAppBar → HeroGreeting → TodayFocusCard → CourseRail → QuickActions4 → OpportunitySnapshot → CommunityMomentCard`.
  Container stays `max-w-2xl` mobile-first, `space-y-5`. Removes use of `TopHeader`, `SolutionHub`, `CourseQuizzesSection`, `TodayCard`, `HeroQuestCard` on this page (files themselves untouched).

## Design rules (locked)
- White bg, `bg-card` surfaces, `border-amber-100` hairlines, amber-500/600 accent only.
- `rounded-2xl`/`rounded-3xl`, soft `shadow-sm`, framer-motion fade/translate 300-400 ms.
- Inter + `font-display` headings; eyebrows `text-[10px] uppercase tracking-[0.22em] text-amber-700/80`.
- Every section has a graceful empty state.
- Mobile-first 360 px → no horizontal overflow; desktop centers in `max-w-2xl`.

## Out of scope
- No DB migrations, no token/wallet logic changes (wallet stays in Me hub).
- `BottomTabBar` untouched (already Home/Study/Practice/People/Me).
- Old dashboard component files kept on disk (may be reused elsewhere).

## Verification
- View `/student/dashboard` at 360×800 and 1336 — no overflow.
- Sidebar opens/closes; every link navigates.
- Empty states render for 0 courses / 0 opportunities.
