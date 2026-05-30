
# Launch polish: Official badge + Opportunities glow-up + Dashboard smoke-test

Four shipped outcomes, in this order. No business-logic or token changes — pure frontend/presentation + a tiny realtime ticker query.

---

## 1. Official badge (gold, everywhere it matters)

Render a gold "Official" badge anywhere a profile surfaces, gated by `profiles.is_official = true` (already in DB).

- **New component** `src/components/profile/OfficialBadge.tsx` — gold gradient pill, `Verified` (lucide BadgeCheck) icon, sizes `xs | sm | md`, matches the existing `PremiumBadge` visual language but in OverraPrep gold (no purple).
- **Wire into**:
  - `PublicProfile`, `EditProfile` header
  - Tutor cards: `TutorAttribution`, `FavoriteTutors`, `StorefrontPublic`, `CourseHub` tutor strip
  - Quiz / material author lines wherever `profile.full_name` is rendered
  - Announcement author chip
  - Chat / DM author names in `ThreadView` and `Inbox`
- A single `useIsOfficial(userId)` hook reads from a memoized React Query cache so we don't N+1.

---

## 2. Opportunity Hub — make it a place tutors and partners want to be featured

Treat `/opportunities` and `/opportunities/:id` as the marquee surface.

### `/opportunities` (list)
- Editorial hero band at the top: large display headline ("Scholarships, internships & competitions, curated for Nigerian students."), soft gold gradient with subtle noise texture, count badge ("12 live this week"), and a primary "Submit your program" CTA → opens existing `SuggestOpportunityDialog`.
- Featured rail: top 3 opportunities by `deadline ASC` rendered as large bento cards with cover image, category chip, organization wordmark, deadline countdown, and amount/level chips.
- Category chips become pill segmented control (sticky on scroll), with counts per category.
- Cards: upgrade `OpportunityCard` to glass surface, taller cover with gradient scrim, deadline pill in top-right (green > 14 days, amber 3–14, red < 3), bookmark heart, "New" gold badge for `created_at < 48h`, and a hover lift.
- Empty/saved states get illustrated gold icons.

### `/opportunities/:id` (detail)
- Magazine layout: full-bleed cover (with `object-cover` blur scrim fallback when missing), breadcrumb back, sticky right-rail "Apply" card with deadline countdown, eligibility checklist (uses existing `recommend_opportunities` match signals to show ✅ "Matches your department", etc.), share-to-WhatsApp, copy-link.
- Body uses prose typography (Inter), pull-quote treatment for organization mission, related opportunities at bottom.
- "Posted by OverraPrep ✓" line uses the new OfficialBadge.

### Dashboard preview (`OpportunityHubPreview`)
- Promote to a richer cardset: keep small footprint but add hero card + 3 mini cards layout on `sm:` and up.

---

## 3. Live opportunities ticker (the "scrolling notifications" the user asked for)

A single horizontal marquee strip the student sees on:
- Student dashboard (just below `TokenBalanceCard`)
- `/opportunities` page top

**Component**: `src/components/opportunities/OpportunityTicker.tsx`
- Pulls latest 8 published opportunities (`useOpportunities({ limit: 8 })`).
- Realtime: subscribes to `opportunities` table — new INSERT prepends an item and triggers a gold flash + tiny chime (uses existing celebrate util, no new audio).
- CSS marquee (Tailwind keyframe `animate-marquee` added to `tailwind.config.ts`), pauses on hover/touch, gradient fade-mask on both edges.
- Each item: 🎓 icon → "New scholarship · MTN Foundation · closes in 14d" → tap routes to detail.
- Respects `prefers-reduced-motion` (falls back to static carousel with auto-rotate every 6s).

---

## 4. Dashboard smoke-test + polish pass

Walk every dashboard against the seeded data and fix anything that doesn't render cleanly. No business-logic changes — only presentation/empty-state/responsiveness fixes.

Routes audited (370px and 1280px):
- `/student/dashboard` — confirm `CourseQuizzesSection` shows the 3 seeded courses with the 2 quizzes each; `OpportunityHubPreview` shows the 5 scholarships; new ticker renders.
- `/tutor/dashboard` (math/physics/chem accounts) — confirm seeded quizzes, curriculum, announcement appear; tutor profile shows OfficialBadge.
- `/admin/*` — confirm the 4 official accounts visible in users list with badge.
- `/opportunities` & `/opportunities/:id` — new design.
- `/courses` & `/courses/:id` — confirm seeded curricula render.

Fixes applied as needed (typical findings: padding on small screens, sticky-header overlap, empty-state copy, broken image fallbacks). Each fix is small and surgical — listed in the final summary.

---

## Out of scope

- No token economy / paywall changes.
- No new database tables. (`is_official`, `opportunities`, `profiles` already exist.)
- No new edge functions.
- No auth changes.
- No payment changes.

## Deliverable

A short post-flight summary listing: badge component + wire-in sites, opportunities list/detail/ticker files, every smoke-test fix made, and 4 before/after screenshots (dashboard, opportunities list, opportunity detail, tutor profile with badge).
