# OverraPrep Challenge Arena™

A premium academic-competition system that extends the existing `challenges` infrastructure into a full **Arena** with token-gated entry, real quiz play, server-validated scoring, multi-scope leaderboards, and automatic prize payouts.

> Note: a `challenges` / `challenge_enrollments` / `user_badges` system already exists for goal-tracking (study X cards, etc.). The Arena is a **separate, competition-focused track** that lives alongside it without breaking current behavior.

---

## 1. Database (new tables, RLS + GRANTs)

### `arena_challenges`
Admin-created competitions.
- `kind` enum: `daily` | `weekly`
- `title`, `description`, `course_id` (FK courses, nullable = cross-course)
- `entry_token_cost` int (≥0), `prize_pool_tokens` int (≥0)
- `num_questions` int, `time_limit_seconds` int
- `starts_at`, `ends_at` timestamptz
- `status` enum: `draft` | `scheduled` | `live` | `ended` | `settled`
- `featured` boolean (weekly = dashboard hero)
- `payout_split` jsonb (default `{"1":0.5,"2":0.3,"3":0.2}`)
- `created_by` uuid → `auth.users`

### `arena_challenge_questions`
Snapshot of questions per challenge (frozen at publish time so all entrants get the same set, in the same order).
- `challenge_id`, `question_id`, `position`

### `arena_entries`
One row per (challenge, user) — enforces "one submission per challenge".
- `UNIQUE (challenge_id, user_id)`
- `entered_at`, `submitted_at`, `score` (correct count), `accuracy` (numeric), `time_taken_seconds`, `tokens_spent`
- `status`: `in_progress` | `submitted` | `disqualified`

### `arena_entry_answers`
Server-side answer log for anti-cheat / audit.
- `entry_id`, `question_id`, `selected_option`, `is_correct`, `answered_at`, `elapsed_ms`

### `arena_rewards`
Settlement ledger.
- `challenge_id`, `user_id`, `rank`, `tokens_awarded`, `badge_slug` nullable, `awarded_at`

### Functions (SECURITY DEFINER)
- `arena_enter_challenge(_challenge_id)` → validates: live status, not already entered, balance ≥ cost; debits wallet via `wallet_transactions`; inserts `arena_entries` with `status='in_progress'`.
- `arena_submit_entry(_entry_id, _answers jsonb)` → server-grades against `arena_challenge_questions`, writes `arena_entry_answers`, sets score/accuracy/time, locks status to `submitted`.
- `arena_settle_challenge(_challenge_id)` → admin-only; ranks by `(score desc, time_taken asc)`, pays `prize_pool * split[rank]` to top finishers, awards `arena-champion`/`arena-podium` badges, marks `status='settled'`. Idempotent.
- `arena_leaderboard(_challenge_id)` → ranked rows w/ profile join.
- `arena_global_leaderboard(_scope, _course_id, _university)` → aggregates `arena_entries` across challenges; scopes: `daily` (today), `weekly` (last 7d), `course`, `university`.

All public tables get `GRANT SELECT, INSERT, UPDATE, DELETE … TO authenticated`, `GRANT ALL … TO service_role`, RLS on, scoped policies (entrants read own entry; everyone reads `arena_challenges` where `status in ('scheduled','live','ended','settled')`; admin-only writes via `has_role(auth.uid(),'admin')`).

Badges added to `badge_definitions`: `arena-champion`, `arena-podium`, `arena-debut`.

---

## 2. Edge function

`arena-settle` — cron-triggered (`pg_cron` daily 00:05 Africa/Lagos) that calls `arena_settle_challenge` for every challenge where `ends_at < now() AND status = 'ended'`. Also callable on-demand by admins.

---

## 3. Student-facing UI

Route prefix: `/arena`

- **`/arena`** — Arena home. Tabs: *Live* · *Upcoming* · *Past*. Featured weekly card on top (gold-bordered hero), grid of `ArenaChallengeCard`s. Empty state with calm copy.
- **`/arena/:id`** — Challenge detail. Shows prize pool, entry cost, course, question count, time limit, live entrant count, countdown to start/end. Primary CTA: **Enter for X tokens** → confirmation sheet → `arena_enter_challenge` RPC.
- **`/arena/:id/play`** — Quiz runner (reuses look of `QuizPractice`, but no autosave, no skipping back, hard timer). Submits all answers at end via `arena_submit_entry`. Shows result + current rank.
- **`/arena/:id/leaderboard`** — Live ranked list with avatars, score, time, "you" highlight, prize allocation per rank.
- **`/leaderboards`** — adds Arena tab w/ scope filters (Daily · Weekly · Course · University).

**Dashboard integration**: new `ArenaSpotlightCard` mounted in `StudentDashboard` between `TodayFocusCard` and `CourseRail`. Shows the featured weekly challenge + a "Your last result / winnings" strip. Skeleton-loaded; hides cleanly when no challenges exist.

---

## 4. Admin panel

Route: `/admin/arena`
- List view: status pills, entrant count, prize pool, ends-in countdown, settle button.
- Create/edit drawer: all the fields from section 1 + course picker + question-source picker (auto-pull N random questions from selected course, with preview/regenerate).
- Detail view: tabs *Participants* · *Leaderboard* · *Rewards* · *Audit log* (reads `arena_entry_answers` for spot-checks).
- Actions: **Publish** (draft→scheduled), **Force-end**, **Settle now** (calls `arena_settle_challenge`), **Disqualify entrant** (sets `status='disqualified'`, refunds tokens).

Linked from `AdminDashboard` quick-actions.

---

## 5. Anti-cheat

- One row per (challenge, user) enforced by UNIQUE constraint.
- Client never computes score; only sends answers. Grading is in `arena_submit_entry` using the frozen question snapshot.
- Every answer logged in `arena_entry_answers` with elapsed ms — flags >X impossibly fast or duplicate-pattern submissions for admin review.
- Server clamps `time_taken_seconds` to `challenge.time_limit_seconds`.
- Window enforcement: RPC rejects entry if `now() < starts_at` or `now() > ends_at`.

---

## 6. Design language

White + gold + Inter, consistent with the locked visual system. Trophy / laurel iconography, never coin-stacks or casino motifs. Copy framed as "compete with classmates", "earn your spot", "weekly champions" — never "bet" / "wager" / "win big". Subtle gold accents, soft shadows, generous whitespace. Mobile-first cards 1-up on phones, 2-up on tablet, 3-up on desktop.

---

## 7. Out of scope (for this build)

- Real-money entry (tokens only).
- Team/clan arena (single-player only for v1).
- Live multiplayer sync — leaderboard is poll-based (React Query, 10s `refetchInterval` while a challenge is live).

---

## Technical notes

- All RPCs `SECURITY DEFINER` with `SET search_path = public`.
- Wallet debit/credit reuses the existing `consume_ai_token` / `wallet_transactions` ledger pattern (new `kind`: `arena_entry`, `arena_prize`).
- `staleTime` 60s globally; live challenge detail uses `refetchInterval: 10_000` only when `status='live'`.
- New components live under `src/components/arena/*`, pages under `src/pages/arena/*` and `src/pages/admin/arena/*`.

---

**Build order:** DB migration → settle edge fn + cron → hooks (`useArena*`) → student pages → dashboard card → admin panel → seed 1 sample weekly challenge for QA.
