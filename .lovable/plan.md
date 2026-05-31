
# Next Milestone: Token Paywall, Open Universities & Install Push

Five focused workstreams shipped together so the next publish is a real upgrade — not just polish.

---

## 1. Phase 10.1 — Wire the Token Paywall into every AI action (priority #1)

The `SoftPaywallSheet` and `TokenBalanceCard` exist but no AI action actually opens the sheet. We'll add a single shared hook and wire it everywhere AI is consumed.

- New hook `useAIGate()` that wraps the existing `consume_ai_token(_kind)` RPC:
  - Spends free daily use first, then a wallet token.
  - On `{ allowed: false }` → opens `SoftPaywallSheet` with the live "resets in Xh Ym" countdown.
  - Returns a `gate(kind, fn)` helper so call sites just do `await gate('ai_chat', () => callEdgeFn())`.
- Wire `useAIGate` into:
  - AI Tutor chat (`ai-tutor-chat`)
  - Quiz "Explain answer" (`ai-explanation`)
  - Audio Learning / TTS (`text-to-speech`)
  - Chat with Notes (`chat-with-notes`)
  - Summarize material / thread (`summarize-material`, `summarize-thread`)
  - Study Coach (`study-coach`), Library AI (`library-ai`), Theory hints/eval
- Every dashboard header + mobile greeting already shows `{balance} · {freeLeft}/3 free`. We'll make the pill open `/wallet` on tap and pulse gold for 1s after each consumption so students *see* the meter move.
- Add a 1-time onboarding bubble: "You get 3 free AI uses every day. Top up only when you need more."

## 2. Open universities to ALL Nigerian schools

Today `universities.ts` only ships FUTA + OAU. We'll open it up without breaking existing scoping.

- Replace the hard-coded map with a database-backed `universities` table seeded with **~170 Nigerian universities** (federal, state, private — code + name + city + type).
- Onboarding `ChooseUniversity.tsx`:
  - Searchable dropdown of every university.
  - "My school isn't listed → Request it" path opens a tiny form (name, city, optional website). Saves to a new `university_requests` table with status `pending`. Student is set to that university with `is_pending_verification = true` so they can still use the app while admin reviews.
- Faculty/Department steps gracefully fall back to free-text entry when a school has no curated faculty list yet (most won't on day 1). Admins can fill curated lists later from `/admin/universities`.
- New admin page `/admin/universities` to approve requests, edit names, add faculties/departments.

## 3. Per-school resources & batching (equal access for every uni)

Tutors and admins should be able to create resources scoped to their school, and students should see the school batch on each course/resource.

- Every content table that already has a `university` text field (courses, quizzes, tutor_curricula, opportunities, announcements) becomes a real FK to `universities.code`. Existing FUTA/OAU rows are preserved.
- New helper `useUniversityScope()` returns the student's university; every "My Courses", "Library", "Audio Learning", "Course Hub", "Opportunities" list filters by it by default with a "Show all universities" toggle for cross-school browsing.
- New badge component `<UniBadge code="FUTA" />` (gold pill with school short code) shown on every:
  - Course card
  - Tutor profile / Storefront
  - Opportunity card
  - Announcement
  - Quiz preview
- Tutor dashboard "Create resource" forms (`quiz`, `curriculum`, `material`, `opportunity`) auto-default to the tutor's primary school and let them multi-select extra schools if they teach across campuses. Admins can target any school.
- Admins get a "Switch active school context" picker in `/admin` so they can curate per-university content without changing their own profile.

## 4. Constant "Install the app" push

Make install impossible to ignore without being spammy.

- Global `InstallNudge` banner (slim gold bar at top of dashboard) shown to non-installed users — dismiss for 7 days, reappears once.
- Floating "Get the app" CTA on every public page (`/`, `/storefront/:tutor`, `/opportunities`, `/quiz/:id`) that opens `/install` in a sheet.
- After every quiz completion → toast "Save your streak forever. Install OverraPrep →".
- After top-up success → toast "Tip: install the app so your wallet is one tap away".
- Add native `beforeinstallprompt` capture + Android/iOS-specific instructions on `/install` (already partially there — we'll polish copy and add a 30s screen-recorded GIF preview).

## 5. Official tutor + admin credentials

- Run the existing `seed-official` edge function (already in repo) to provision the **OverraPrep Official Tutor** and **Admin** accounts.
- Capture the generated email + temporary password in the function response and **email them to you** via the existing transactional pipeline (one-time delivery, marked sensitive).
- You'll be asked for the destination email address as the very first build step.

---

## Technical Details (skip if not interested)

- **DB migrations**
  - `universities (code pk, name, city, type, is_active)` — seeded with full Nigerian list.
  - `university_requests (id, requested_by, name, city, website, status, reviewed_by, reviewed_at)`.
  - Add `university_code` FKs on `courses`, `quizzes`, `tutor_curricula`, `opportunities`, `announcements`, `materials` (nullable for cross-school). Backfill from existing `university` text column.
  - Add `is_pending_verification boolean default false` to `profiles`.
  - RLS: read `universities` to `anon` + `authenticated`; `university_requests` insert by `authenticated`, read/update by admins only.
  - GRANTs on all new tables.
- **Edge fns**
  - No new fns — all AI gating uses the existing `consume_ai_token` RPC.
  - Trigger `seed-official` once via curl from the agent; capture creds; send via `send-transactional-email` template `official-credentials`.
- **Client**
  - `src/hooks/useAIGate.ts` (new) — single source of truth for free→token→paywall flow.
  - `src/components/common/UniBadge.tsx` (new).
  - `src/components/install/InstallNudge.tsx` (new) — uses `localStorage` for 7-day dismiss.
  - Refactor 8–10 AI call sites to `await gate(...)`.
  - `ChooseUniversity.tsx` becomes a Combobox + "Request school" sheet.
  - `/admin/universities` (new admin page).
- **Verification**
  - Unit-test `useAIGate` (free → token → paywall transitions).
  - Smoke: log in as official student → use AI 3× → see paywall → top-up → continue.
  - Smoke: sign up with a non-FUTA/OAU school → see badge on dashboard → tutor creates a resource for that school → student sees it.

---

## What you'll see after this ships

1. Every AI button respects the 3-free + wallet rule and surfaces the paywall sheet.
2. Any Nigerian student can pick their actual university at signup (or request a new one).
3. Tutors/admins create resources tagged to a specific school; students see only their school's content by default with a one-tap "Browse all schools" escape hatch.
4. Install CTAs everywhere — banner + floating button + post-action toasts.
5. The official OverraPrep Tutor + Admin credentials land in your inbox.
