## Problem

1. **Unlock Quiz button doesn't actually deduct tokens / unlock.**
   The `unlock_quiz` SQL function reads and decrements `profiles.ai_token_balance`, but the rest of the app (wallet chip, `useTokenBalance`, `useAIPricing`, paywall) lives on `token_wallets.balance` + `ai_usage_daily` (the 3-free-daily system via `consume_ai_token`). So the sheet shows e.g. "10 tokens" from the wallet, but the RPC checks an unrelated profile column that is 0 → returns `insufficient` (or, when it does work, the wallet balance never changes and the unlock looks like a no-op).

2. **Study Pack PDFs currently auto-download.** You want them view-only in the student's browser so they can't easily redistribute the file.

## Plan

### 1. Rewrite the `unlock_quiz` RPC (DB migration)
- Use the canonical `consume_ai_token('unlock_quiz')` flow so it:
  - spends a free daily action first when available, otherwise debits `token_wallets.balance` at the price from `ai_pricing` (currently 2 tokens),
  - writes a `token_transactions` / `wallet_transactions` row,
  - returns `allowed=false, reason='insufficient', cost, balance` when the user is short.
- On success, insert/`ON CONFLICT DO NOTHING` into `quiz_unlocks` and return `{ allowed:true, cost, balance, already_unlocked? }`.
- Idempotent: if `quiz_unlocks` row already exists, return `allowed:true` with `cost:0` and do **not** consume a token.

### 2. Wire the UI so the unlock visibly works
- `UnlockQuizSheet` already calls `unlock()` from `useQuizUnlock` and the hook invalidates `token-balance` + `wallet-profile`. After the RPC fix, the wallet chip will drop by 2 (or by 0 if a free action covered it) and `QuizPractice` will reload and start the quiz.
- When `unlock()` returns `reason==='insufficient'`, auto-close the sheet and route to `/wallet` with a toast "Top up to unlock this quiz" (instead of the current static "Top up" button only being visible when balance is low before clicking). This covers the race where the wallet looked fine but a parallel spend drained it.
- Make sure `QuizPractice` clears `needsUnlock` and refetches questions immediately on success (it already does — verify after the RPC change).

### 3. Make Study Pack export browser-view only
In `src/lib/exportStudyPack.ts` and `ExportStudyPackDialog.tsx`:
- Replace `doc.save(...)` with `window.open(doc.output('bloburl'), '_blank')` so the PDF opens in a new browser tab using the native PDF viewer — no file is written to disk by us. (Users can still use the browser's own "Save" button; that's unavoidable in a web app, but we stop pushing a download.)
- Drop the Markdown format option from the dialog (Markdown is a plain text download — defeats the "view only" intent). Keep PDF as the only format, with the existing OverraPrep gold cover + footer watermark on every page.
- Update the dialog button label from "Download" to "Open PDF" and the success toast to "Study pack opened in a new tab".
- Keep the existing `pdf_export` / `study_pack_generate` token gates exactly as they are.

### 4. Verify
- After migration, run `unlock_quiz` from an authenticated test session in the SQL editor to confirm it: (a) blocks when balance < 2 and free is exhausted, (b) consumes free first, (c) debits wallet on the 4th action of the day, (d) is idempotent.
- In the preview: top up a test account, unlock a tutor quiz — wallet chip should drop by 2, sheet closes, quiz loads. Replaying the same quiz must not deduct again.
- Open the Study Pack export — confirm it opens in a new tab and no file is auto-saved.

### Files touched
- DB migration: replace `public.unlock_quiz(uuid)`.
- `src/hooks/useQuizUnlock.ts` — route to `/wallet` on `insufficient`.
- `src/components/student/UnlockQuizSheet.tsx` — minor wording.
- `src/lib/exportStudyPack.ts` — open-in-tab instead of download; remove markdown export (or keep function but stop calling it).
- `src/components/study-hub/ExportStudyPackDialog.tsx` — PDF-only, "Open PDF" label.

### Out of scope
- Tutor-priced quiz purchases via `PurchaseQuizDialog` (separate Naira/wallet flow) — not touched.
- Watermarking the PDF with the student's name (can be added later if you want stronger leak deterrence).
