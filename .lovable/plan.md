
# Launch Polish — Free Daily Tokens, Magic-Link Verify, Dashboard Beautify

Three things, done carefully so nothing already working breaks.

---

## 1. Bring back 3 free tokens per day (on top of the wallet)

**The model**
- Every student gets **3 free AI actions per day**, resets at 00:00 WAT.
- Free uses cover **every** AI/quiz action — same scope as paid tokens (quiz attempts, AI explanation, AI summary, quiz gen, flashcards, study pack, study coach, tutor AI chat, mock exam, TTS). No "light vs heavy" split — keeps it simple.
- Spend order on each action: **free quota first → then wallet tokens**.
- When **both** are empty → `SoftPaywallSheet` opens with two clear CTAs:
  1. **"Top up wallet"** (₦250 = 5 tokens, existing Flutterwave flow)
  2. **"Come back tomorrow"** with a live countdown to midnight WAT (closes the sheet)

**Live visibility (what the student sees)**
- `TokenBalanceCard` (top of dashboard) gets a second row: **"⚡ 3/3 free today"** next to the wallet balance. The number ticks down in real time after each action.
- `MobileGreetingHeader` wallet pill expands to show **`⚡ {balance} · {freeLeft}/3 free`**. Pill turns amber when `freeLeft === 0 && balance < 3`.
- Toast after each action:
  - Free use: `"Free use · {freeLeft}/3 left today"`
  - Token use: `"−1 token · {balance} left in wallet"`
- `/wallet` page gets a "Today's free uses" strip above transactions with a small progress bar (3/3 → 0/3) and reset timer.

**Backend changes (one migration)**
- `consume_ai_token(_kind)` RPC updated:
  1. Lazy daily reset: if `daily_free_reset_at < today (Africa/Lagos)` → set `daily_free_used = 0`, `daily_free_reset_at = now()`.
  2. If `daily_free_used < 3` → increment, return `{allowed:true, source:'free', balance, free_left}`.
  3. Else if `ai_token_balance >= 1` → debit 1 token, return `{allowed:true, source:'token', balance, free_left:0}`.
  4. Else → `{allowed:false, balance:0, free_left:0}`.
- Free uses log a `wallet_transactions` row with `kind='spend'`, `tokens=0`, `action_kind=_kind` (for analytics + admin visibility).
- No price change. Wallet stays ₦50 = 1 token, min top-up ₦250.

**Frontend changes**
- `usePremium.ts`: re-add `freeLeft` / `dailyLimit=3` to query + return; update `requireToken` to surface `source` and toast accordingly.
- `TokenBalanceCard.tsx`: add free-uses row + reset countdown.
- `MobileGreetingHeader.tsx`: expand wallet pill to show free count.
- `SoftPaywallSheet.tsx`: add second "Come back tomorrow · resets in {hh:mm}" CTA next to top-up tiles.
- `Wallet.tsx`: add today's-free strip.

---

## 2. Email verification → magic link (instead of 6-digit code)

Right now new signups receive a numeric OTP. Switch to a one-click verification link.

- Update `auth-email-hook` signup template (`supabase/functions/_shared/email-templates/signup.tsx`) to render the `{{ .ConfirmationURL }}` as the primary CTA button. Keep the OTP as a tiny fallback line ("Or use code: ###") so nothing breaks if a user is on an old client.
- `src/pages/Auth.tsx`: when `signUp()` succeeds, show "Check your email and tap the verification link" instead of the code-entry field. Remove the OTP input UI from the signup path (keep it available for password recovery if used).
- `Auth.tsx` already handles the redirect-back session via `onAuthStateChange`, so no extra route is needed. `emailRedirectTo` stays `${window.location.origin}/`.

---

## 3. Dashboard beautify + responsive launch polish

Keep the current design language (white + gold + Inter, the look you already love). Tighten it, not redesign it.

**Top of dashboard (priority order, mobile-first)**
1. `MobileGreetingHeader` (existing) — avatar + greeting + streak/level/wallet pills.
2. `TokenBalanceCard` (existing, upgraded) — wallet balance + free-uses row + Top-up CTA. Becomes the visual anchor: bigger gold-gradient surface, profile avatar inset on the left, clear ₦-value subtitle, single primary CTA.
3. `StudyPackHero` (existing) — keep.
4. `QuickActions` 6-tile grid — audit spacing so it's 2 cols on ≤360 px (currently feels cramped on 370 px).

**Responsive sweep (every breakpoint from 320 → 1920)**
- Container padding: `px-4` mobile → `px-6` sm → `px-8` lg. Currently inconsistent.
- All cards use `rounded-2xl` + `shadow-[0_4px_20px_-8px_rgba(180,140,40,0.18)]` for a uniform gold-tinted depth.
- Touch targets ≥44 px on mobile (audit `QuickActions`, pill buttons, header icon buttons — most are fine, a few are 36-40 px).
- Bottom nav: confirm safe-area inset padding so FAB doesn't clip on iPhone notches.
- `/wallet`, `/subscription` (→ redirect), `/install`, `/notifications` all get the same container rhythm.

**Beautify, lightly**
- Gold gradient refinement on `TokenBalanceCard` (subtle radial highlight top-left).
- Soft entrance stagger (framer-motion, already in the project) on dashboard sections — 60 ms delay each, max 240 ms total. No new dependencies.
- Empty states on `/wallet` transactions get a small illustration + "Top up to get started" CTA.

**Not touching:** splash, onboarding, tutor pages, admin — those are stable per memory and out of scope.

---

## Technical details

- **One DB migration:** update `consume_ai_token` RPC only. No new tables, no schema changes.
- **No new edge functions.** `flutterwave-*` and email functions are unchanged in behavior (signup template body changes, that's it).
- **Files touched (~9):**
  - `supabase/migrations/<new>.sql`
  - `src/hooks/usePremium.ts`
  - `src/components/student/dashboard/TokenBalanceCard.tsx`
  - `src/components/student/MobileGreetingHeader.tsx`
  - `src/components/student/SoftPaywallSheet.tsx`
  - `src/pages/student/Wallet.tsx`
  - `src/pages/student/StudentDashboard.tsx` (spacing + stagger)
  - `src/pages/Auth.tsx` (magic-link UX)
  - `supabase/functions/_shared/email-templates/signup.tsx`
- **Memory update:** revise Core rule — "Prepaid Wallet" now reads "3 free AI actions/day + wallet (₦50 = 1 token, min top-up ₦250)."

---

## Out of scope (call out so you can confirm)

- Bonus tokens on bigger top-ups, referral token rewards, auto-recharge — not in this round.
- Tutor revenue share on token spend — stays 100% platform per earlier decision.
- Any redesign of splash, onboarding, tutor or admin areas.

Reply **"go"** to build, or tell me what to change (e.g. "make it 5 free not 3", "drop the come-back-tomorrow CTA", "keep OTP code option visible").
