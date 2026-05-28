## Goal
Make the student experience launch-ready by fixing profile picture display, making key app features easy to reach from the Dashboard, and listing course-based quizzes clearly for new students.

## What I found
- **Profile picture upload path exists**, but display is inconsistent: some components read `avatar_url`, some read `profile_image_url`, and the edit screen can save a temporary local blob URL if the user clicks Save while upload is still in progress.
- **No test/user data currently exists in the backend** for profiles with avatars, courses, quizzes, or attempts, so empty states will show unless seed/admin content is added.
- **Course quiz structure already exists**: quizzes are tied to `course_id`, and `/courses/:courseId` already has a Quizzes tab. What is missing is a Dashboard-level quiz discovery section for the courses the student picked.
- **Recent scoring activity feed is wired**, but there are currently no matching activity rows, so it will be empty until quiz/flashcard/streak events are logged.
- **Dashboard has many feature cards**, but not all major student features are equally visible; several useful launch features are buried in navigation.

## Implementation plan

### 1. Fix profile picture display everywhere
- Use a single helper to resolve avatars in this order:
  1. `profile_image_url`
  2. `avatar_url`
  3. fallback letter
- Update the Dashboard header, leaderboard, activity feed, spotlight, tutor cards, chat/community surfaces where needed to use that helper.
- Fix `EditProfile` so:
  - upload uses the dedicated `avatars` bucket instead of the tutor profile bucket for student avatars,
  - Save is disabled while avatar upload is in progress,
  - Save never writes a temporary `blob:` preview URL into the profile,
  - both `avatar_url` and `profile_image_url` are updated with the final public image URL,
  - the profile refresh happens immediately after upload.

### 2. Add a Dashboard “Quiz by your courses” section
- Create a new student Dashboard section that reads the student’s selected/enrolled courses.
- For each course, show active quizzes underneath with:
  - course code/name,
  - quiz title,
  - number of questions,
  - duration,
  - direct “Start quiz” action.
- If a student has no enrolled courses, show a clear empty state linking to **My Courses** / **Courses**.
- If enrolled courses have no quizzes yet, show a clear message and link to Course Hub / Study Hub.
- Place this section high enough on the Dashboard so students who came only to take quizzes can find it quickly.

### 3. Make all important app updates/features visible from Dashboard
- Add/refine a compact “Explore OverraPrep” dashboard section with direct entry points for launch-critical features:
  - Courses / My Courses
  - Quizzes
  - Study Hub
  - AI Tutor
  - Audio Learning
  - Flashcards / Review
  - Mock Exams
  - Leaderboard
  - Challenges
  - Library
  - Tutors
  - Community / Chat
  - Sessions, if enabled/ready
- Keep the current white + gold visual system and mobile-first layout.
- Avoid adding broken or paused routes; anything not ready should either be hidden or clearly marked Coming Soon.

### 4. Make course pages better for quiz-first students
- Update course cards/actions so “Quiz” opens the course directly on the Quizzes tab.
- Make `CourseHub` respect `?tab=quizzes`, `?tab=materials`, `?tab=audio`, etc. so existing dashboard/course-card links land on the correct tab.
- Add better loading/error/empty messaging around course quizzes if needed.

### 5. Complete scoring activity feed behavior
- Add backend-safe activity logging for completed quizzes so the leaderboard activity feed starts filling automatically after students submit quizzes.
- If needed, add lightweight logging for flashcard/SRS review and streak updates without exposing private data.
- Keep RLS secure: students can log their own activity; everyone can only see public scoring activity.

### 6. Launch readiness check after implementation
I will verify these launch-critical screens and give you a checklist:
- **Dashboard:** avatar visible, feature grid visible, course quiz section visible, empty states understandable.
- **Profile Edit:** upload image, preview image, save, return to Dashboard, image replaces fallback letter.
- **Courses / My Courses:** selected courses show, quiz CTA opens the Quizzes tab.
- **Course Hub:** Materials, Quizzes, Flashcards, Audio, AI Packs tabs load correctly.
- **Leaderboard:** weekly/overall filters, course filter, activity feed, badge modal.
- **Admin tutor queue:** pending/approved/rejected tabs, profile view, quiz content view.
- **New-user state:** no courses/no quizzes/no activity states are helpful instead of looking broken.

## Technical notes
- This may need one small database migration for activity logging triggers/functions if the current activity feed still has no automatic quiz-completion event source.
- I will not manually edit generated backend client/type files.
- I will preserve the locked visual style: white + gold + Inter, no navy backgrounds.