
## Goal
Get GNS 106 German practice live before tomorrow's paper. Two deliverables:

1. A **ready-to-upload German question Excel** (your bulk template, pre-seeded with ~60 sample GNS 106 questions across the balanced 40/40/20 difficulty mix) you can extend, edit, and upload via the existing tutor bulk uploader.
2. A **"GNS 106 — German (Tomorrow)" promo card** on the student dashboard, just like the MTS 102 card, that deep-links into the quiz once you publish it.

## What you'll get in the Excel

File: `GNS106_German_Starter.xlsx` (saved to `/mnt/documents/` so you can download it immediately).

It uses the **exact column headers your tutor bulk uploader already accepts** (so it imports with zero friction):

| Column | Notes |
|---|---|
| `quiz_title` | Pre-filled: `GNS 106 — German (Practice)` so all rows group into one quiz on import |
| `question_text` | The German MCQ stem |
| `option_a` … `option_d` | Four choices |
| `correct_option` | A / B / C / D |
| `explanation` | Short English+German reason |
| `difficulty` | easy / medium / hard (40/40/20 spread) |
| `year` | Blank — fill if you have past-question year |

Two sheets:
- **Questions** — 60 seed rows (greetings, articles der/die/das, pronouns, sein/haben conjugation, numbers, time, vocabulary, simple reading). You can delete, edit, or extend.
- **Instructions** — column guide + how to upload (Tutor → Upload Questions → drop file).

## Promo card on dashboard

New component `GNS106GermanCard.tsx` modeled after `TomorrowExamCard.tsx`:
- Queries the course by `ilike('code', 'GNS%106%')` and surfaces the newest published GNS 106 quiz.
- Shows: "Tomorrow · German paper" + "Practice now" button → `/quiz/:id/practice`.
- If no GNS 106 quiz is published yet, the card hides itself (no broken state).
- Mounted on `StudentDashboard.tsx` directly under the existing `TomorrowExamCard`.

## Why a starter bank instead of waiting

You said you'll upload your own — perfect. But tonight is tight, so the 60 seed questions give students *something* to drill the moment they open the app, and you can:
- **Replace** the sample rows with your real past questions in the same file, or
- **Append** your rows below the samples and re-upload (uploader dedupes nothing — so to fully replace, just delete the seed rows first).

## Files

- create `/mnt/documents/GNS106_German_Starter.xlsx` (delivered as a download artifact)
- create `src/components/student/dashboard/v2/GNS106GermanCard.tsx`
- edit `src/pages/student/StudentDashboard.tsx` (mount card under TomorrowExamCard)

## Not in scope

- No DB/schema changes — uses existing `quizzes` / `questions` tables and existing tutor bulk import flow.
- No auto-seeding into Supabase from the agent — you upload the Excel yourself so attribution stays under your tutor account.

## My advice for tomorrow's paper

- **Folder the bank by topic later** (Greetings, Articles, Verbs, Numbers, Reading) using `quiz_title` per group — your AllQuizzes "By course" folder view will then show each topic as its own sub-quiz inside GNS 106.
- **Keep explanations bilingual** (German sentence + 1-line English gloss) — the post-quiz AI explanation feature then has good grounding.
- **Add 5–10 reading-comprehension items last** (short passage + 2–3 questions each) since GNS 106 always tests this.
- **Publish before 9pm** so the `daily-study-reminder` push tonight at 17:00 UTC nudges inactive students into the GNS 106 quiz.

Approve and I'll generate the Excel, drop the download link in chat, and wire the dashboard card.
