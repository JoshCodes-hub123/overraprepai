# Complete User Journey & Academic Environment Architecture

Goal: one brand, two isolated academic worlds (University → FUTA / OAU / UI / FUTEsIyin, and JAMB / UTME), with a friction-free mobile journey from landing page to practice.

---

## 1. What already exists

**Environment foundation (partly built)**
- `learning_environment` enum (`university`, `jamb`).
- `profiles.environment_type`, `university`, `faculty`, `department`, `level`, `academic_path`.
- `courses.environment_type`, `university`, `faculty`, `department`, `level`.
- DB helpers: `my_environment()`, `my_university()`, `can_access_course()`.
- RLS already scoped: `courses` (environment + university), `quizzes` and `questions` (via `can_access_course`).
- Frontend: `src/config/environments.ts`, `useEnvironment()`, `environmentScope.ts`, admin `EnvironmentSwitcher`, `JambDashboard`, `ChoosePath`.

**Data reality today**
- 641 profiles on FUTA, 1 on OAU, 0 JAMB. 10 courses, all FUTA. Nothing to migrate destructively.

**Journey pieces that exist**
- `/` → splash → Ambassadors page (not a proper landing page).
- `/auth` combined sign-in/sign-up. No `/signup` route.
- Onboarding screens exist but as a long chain: product → persona → path → university → faculty → department → level → courses → tutor matching.
- `/student/dashboard`, `/jamb/dashboard`, `/admin/dashboard`.
- One student bottom tab bar (Home / Study / Practice / People / Me) for every environment.

**Gaps**
- Landing page is not the simple two-CTA screen described.
- Onboarding is too long; no dedicated JAMB onboarding (subjects, target course).
- `subjects`, `topics`, `mock_exams`, `study_materials`, `search_index` carry no environment scoping — JAMB content has no home and subjects are world-readable.
- Direct links (`/quiz/:id`, `/courses/:id`) fail silently instead of showing a friendly "not in your environment" screen.
- No logged-out preview + return-to-content-after-login.
- Environment context is read from profile each render; no explicit reset guarantee on logout/account switch.
- Admin environment switcher is not global/persistent across all admin pages.

---

## 2. Database & RLS changes

1. **`subjects`** — add `environment_type learning_environment not null default 'jamb'`, plus optional `university`. Replace the `viewable by everyone` policy with an environment-scoped read (authenticated: matches `my_environment()`; anon: JAMB only for public SEO pages).
2. **`topics`** — inherit via `course_id`; add nullable `subject_id` so JAMB topics hang off subjects. Add RLS: readable when `can_access_course(course_id)` OR the parent subject is in the user's environment.
3. **`questions`** — add nullable `subject_id` so JAMB questions attach to subjects rather than a fake course. Extend the read policy with the subject branch.
4. **New `profiles` fields for JAMB onboarding** — `jamb_subjects text[]`, `target_course text`, `target_university text`, all optional.
5. **New helper `can_access_subject(uuid)`** (security definer, stable) mirroring `can_access_course`.
6. **`mock_exams`, `study_materials`, `search_index`** — scope reads through the existing course/subject helpers instead of open reads.
7. **`semantic-search` / `search_index`** — filter results by environment inside the RPC, not in the client.
8. **Backfill** — every existing course and profile is already FUTA/university, so backfill is a no-op; new columns default safely.

Grants follow the standard pattern for any new table (none planned; all changes are ALTERs).

---

## 3. Journey & routing changes

| Step | Route | Change |
|---|---|---|
| Discovery | `/` | New simple landing: logo, "Turn your preparation into confidence.", one line of copy, `Get Started` + `Explore`. Splash stays for app opens; signed-in users still auto-redirect. |
| Explore | `/explore` | Light public tour (what University mode and JAMB mode offer). |
| Signup | `/signup` | New route (email + password + Google), aliasing the existing auth logic. `/auth` kept for sign-in and backward compatibility. |
| Path | `/onboarding/path` | Keep, simplify to the two big cards. |
| University | `/onboarding/university` → `faculty` → `department` → `level` | Keep existing screens; compress into a single stepper with one question per screen and a progress dot row. |
| JAMB | `/onboarding/jamb/subjects` → `/onboarding/jamb/goal` | New. Subject multi-select (4 subjects, English pre-locked), then optional target course + preferred university. |
| Dashboard | `/dashboard` | Router already redirects by role; extend so university students land on `/student/dashboard` and JAMB on `/jamb/dashboard`, both showing `OverraPrep AI · <FUTA \| OAU \| UI \| FUTEsIyin \| JAMB / UTME>` in the header. |
| Blocked content | any | New `<EnvironmentGuard>` wrapper rendering "This content isn't available in your current academic environment." + `Return to My Dashboard`. |
| Logged-out deep link | any | Preview + "Sign in to continue"; store intended path and resume after auth if the content is in range. |

**Returning users:** already handled by the saved-last-route logic in `Welcome.tsx`; add a guard so a saved route from a different environment is ignored.

**Onboarding completeness gate:** a small `useOnboardingGate` redirects any signed-in student without a complete environment (`jamb` or `university` + university code) to the right onboarding step, once.

---

## 4. Navigation changes

`BottomTabBar` becomes environment-aware:

- University: Home · Courses · Practice · AI Coach · Community
- JAMB: Home · Subjects · Practice · AI Coach · Community

Tabs are chosen from `useEnvironment()`, so no JAMB tab ever appears in university mode and vice versa. Existing hub routes are reused (`/courses`, `/subjects`, `/practice`, `/ai-tutor`, `/community`).

Discovery flows:
- University: Home → Courses → Department → Course → Topics → Practice
- JAMB: Home → Subjects → Subject → Topics → Practice

---

## 5. Admin changes

- Promote `EnvironmentSwitcher` into a persistent admin header bar with a `Managing FUTA` / `Managing JAMB / UTME` indicator, backed by a shared context persisted to `localStorage`.
- Two admin menu sets: university (Courses, Students, Questions, Materials, Tutors, Announcements, Communities, Analytics) vs JAMB (Students, Subjects, Topics, Questions, Past Questions, CBT Exams, Mock Exams, Materials, Announcements, Analytics).
- Content creation forms pre-fill and lock `environment_type` / `university` from the active scope, and validation rejects invalid combinations (JAMB + a university course, cross-university course reuse).
- Bulk import inherits the active environment and rejects rows whose course/subject belongs elsewhere.

---

## 6. Academic settings (student-side switching)

`Profile → Academic Settings → Change Academic Path`, with a confirm dialog:
"Changing your academic environment will update the courses, resources and recommendations shown to you." `Cancel` / `Continue`. No switcher anywhere else in the student UI.

---

## 7. Logout & account switching

Clear on sign-out and on `SIGNED_IN` with a different user id: React Query cache, environment context, saved last route, dashboard localStorage caches, offline caches keyed by user. This makes the previous student's environment impossible to inherit.

---

## 8. Preserving existing FUTA users

- Every current profile is already `university` + FUTA, so they keep their exact dashboard, courses and progress.
- No table is dropped or renamed; only additive columns and tightened read policies that FUTA users already satisfy.
- `/auth`, `/student/dashboard` and all current deep links keep working; new routes are additions.
- Removed school/parent modules are out of scope here and left untouched.

---

## 9. Risks

- **Tightening `subjects` RLS** can blank the public SEO JAMB pages if anon reads are cut too hard — mitigated by allowing anon reads of JAMB subjects only.
- **`can_access_subject` in hot policies** adds a per-row function call; index `subjects(environment_type, university)`.
- **Bottom-nav rewrite** touches every student screen's chrome — behind the existing tab component, so the blast radius stays in one file.
- **Deep-link guard** could over-block if a course's `environment_type` is null; defaults keep them `university`.
- JAMB content does not exist yet: JAMB mode ships with empty states until subjects/questions are imported.

---

## 10. Suggested build order

1. Schema + RLS (subjects, topics, questions, profile JAMB fields, `can_access_subject`).
2. Landing page + `/signup` + explore.
3. Onboarding: simplified university stepper + new JAMB flow + completeness gate.
4. Environment-aware bottom nav and dashboard headers.
5. `EnvironmentGuard` for deep links, logged-out preview + return-to-content.
6. Environment-scoped search and recommendations.
7. Admin persistent environment bar, JAMB admin menus, creation validation.
8. Academic settings switch + logout/account-switch cache reset.
