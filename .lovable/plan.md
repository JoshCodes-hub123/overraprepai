
# Phase 7B.1 — Payments, Free/Pro gating, and launch seed

This is the first of four sub-phases. We get money + accounts + content live first, then move to onboarding/empty states (7B.2), referrals/notifications/trust (7B.3), and analytics/offline/polish (7B.4).

---

## 1. Free vs Pro model (final)

**Free tier (calibrated to convert, not to frustrate):**
- Unlimited: quizzes, reading materials, flashcards review (SRS), leaderboards, community, courses browsing.
- **10 AI tokens per day** shared bucket across:
  - 1 token = 1 AI explanation / 1 summary paragraph / 1 TTS audio request / 1 AI study pack section / 1 tutor AI chat reply.
- Hits zero → soft paywall sheet: *"You've used today's 10 free AI tokens. Upgrade to Pro for unlimited AI, or come back tomorrow."*
- Resets at 00:00 WAT.

**Pro tier (₦2,500 / month — single plan to start):**
- Unlimited AI everything, audio downloads, advanced analytics, priority tutor chat, badge on profile.
- 30 days from activation date.

This gives students real value free (they can study all day) but the AI features — which are the magic — create the upgrade pressure.

---

## 2. Payment flow — Paystack (automatic) + manual fallback

### Primary: Paystack inline checkout
1. Student taps **Upgrade to Pro** on `/subscription`.
2. Paystack popup opens (card / bank transfer / USSD / Opay / Moniepoint).
3. On success, Paystack calls our `paystack-webhook` edge function.
4. Webhook verifies signature with `PAYSTACK_SECRET_KEY`, calls `activate_pro_subscription` RPC.
5. User's `plan_id` flips to `pro`, `expires_at = now() + 30 days`. UI updates in real-time via Supabase subscription.
6. Receipt email sent via Resend.

**Why Paystack over Moniepoint manual:** instant activation, no admin work per payment, students trust the in-app flow, ~1.5% fee is worth it. Your Moniepoint account `8145472586` becomes a **settlement account** — Paystack deposits the net amount there automatically.

### Fallback: Manual transfer + receipt upload
For students with card issues:
- "Pay by bank transfer" button → shows your Moniepoint details (`8145472586 Joshua Abayomi`).
- Student uploads receipt screenshot to `payment-proofs` bucket.
- Admin sees pending requests in `/admin/payments`, can **Approve** (activates Pro 30 days) or **Reject** (with reason).
- Already half-built (`payment_requests` table + `SubmitPaymentDialog` exist) — we just wire admin actions + notifications.

---

## 3. Seed data (combining your requests = heavy realistic seed)

You'll get:
- **1 admin account** — you give me email + password before I run the seed.
- **4 approved tutor accounts** with TUT-XXXX codes, profile photos, bios.
- **1 Pro demo student** (`plan_id=pro`, expires in 30 days) so you can showcase the Pro experience.
- **3 demo free students** to populate leaderboard.
- **12 FUTA courses** spread across faculties (Computing, Engineering, Sciences, Management).
- **60 quizzes** (5 per course), each with 8–15 MCQs, mix of difficulties.
- **~40 flashcard decks** tied to courses.
- **6 sample audio lessons** (short TTS-generated).
- **Seeded activity** — fake quiz attempts spread over the last 14 days so the leaderboard and activity feed look alive on day one.

Done via one idempotent `seed-launch-data` edge function so it's safe to re-run.

---

## 4. Implementation steps

### Database (single migration)
- Add `subscription_plans` row: `pro` at `250000` kobo (₦2,500) NGN, 30-day cycle.
- Update `user_subscriptions` to support `pro` plan.
- New table `payment_transactions` (paystack reference, amount, status, user_id, raw payload).
- New columns on `profiles`: `daily_ai_tokens_used`, `daily_ai_tokens_reset_at`.
- RPC `consume_ai_token(_user_id, _kind)` — atomically increments, returns `{allowed, used, remaining}`. Pro users always get `allowed=true`.
- RPC `activate_pro_subscription(_user_id, _months, _source, _reference)` — used by webhook and admin approval.
- RPC `admin_change_plan(_user_id, _plan, _days)` — admin override (for refunds, gifts, manual approvals). Audit-logged.
- Trigger: nightly reset of `daily_ai_tokens_used`.

### Edge functions
- `paystack-init` — creates a transaction, returns `authorization_url` + `reference`.
- `paystack-webhook` — verifies HMAC SHA512 with `PAYSTACK_SECRET_KEY`, idempotent on reference, calls `activate_pro_subscription`.
- `seed-launch-data` — idempotent seed runner.

### Secrets needed (I'll ask via add_secret)
- `PAYSTACK_SECRET_KEY` (you create at paystack.com → Settings → API Keys)
- `PAYSTACK_PUBLIC_KEY` (publishable, stored in code)

### Frontend
- Replace existing `Subscription.tsx` Pro plan card → wire to Paystack inline (`@paystack/inline-js`).
- Rewrite `usePremium` / `useTokenBalance` to call new RPCs.
- Hook `consume_ai_token` into every AI call site (AI tutor, summary, TTS, study pack, explanation). If `allowed=false`, open `SoftPaywallSheet`.
- Add **Pro badge** to profile + leaderboard.
- New admin page `/admin/payments` — pending receipts list + Approve/Reject buttons + override "Change plan" action per user.
- Top-bar wallet chip already exists — point it at the new daily-tokens RPC.

### Notifications
- Pro activated → push + email + in-app.
- Receipt approved/rejected → notification.
- 3 days before Pro expires → reminder push.

---

## 5. What I need from you before I start building

1. **Admin login** — what email + password should I create the admin account with?
2. **Paystack account** — sign up at paystack.com (free, 5 minutes), then I'll request `PAYSTACK_SECRET_KEY` via the secret prompt. Your Moniepoint `8145472586` is added inside Paystack as your settlement account.
3. **Confirm the Pro price** — I've defaulted to **₦2,500/month**. Common alternatives: ₦1,500 (aggressive), ₦3,000 (premium), ₦5,000 (semester pass). Tell me if you want a different number.
4. **Confirm daily free quota** — I've defaulted to **10 AI tokens/day**. Want it higher (15) or lower (5)?

Once you confirm those four, I'll switch to build mode and ship 7B.1 end-to-end. Phases 7B.2 → 7B.4 follow after you've tested the money flow with a real student.
