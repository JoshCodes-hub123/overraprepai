## Goal

Seed, as the admin account, a polished demo course with every tutor-side resource populated, plus a set of scholarship & opportunity entries so the student dashboard lights up. All data, no schema or code changes. Easy to wipe later.

## Owner / cleanup

- Author: existing admin `admin@test.overraprep.com` (`c9bdc1fb-b1fb-42af-8cb5-93844be6e4ea`).
- Cleanup: `DELETE FROM public.courses WHERE code = 'DEMO 101'` cascades the whole course; opportunities removed via `DELETE FROM public.opportunities WHERE organization LIKE 'OverraPrep Demo%'`.

## Demo Course: `DEMO 101 — OverraPrep Tutor Showcase`

University FUTA, Level 100, Department "Demo", active, with description.

### Topics (4)
1. Welcome & How OverraPrep Works
2. Core Concepts
3. Worked Examples
4. Exam-Style Practice

### Questions (15 MCQs)
- Distributed across the 4 topics
- Mix of easy / medium / hard
- All approved with rich `explanation` text so AI-explain and review screens look complete
- 3 flagged `is_past_question = true` with a `year` so the Past Questions view has content

### Quiz (1)
- Title: "Demo Quiz — Tutor Showcase"
- 15 questions, 20 minutes, free (`token_cost = 0`), active
- `quiz_questions` rows linking all 15 in order

### Lecture note (1)
- Title: "Demo Lecture Note — Introduction Slides"
- `file_url` points at a public placeholder PDF (Mozilla's sample PDF) so the download / preview works immediately. You can swap it from the admin UI later.
- `is_published = true`

### Flashcards (6 public)
- Authored by admin, `course_id` set, `topic_id` linked to topic 2 ("Core Concepts")
- `is_public = true` so they appear in the shared deck and `/flashcards`

### Tutor announcement (1 pinned)
- Title: "Welcome to the Demo Course"
- `course_id` set, `is_pinned = true` so it shows in the course feed and notification bell for followers

### Course pinned prompt (1)
- "Explain this topic to me like I'm 12, with one real-life example." → populates the AI tutor pinned-prompts row in the course chat

## Scholarships & Opportunities (6 entries, admin-posted, status = published)

All `organization` prefixed `OverraPrep Demo —` so they're easy to filter / delete. Each has cover image URL (free Unsplash), deadline 30–90 days out, apply URL, rich description. Categories covered so every filter chip in `/opportunities` has at least one card:

1. **Scholarship** — "FUTA Future Leaders Scholarship 2026" ($2,500 grant, deadline +60d)
2. **Scholarship** — "OverraPrep STEM Excellence Award" ($1,000 + 1yr Pro, deadline +45d)
3. **Internship** — "Lovable Cloud Engineering Internship (Remote)" (deadline +30d)
4. **Hackathon** — "OverraPrep FUTA Hack Weekend" (deadline +21d)
5. **Competition** — "National CBT Mastery Challenge" (deadline +75d)
6. **Tech Program** — "Google Africa Developer Track — Cohort 5" (deadline +90d)

These flow into the dashboard's opportunities strip and the `/opportunities` page out of the box.

## What is intentionally not done

- No fake students, no fake quiz attempts, no fake earnings/analytics — keeps insights real. Take the quiz yourself from a student account to populate stats live.
- No schema migrations, no edge function changes, no code edits.
- No paid pricing on the demo content so nothing is gated by tokens.

## Technical notes

- One `supabase--insert` call running a single transactional SQL block with WITH-CTEs to keep all FK ids consistent.
- All inserts conditional on `NOT EXISTS` checks against course code / opportunity titles so re-running is a no-op.
- `posted_by` / `created_by` / `tutor_id` / `user_id` = admin uuid; opportunities use the admin as `posted_by` so the "Insert opportunities by role" policy is satisfied.
