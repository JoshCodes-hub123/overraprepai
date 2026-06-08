# Plan: Speed, Reminders, Device Lock, Token Economy

## 1. Performance — return visit under 4s

- Persist React Query cache in `localStorage` (24h) via `@tanstack/query-persist-client-core` + `createSyncStoragePersister`. Returning users see the dashboard instantly while fresh data hydrates in the background.
- Add `<link rel="preconnect">` to Supabase + Flutterwave in `index.html`.
- Wrap heavy dashboard sections in `React.lazy` + Suspense skeletons (HeroGreeting, CommunityMomentCard, OpportunitySnapshot).
- Mark the splash gold-orb `<canvas>` and lottie/framer scenes with `loading="lazy"` and `prefers-reduced-motion` skip.
- Prefetch top 5 routes on idle (already partial — extend `prefetchDashboardNeighbors`).
- Keep manifest-only PWA — no service worker (preview safety).

## 2. Daily "come study" reminder — push + email fallback

- Web Push: VAPID keys in secrets, `subscribe-push` edge fn stores subscription in `push_subscriptions`. Service worker `firebase-messaging-sw.js`-style file just for push (allowed exception, outside the kill-switch).
- Daily `pg_cron` at 18:00 Africa/Lagos calls `daily-reminder` edge fn → for each active student: send web push first, if no push subscription OR `last_active_at < 24h` also send email via existing Resend setup.
- Reminder copy: "Your daily 3 free AI actions reset — keep your streak alive 🔥"
- Opt-out toggle in `/settings`.

## 3. One device per account — auto-replace + alert

- New `user_devices` table (`user_id, fingerprint, user_agent, ip, last_seen_at, is_active`).
- On every login, frontend computes fingerprint (FingerprintJS-lite: UA + screen + tz hash) and calls `register_device` RPC → marks all prior devices inactive, inserts current as active, returns `replaced_count`.
- App-load guard: `useDeviceGuard` calls `verify_device` every 30s + on focus. If current fingerprint ≠ active → forced sign-out + toast: "Your account is in use on another device. Sign in again to continue."
- Email + in-app notification when replacement happens.

## 4. Token economy — usage-based pricing

Central pricing table `ai_pricing(kind text PK, cost int, label text)` seeded with:

| Action | Cost (tokens) | Free daily? |
|---|---|---|
| ai_chat (AI tutor msg) | 1 | yes (3/day) |
| ai_explain (per question) | 1 | yes |
| ai_summary | 1 | yes |
| flashcards_generate | 1 | yes |
| quiz_generate | 2 | no |
| pdf_export | 2 | no |
| audio_tts | 3 | no |
| study_pack_generate | 4 | no |
| mock_exam_generate | 5 | no |
| unlock_quiz (per quiz) | 2 | no |
| unlock_audio_pack | 3 | no |

### Always FREE (no token, no quota)
Dashboard · Library browsing · Reading your own notes/uploads · Leaderboards · Profile · Bookmarks · Reports · Streak · DMs & chat (human-to-human) · Reviewing past quiz attempts · SRS card reviews · Viewing announcements/opportunities · Re-taking a quiz you've already unlocked.

### Token-gated
Every AI generation above + unlocking any tutor quiz, mock exam, audio pack, PDF download.

### Backend
- Migrate `consume_ai_token(_kind)` → reads cost from `ai_pricing`, debits N tokens (not 1). Free-daily quota still applies but only to kinds flagged `free_eligible=true`.
- New `unlock_quiz(_quiz_id)` RPC: checks `quiz_unlocks(user_id, quiz_id)`; if missing, debits the unlock cost, inserts row. Returns `{allowed, cost, balance}`.
- New `quiz_unlocks` table — items "save" to the user forever, replay free.
- New `low_balance_warn` toast at balance ≤ 3 tokens with "Top up" CTA.

### Frontend
- `usePremium` exposes `priceFor(kind)`.
- `SoftPaywallSheet` shows exact cost.
- `QuizPractice` start gate: if not unlocked → show "Unlock for X tokens" sheet; on success → start quiz, future replays free.
- Same gate added to: audio playback start, PDF export button, flashcard generator submit, summary generator submit, study-pack generator, mock-exam start.
- TokenBalanceCard adds a "Low balance" amber ribbon when ≤3.

## Technical notes

- All new tables: `GRANT` block + RLS as per project standards.
- `ai_pricing` is read-only to `authenticated`, writable only via migration.
- `quiz_unlocks` and `user_devices` policies scoped to `auth.uid()`.
- Web Push needs new secret `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (I'll request them once you approve).
- Edge fns: `subscribe-push`, `daily-reminder`, `register-device-email`.

## Out of scope this round
- Native Capacitor push (web push covers PWA users).
- Refunds of tokens on failed AI calls (will add try/catch refund in a follow-up).
- Tutor-set custom quiz prices (default 2; tutor override later).

Reply "go" and I'll build it end-to-end. If you want to change any cost or split it into smaller drops, tell me now.