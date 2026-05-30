# Prepaid Wallet Model — Replace ₦2,000/mo Pro

## The model in plain English

- **Wallet is the only way to pay.** Pro subscription is removed entirely.
- **1 token = ₦25.** Every paid action on the app deducts exactly **1 token** from the wallet — quiz attempt, AI explanation, AI summary, AI quiz generation, flashcards, study pack, study coach, tutor AI chat message, mock exam, notes-to-audio (TTS).
- **5 free light actions per day** for every student (resets at 00:00 WAT). Free covers: quiz attempts, AI explanations, tutor AI chat messages. Once exhausted, those also cost 1 token.
- **Heavy actions are always 1 token, no free quota:** AI summary, AI quiz generation, flashcards, study pack, study coach, mock exam, TTS / notes-to-audio.
- **Exceptions (always free):** quizzes that a tutor or admin explicitly marks free, browsing, leaderboards, SRS review, bookmarks, community, profile.
- **Top-ups:** ₦100 (4 tokens), ₦300 (12), ₦500 (20), ₦1,000 (40), ₦2,000 (80), + custom amount (min ₦100, rounded to nearest ₦25). Paid via existing Flutterwave flow.
- **Tutor revenue split for token spend:** 100% platform. Tutors continue to earn from paid live sessions, storefronts, payouts (existing flows untouched).
- **Hard cutover:** existing Pro/trial flags are wiped. Everyone starts on the wallet with 5 free/day. Any unspent token balances already in `profiles.ai_token_balance` are kept.

## Student UX

1. **Wallet chip** in `MobileGreetingHeader` shows "⚡ {balance} • {free_left}/5 free". Tapping opens `/wallet`.
2. **`/wallet` page** — current balance in tokens + ₦ equivalent, top-up cards (₦100/₦300/₦500/₦1k/₦2k + custom input), transaction history (debits and credits), "How tokens work" explainer.
3. **Action attempt flow:**
   - Light action + free quota left → runs free, decrements `daily_free_used`.
   - Light action + no free quota + balance ≥ 1 → spends 1 token, toast "−1 token · {balance} left".
   - Heavy action + balance ≥ 1 → spends 1 token, toast.
   - Balance = 0 → `SoftPaywallSheet` opens with top-up CTA (no Pro upsell).
4. **`TeaserPaywall`** still wraps premium outputs (frosted preview) — now CTA says "Spend 1 token to unlock" instead of "Upgrade to Pro".
5. **Low-balance nudge:** when balance drops below 3, header chip turns amber; toast suggests topping up.

## Admin UX

- **`/admin/payments`** rebuilt for wallet world: list of top-ups (student, ₦ amount, tokens credited, status, txn id), stats cards (Today ₦, This Week ₦, This Month ₦, Total ₦), search by name/email, CSV export, manual credit-tokens action per user (with audit log).
- **`/admin/tokens`** small page: search any student → see balance, daily-free-used, lifetime spent, manual adjust (+/− with reason → audit log).
- Existing subscription pages/tabs are removed from admin nav.

## Technical changes

### Database (one migration)
- `profiles`: keep `ai_token_balance` (int). Add `daily_free_used` (int default 0), `daily_free_reset_at` (timestamptz). Drop `trial_ends_at`, `first_purchase_used`, `is_pro` (also drop dependent function); active subscriptions in `subscriptions` table marked `status='ended'` (data kept for history).
- New table `wallet_transactions(id, user_id, kind enum['topup','spend','admin_credit','admin_debit','refund'], tokens int, naira_amount int null, action_kind text null, ref_id text null, created_at)`. GRANTs + RLS (user reads own; admin all; service_role all).
- Update RPC `consume_ai_token(_kind text)`:
  - Resets `daily_free_used` if last reset < today (Africa/Lagos).
  - If `_kind` ∈ light set AND `daily_free_used < 5` → increment counter, log row with `kind='spend'` and `tokens=0`, return `{allowed:true, source:'free', balance, free_left}`.
  - Else if `ai_token_balance >= 1` → decrement balance, insert spend row, return `{allowed:true, source:'token', balance, free_left}`.
  - Else return `{allowed:false, balance:0, free_left:0}`.
- New RPC `credit_wallet(_user_id, _tokens, _naira, _ref_id, _kind)` — idempotent on `(ref_id, kind)`.
- New RPC `admin_adjust_wallet(_user_id, _delta_tokens, _reason)` — admin only, writes wallet_transactions + audit_logs.
- Cron-less daily reset handled lazily inside `consume_ai_token` (check on every call).

### Edge functions
- `flutterwave-init`: accept `{ amount_naira }` (min 100), compute `tokens = floor(amount / 25)`, store pending row, return checkout URL. Remove Pro plan logic.
- `flutterwave-webhook`: on success → call `credit_wallet` with `ref_id = flw_tx_id`, `kind='topup'`. Remove `activate_pro` call.
- Receipt email via existing Resend function: "₦{amount} added · +{tokens} tokens · Balance {new_balance}".

### Frontend
- `usePremium` → renamed conceptually to `useWallet` (keep file path to avoid churn, but export `{ balance, freeLeft, requireToken(kind), refetch }`). `requireToken` calls `consume_ai_token`; on `allowed:false` opens `SoftPaywallSheet`.
- `SoftPaywallSheet`: replace Pro card with top-up tiles (₦100/₦300/₦500/₦1k/₦2k + custom) → calls `flutterwave-init`.
- `TeaserPaywall`: copy → "Spend 1 token to unlock {label}" + balance display + top-up link if balance 0.
- `DailyCreditsChip` → `WalletChip`: shows `⚡ {balance} · {free_left}/5`.
- New page `/wallet` (student): balance hero, top-up tiles, transactions list.
- `/subscription` page repurposed → redirects to `/wallet`.
- All AI/quiz trigger points already wired to `requireCredit`/`requireToken` continue to work — only the RPC contract changes. Audit each call site, pass correct `kind` ('quiz_attempt', 'ai_explanation', 'ai_summary', 'ai_quiz_gen', 'flashcards', 'study_pack', 'study_coach', 'tutor_chat', 'mock_exam', 'tts'). Light set = `quiz_attempt`, `ai_explanation`, `tutor_chat`.
- Admin: rebuild `/admin/payments` (wallet top-ups), add `/admin/tokens` (manual adjust). Remove subscription nav items.

### Cleanup
- Remove `subscription_plans` reads from UI (table stays for history).
- Remove `activate_pro`, `grant_signup_trial`, `admin_extend_pro` RPCs.
- Update memory: replace Hybrid Access Mode + Phase 10.1 entries with "Prepaid Wallet" rule.

## Files touched (estimate)
- 1 SQL migration
- 2 edge functions edited (`flutterwave-init`, `flutterwave-webhook`)
- ~6 components: `usePremium`, `SoftPaywallSheet`, `TeaserPaywall`, `DailyCreditsChip`→`WalletChip`, `MobileGreetingHeader`
- 3 pages: new `/wallet`, rebuilt `/admin/payments`, new `/admin/tokens`; `/subscription` → redirect
- Memory index update

## Out of scope (this round)
- Bonus tokens on bigger top-ups
- Referral token rewards
- Tutor revenue share on token spend (locked at 100% platform per your decision)
- Auto-recharge / saved card

Reply "go" to build, or tell me what to change.
