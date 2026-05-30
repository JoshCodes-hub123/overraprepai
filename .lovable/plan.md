# Launch Seed: Official Accounts, Courses, Scholarships

## 1. Official accounts (created via Supabase Auth admin API in a one-shot edge function `seed-official`)

All accounts use the single inbox **overraprepofficial@gmail.com** via Gmail `+` aliases so every email lands in the same place. Passwords are auto-generated 16-char strong, printed **once** in chat after the seed runs, then never stored in code.

| Role  | Email                                    | Display name              | tutor_code |
|-------|------------------------------------------|---------------------------|------------|
| admin | overraprepofficial@gmail.com             | OverraPrep Admin          | —          |
| tutor | overraprepofficial+math@gmail.com        | OverraPrep Math Faculty   | TUT-MATH   |
| tutor | overraprepofficial+physics@gmail.com     | OverraPrep Physics Faculty| TUT-PHYS   |
| tutor | overraprepofficial+chem@gmail.com        | OverraPrep Chem Faculty   | TUT-CHEM   |

For each tutor: profile gets gold OverraPrep avatar + cover, `tutor_status='approved'`, bio, `tutor_public_profiles` row, `tutor_storefronts` row, auto-approved `tutor_applications` record. Admin gets `user_roles` row `admin`.

## 2. Launch courses (FUTA 100-level core, university='FUTA')

Inserted via `supabase--insert` after accounts exist.

1. **MTH101 — Elementary Mathematics I (Calculus)** → Math Faculty
2. **PHY101 — General Physics I (Mechanics & Properties of Matter)** → Physics Faculty
3. **CHM101 — General Chemistry I** → Chem Faculty

Each course (`courses` table) gets: code, name, department, faculty (SAAT/SOS), level='100', `is_active=true`, description, cover image (existing gold gradient asset).

### Per-course resources
- **2 quizzes** (10 well-crafted MCQs each, with explanations) → `quizzes` + `quiz_questions` + `quiz_questions` link table, owned by the matching tutor, auto-approved/public.
- **1 study material** (`study_materials`) — concise topical notes (3–5 sections) authored by the tutor.
- **1 curriculum** (`tutor_curricula` + 4 `tutor_curriculum_topics`) outlining weeks 1–4.
- **1 survival kit entry** (`course_survival_kits`) — top formulas / common pitfalls.
- **1 tutor announcement** welcoming students.

## 3. Scholarships & opportunities (5, inserted into `opportunities`)

Status='published', posted_by=admin, real public info + verified apply URLs:

1. MTN Foundation Scholarship Scheme for Science & Tech Students
2. NNPC/Total National Merit Scholarship
3. Agbami Medical & Engineering Professionals Scholarship
4. Chevron NMA University Scholarship
5. GE Foundation Scholar-Leaders Program

Each: title, organization, category, description (2–3 paragraphs), deadline (latest known cycle), apply_url, cover_image_url (themed gold gradient), university='FUTA'.

## 4. Dashboard wiring check (read-only audit, fixes only if broken)

I will verify each surface shows the seeded data and patch the query/RLS if not:
- **Student dashboard** — Fresh Courses, Announcements feed, Opportunities widget, Featured Tutors.
- **Course page (`/course/:id`)** — quizzes list, study materials, curriculum, survival kit, tutor card.
- **Tutor dashboard** — each tutor sees their course, quizzes, students count, earnings (₦0).
- **Admin dashboard** — sees 3 tutors approved, 3 courses, 5 opportunities, audit log entry.
- **Opportunities page (`/opportunities`)** — 5 cards render with bookmarking working.

## 5. Implementation steps

1. Migration: add `is_official boolean default false` to `profiles` (so we can badge official accounts) and a `seed_official_marker` flag we can re-run idempotently.
2. New edge function `seed-official` (admin-only invoke, gated by a one-time `SEED_TOKEN` secret) that:
   - Calls `supabase.auth.admin.createUser` for the 4 accounts (email_confirm=true).
   - Generates strong passwords, returns them in the JSON response **once**.
   - Inserts profiles, user_roles, tutor_applications (approved), tutor_public_profiles, tutor_storefronts, tutor_onboarding rows.
3. After accounts exist, run a single `supabase--insert` batch to seed:
   - 3 courses, 6 quizzes + 60 questions, 3 study materials, 3 curricula + 12 topics, 3 survival kits, 3 announcements, 5 opportunities.
4. Run the function once via Test tab, capture passwords, present them to the user in chat in a copy-block, instruct user to rotate after first login.
5. Light UI: add a subtle gold "Official" badge on tutor cards where `is_official=true`.
6. Audit each dashboard route in the preview, fix any missing query/RLS.

## Out of scope
- No payment, no new design system, no notifications redesign — purely seeding + minimum wiring.
- Real scholarship deadlines are point-in-time; admin can later edit them in `/admin/opportunities`.

## Confirm before I build
- ✅ Use Gmail `+aliases` for the 3 tutor accounts? (alternative: all 4 share one email — not possible, Supabase requires unique emails)
- ✅ FUTA 100L MTH101 / PHY101 / CHM101 as the 3 launch courses?
- ✅ Print generated passwords in chat once (you save them, then rotate)?

Reply "go" to build, or tell me what to swap.
