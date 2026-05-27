## Goal
Make the dashboard surface the highest-value learning tools first: rename **Ask AI → Overra AI** with a bold tagline, and promote **Theory Prep** and **Study Hub** so students see them the moment they land on `/student/dashboard`.

## Changes

### 1. Rename "Ask AI" → "Overra AI" with a striking tagline
File: `src/components/student/dashboard/QuickActionsGrid.tsx`

- Update the tile label from `Ask AI` to `Overra AI`.
- Replace the plain `Get help` hint with a sharper line. Options (pick one — defaulting to the first):
  - **"Deep Intelligence. Instant Clarity."**
  - **"Cognitive Engine for Exam Mastery."**
  - **"Reason. Reveal. Revise."**
- Slightly emphasize this tile visually (gold gradient ring + `Sparkles` icon kept) so it reads as the flagship action without breaking the calm grid.

### 2. Promote Theory Prep + Study Hub to primary quick actions
File: `src/components/student/dashboard/QuickActionsGrid.tsx`

Add two new tiles into `BASE_PRIMARY` (before Listen/Summary):
- **Study Hub** → `/study-hub` — icon `Library`, hint *"Past questions hub"*
- **Theory Prep** → `/theory` — icon `PenLine`, hint *"AI-graded answers"*

Grid already responsively wraps (2-col mobile, 3-col tablet, 4-col desktop) so two more tiles fit cleanly. The "More" sheet still holds Wallet / Premium / Referrals.

Resulting primary order:
```
Quick Start · Practice · Overra AI · Study Hub · Theory Prep · Flashcards · Listen · Summary · More
```

### 3. New "Key Features" spotlight strip (above Quick Actions)
File: `src/components/student/dashboard/KeyFeaturesStrip.tsx` (new)
Wire into: `src/pages/student/StudentDashboard.tsx` (render between `StudyPackHero` and `QuickActionsGrid`)

A compact 3-card horizontal strip highlighting the platform's flagship intelligence:
1. **Overra AI** — "Deep Intelligence. Instant Clarity." → `/ai-tutor`
2. **Study Hub** — "Past Questions, Decoded." → `/study-hub`
3. **Theory Prep** — "Write. Get AI-Graded. Improve." → `/theory`

Styling: white cards, gold accent border-left, `font-display` headline, one-line tagline, subtle hover lift. Horizontal scroll on mobile, 3-column grid on `sm:` and up. Uses existing semantic tokens (`amber-*` already used across dashboard) — no new colors.

## Out of scope
- No backend, routing, or business-logic changes.
- No edits to `Index.tsx` landing page.
- No rename of the underlying `/ai-tutor` route or page title.

## Technical notes
- All new copy lives in component files (no i18n layer in project).
- New `KeyFeaturesStrip` is self-contained, framer-motion-animated like sibling sections, and uses `lucide-react` icons already in the bundle (`Sparkles`, `Library`, `PenLine`).
- No new dependencies.
