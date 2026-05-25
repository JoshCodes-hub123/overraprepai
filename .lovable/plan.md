# Smart Summary PDF for students

Let students upload a course PDF / Word / TXT (or paste notes), get an AI-generated study summary on screen, and — if they're a verified student — download it as a beautifully branded **OverraPrep AI** PDF that already carries their name. Built for the "1 day to exam" moment.

## What the student sees

A new page at **`/student/smart-summary`** (and a dashboard quick-action tile "Smart Summary").

1. **Upload card** — drop a PDF / DOCX / TXT or paste notes. Reuses the existing `extractText.ts` (pdfjs-dist + mammoth) used by Audio Learning, so it works offline-side for parsing.
2. **Choose style** — three modes (toggle each time):
   - Crash-course bullet points
   - Structured study notes
   - Q&A flashcard style
3. **Generate** → AI returns markdown; rendered on screen in a clean reader (everyone can read this free preview).
4. **Download branded PDF** button:
   - Verified students → instant download.
   - Unverified students → small inline prompt: "Verify your student profile to download the branded PDF" with a link to their profile / verification flow. They can still copy the on-screen summary.

The dashboard FAB / quick-actions also gets a "Smart Summary" entry so it surfaces clearly.

## What the PDF looks like

Three brand spots, exactly as requested:

```text
+---------------------------------------------+
| [LOGO]  OVERRAPREP AI · STUDY NOTES         | <- header (spot 1)
| ------------------------------------------- |
|  Title of the material                      |
|  Style: Crash-course bullets                |
|  Prepared for: Jane Doe ✓ Verified Student  |
|  Matric: FUT/22/12345 · 25 May 2026         |
| ------------------------------------------- |
|                                             |
|  • Key point                                |
|  • Key point                                |
|                                             |
|        [faded LOGO + "OverraPrep AI"]       | <- diagonal watermark (spot 2)
|                                             |
| ------------------------------------------- |
| [logo] Generated with OverraPrep AI  · Page x/y | <- footer (spot 3)
+---------------------------------------------+
```

- White + Gold + Inter (Helvetica fallback in jsPDF), matches the locked visual system.
- Watermark uses `OverraPrep AI` text + tiny logo at 8% opacity, diagonal at -28°.
- "Prepared for" line uses the student's `full_name`; the ✓ badge only renders for verified students.

## Who counts as verified

The `profiles` table has no `is_verified` column today, but it already has a clear FUTA signal. Verified = `onboarding_completed = true` **and** `matric_no` is set **and** `university` is set. A small helper `isVerifiedStudent(profile)` will live in `src/lib/profileCompleteness.ts` so we can swap to a real `is_verified` flag later without touching callers.

## Implementation outline (technical)

### Frontend
- `src/pages/student/SmartSummary.tsx` — upload → style picker → generate → reader + download. Lazy-loaded route in `App.tsx`.
- `src/components/student/SummaryReader.tsx` — markdown renderer with a top "Download branded PDF" button. Shows a gated state for unverified users.
- Reuse `extractTextFromFile()` from `src/lib/extractText.ts`.
- Extend `src/lib/exportSummaryPdf.ts`:
  - Accept `logoDataUrl`, `studentName`, `verified`, `matricNo`, `style` props.
  - Embed `/logo.png` (preloaded to a data URL) in header, watermark center, and footer.
  - Render the "Prepared for: NAME ✓ Verified Student" line on cover.
- Dashboard QuickActions: add "Smart Summary" tile linking to the new route.

### Backend
- New edge function **`summarize-material`** (`supabase/functions/summarize-material/index.ts`):
  - Validates JWT, takes `{ content, style, title }`, caps content at ~24k chars.
  - Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with a strict prompt per style.
  - Handles 429 / 402 the same way as `generate-quiz-from-text`.
  - Logs an `analytics_events` row `smart_summary_generated` for the observability stack.
- No DB schema change needed for v1 (PDF is generated client-side). Optional follow-up: persist generated summaries to a `student_summaries` table; not in this plan.

### Verification helper
- Add `isVerifiedStudent(profile)` to `src/lib/profileCompleteness.ts`.
- Used in `SmartSummary.tsx` and surfaces a small "Verify to download" CTA when false.

## Out of scope (kept simple on purpose)
- Saving summaries to the user's Personal Library (can be added later — same `user-resources` bucket).
- Multi-file merge (one file or one paste per run).
- Sharing the PDF publicly.

## Files touched
- **New:** `src/pages/student/SmartSummary.tsx`, `src/components/student/SummaryReader.tsx`, `supabase/functions/summarize-material/index.ts`
- **Edited:** `src/lib/exportSummaryPdf.ts` (logo + verified line), `src/lib/profileCompleteness.ts` (verified helper), `src/App.tsx` (route), dashboard QuickActions component (new tile).
