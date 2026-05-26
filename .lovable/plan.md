
## Goal

Let every signed-in student open any course and discuss inside it — ask questions, mention the tutor with `@tutor` to summon them, and mention `@AI` to get OverraPrep AI to answer.

The good news: most of this is already built. `course_chat_messages`, `course_chat_reactions`, `course_pinned_prompts`, the `CourseChat` component (with `@AI`, threaded replies, reactions, tutor badges, pins), and the `course-ai-reply` edge function all exist and are mounted on `CourseHub` and `StudyHubCourse`. Two things are missing:

1. The chat is gated to enrolled students / tutor / admin only, so a regular student browsing a course can't post or even read.
2. There is no `@tutor` summon that pings the course's tutor(s).

## Changes

### 1. Open the discussion to any signed-in user

Relax `is_course_participant(_course_id, _user_id)` so any authenticated user counts as a participant for active, published courses. Tutors and admins keep their existing powers (pin prompts, delete any message). Enrolled status is no longer required to read or post.

Practically: replace the function body to return `true` for any authenticated user when the course is active, and keep the tutor/admin branches for permission checks elsewhere. RLS on `course_chat_messages`, `course_chat_reactions`, and `course_pinned_prompts` automatically follows.

### 2. `@tutor` summon

In `CourseChat.send`, after a successful insert, detect `@tutor` (case-insensitive) in the message and:
- Look up the course's tutor user IDs from `quizzes.tutor_id` for that course (already queried elsewhere in the component — reuse).
- Insert a notification row per tutor (table `notifications` with `type = 'course_mention'`, `link = /courses/<id>?tab=discussion`, message snippet, `from_user_id = current user`). Also fire the existing in-app toast realtime channel if one is in use.
- Show a small inline hint chip under the composer: "Tip: type `@tutor` to call the tutor, `@AI` to ask AI."

The tutor receives it in the existing notifications bell. No email — just in-app.

### 3. Composer affordance

Add two small ghost buttons next to the send button: `@tutor` and `@AI`. Tapping inserts the token into the textarea at the cursor. This makes the feature discoverable on mobile (370px viewport) where users won't think to type the mention.

### 4. Visibility on the course page

On `CourseHub` and `StudyHubCourse`, ensure the Discussion tab/section is visible to all visitors (no enrollment check around the `<CourseChat>` mount). If a wrapper currently hides it, drop the guard.

## Out of scope

- No schema changes to `course_chat_messages` (already supports everything needed).
- No paid/escrow logic; calling the tutor is free and best-effort.
- No email notifications.
- No changes to the `course-ai-reply` edge function.

## Technical notes

- Migration: `CREATE OR REPLACE FUNCTION public.is_course_participant` with the relaxed body. Security definer, search_path = public, returns boolean. No table/grant changes.
- Notification insert reuses the existing `notifications` table pattern used elsewhere in the app (will verify column names before writing).
- Mention detection: simple regex `/@tutor\b/i` and existing `/@AI\b/i`.
- All UI work stays inside `src/components/course/CourseChat.tsx`; no new routes.
