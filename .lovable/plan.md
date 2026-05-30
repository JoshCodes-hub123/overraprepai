
# Simpler Monetization: 5 Daily Credits → ₦2,000/month Pro

We're replacing the token-pack model with a clean, single-decision Freemium flow. One price. One unlock. Strong nudges from teaser previews. Admin gets clear payment visibility.

---

## 1. The Model (locked, simple)

**Free tier — every student, every day:**
- **5 credits per day**, auto-reset at 00:00 WAT.
- 1 credit = 1 "AI action" (any of): AI explanation, AI summary, TTS audio, AI quiz generation, AI tutor reply, study pack section, flashcard generation, mock exam grading, study coach reply.
- Unlimited (no credit): browse courses, take existing quizzes, leaderboards, SRS review, bookmarks, community, profile.
- When credits hit 0 → **Soft paywall sheet**: "You've used today's 5 free credits. Upgrade to Pro for unlimited access — or come back tomorrow."

**Pro tier — ₦2,000 / month:**
- Unlimited everything (all AI, audio, mock exams, premium tutor content, live sessions, study coach).
- Pro badge on profile + leaderboard.
- Priority tutor chat.
- Audio download.
- 30 days from activation.

**Why this works:**
- Single price = zero decision fatigue.
- 5/day = enough to *taste* the magic, not enough to *study* on. Drives conversion.
- ₦2,000 is below the psychological ₦2,500 threshold and a clean round number for Nigerian students.

---

## 2. Teaser Previews (the "clue" you asked for)

For every paid action, free users (out of credits OR locked feature) see a **preview before the wall**:

- **Convert notes → audio:** Show first 15 sec of audio playable + waveform + "🔒 Upgrade to Pro to listen to the full 12-minute audio."
- **AI summary:** Show first paragraph blurred-fade + "🔒 Pro unlocks the full summary (8 more sections)."
- **AI quiz from notes:** Show 1st question fully + Q2–Q15 blurred + "🔒 Pro unlocks all 15 questions."
- **AI explanation:** Show first 2 lines + "🔒 Read the full explanation with Pro."
- **Mock exam:** Show exam metadata (questions, duration, topics) + "🔒 Start exam with Pro."
- **AI tutor chat:** Show typing indicator + first sentence + "🔒 Continue this conversation with Pro."
- **Study pack:** Show table of contents + first lesson title only.

Single reusable `<TeaserPaywall>` component handles all of these — content preview slot + frosted/blurred lock overlay + "Upgrade to Pro ₦2,000/mo" CTA + "Maybe later" dismiss.

---

## 3. Admin Payments Visibility

New `/admin/payments` page (admins only) showing:
- **Stats cards:** Today's revenue, this month's revenue, active Pro subs, churn (expired last 7d).
- **All payments table** (paginated, searchable, filterable):
  - Columns: Student name + email, amount, Pro start date, expiry date, payment method (Flutterwave / manual), reference ID, status badge (active / expired / pending / failed / refunded).
  - Filters: status, date range, method.
  - Search: by name, email, or reference.
- **Per-row actions:** View full Flutterwave payload, manually extend (gift days), refund (mark only), resend receipt.
- **Pending manual transfers section** (existing `payment_requests`): list with receipt thumbnail, Approve / Reject buttons.
- **Export CSV** for accounting.

All admin actions write to `audit_logs`.

---

## 4. Extra things I'm adding (things you need but didn't ask for)

These are launch-critical and I recommend including now:

1. **3-day Pro trial on signup** — every new student gets 3 days of Pro free, no card. Massive conversion lift; they experience the product at full power before they ever see a paywall.
2. **Expiry reminders** — push + email at 3 days, 1 day, and on expiry day. "Your Pro expires tomorrow — renew to keep your streak alive."
3. **Streak-saver hook** — if a Pro user is about to expire and has a 7+ day streak, paywall copy becomes: "Don't lose your 14-day streak. Renew now."
4. **Referral reward** — student refers a friend who upgrades → both get 7 bonus Pro days. Cheapest acquisition channel for student apps.
5. **First-month discount** — first purchase only: ₦1,500 instead of ₦2,000 (25% off). Shown on the paywall as crossed-out price. Renewals are full ₦2,000.
6. **Pro badge on leaderboard & profile** — social proof. Other students see "✨ Pro" next to top scorers and want it.
7. **Tutor-content carve-out:** tutor-created premium quizzes still split revenue 70% tutor / 30% platform on the Pro subscription pool, distributed monthly based on consumption share. Keeps tutors incentivized.
8. **Daily credit counter chip** in header for free users: "⚡ 3/5 today" → tap opens explainer + upgrade CTA.
9. **Receipt email** on every successful payment (Resend).
10. **Grace period:** 24h after expiry, user is "Pro (grace)" — can still use the app but a banner says "Your Pro expired — renew to avoid losing access tomorrow."

---

## 5. Worked unit economics

Assumptions per Pro user / month:
- Revenue: **₦2,000** (~$1.30)
- Costs:
  - Flutterwave fee (~1.4% + ₦100 capped at ₦2,000): **~₦128**
  - AI Gateway (heavy user, ~300 actions/mo): **~$0.20 ≈ ₦310**
  - TTS (Noiz, ~30 audio req/mo): **~$0.06 ≈ ₦95**
  - Supabase/storage allocation: **~₦50**
  - **Total cost ≈ ₦583**
- **Net per Pro user ≈ ₦1,417 (~71% margin)** ✅

At **500 Pro users** → ~₦708,500/month net. At **2,000** → ~₦2.83M/month net.

---

## 6. Technical section (for the build phase)

### Database migration
- Add `subscription_plans` row: `pro` at ₦2,000 (200000 kobo equivalent — we'll store NGN smallest unit), monthly.
- Add to `profiles`: `daily_credits_used INT DEFAULT 0`, `daily_credits_reset_at TIMESTAMPTZ`, `trial_ends_at TIMESTAMPTZ`.
- Rewrite RPC `consume_credit(_kind)` → atomic increment, returns `{allowed, used, remaining, reason}`. Pro + trial users always `allowed=true`.
- RPC `activate_pro(_user_id, _days, _source, _reference, _amount)` — used by webhook + admin.
- RPC `admin_extend_pro(_user_id, _days, _reason)` — audit-logged.
- Nightly trigger: reset `daily_credits_used` at 00:00 WAT.
- On `auth.users` insert trigger: set `trial_ends_at = now() + 3 days`.

### Edge functions
- Keep `flutterwave-init` + `flutterwave-webhook` (already working). Webhook now calls `activate_pro` instead of crediting tokens.
- New `subscription-expiry-reminders` cron (daily) → notifications + email.
- Deprecate/disable Paddle token-pack flow (keep code, hide UI).

### Frontend
- New `<TeaserPaywall>` component — wraps any locked content with blur + CTA.
- New `<PaywallSheet>` — full-screen sheet shown on credit exhaustion or feature lock.
- Rewrite `usePremium` → returns `{ isPro, isTrial, creditsUsed, creditsLeft, requireCredit(kind), requirePro(reason) }`.
- Replace `useTokenBalance` chip with `<DailyCreditsChip>` (free users) / `<ProBadge>` (Pro users).
- Wrap all AI action call sites with `requireCredit()` / `requirePro()`.
- New `/admin/payments` page with stats, table, filters, CSV export.
- Simplify `/subscription` page: one giant Pro card (₦2,000/mo, first-month ₦1,500), 3-day trial banner if eligible, manual transfer fallback button.

### Notifications
- Pro activated → push + email + in-app.
- 3d / 1d / 0d expiry → push + email.
- Trial ending in 24h → push.
- Admin: new payment received → push to admin role.

---

## 7. What I need from you before building

1. **Confirm ₦2,000/month** (vs ₦1,500 or ₦2,500).
2. **Confirm 5 daily credits** (vs 3 or 7).
3. **Confirm 3-day free Pro trial on signup** — yes/no.
4. **Confirm first-month discount ₦1,500** — yes/no.
5. **Confirm referral reward (7 bonus days each)** — yes/no.

Once you reply to those, I'll switch to build mode and ship the whole thing end-to-end in one go: migration → edge functions → frontend rewrite → admin page → seed → notifications.
