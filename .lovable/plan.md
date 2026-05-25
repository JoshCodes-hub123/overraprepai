
# Plan — Platform polish: discussions, AI, opportunities, uploads

I'll group this into 8 focused workstreams. Each ships small, verifiable changes.

## 1. Discussion permissions (tutors + admins start, everyone engages)

- **Community posts** (`community_posts`, `posts`): RLS `INSERT` restricted to `has_role(auth.uid(),'tutor')` OR `has_role(auth.uid(),'admin')`. Students keep full read + comment + like rights.
- **Chat threads (`chat_threads`)**:
  - `kind = 'group'` / `'brainstorm'` (multi-user discussions): INSERT requires tutor or admin role.
  - `kind = 'dm'` (1:1) and course Q&A auto-threads: unrestricted (students can DM each other and ask in course threads).
- UI: hide "New post" / "New discussion" / "New brainstorm" buttons for students; show a friendly "Tutors and admins start discussions — you can reply, ask, and @mention" hint.

## 2. Auto-opened course discussions + @mentions

- **Per-course discussion thread**: DB trigger on `courses` INSERT creates a `chat_threads` row (`kind='course'`, `course_id`, title = course code). All students enrolled in that course are auto-added as members; new enrollments via `student_courses` trigger also join.
- **Per-material micro-thread on demand**: an "Ask about this" button on each lecture note opens or creates a thread scoped to that material — keeps things tidy without spamming threads upfront.
- **@mentions**: extend existing `notify_post_mentions` pattern to chat_messages. Detect `@TUT-XXXX`, `@username`, `@AI`. Insert a `notifications` row with `link = /chat/<thread>?msg=<id>`.
- **Notification deep-link**: clicking a mention notification routes to the thread and scrolls/highlights the referenced message (ThreadView reads `?msg=` query param).

## 3. Public scholarships + all opportunities readable, gated engagement

- `opportunities` RLS: `SELECT USING (status='published')` for `anon` + `authenticated` (currently auth-only).
- `opportunity_bookmarks`, comments, "Apply" tracking: still require auth. Buttons trigger a friendly "Sign in to save / apply / comment" sheet.
- Add `/opportunities` and `/opportunities/:id` to `public/sitemap.xml`, add JSON-LD `JobPosting` / `Scholarship` schema and proper meta tags for SEO.

## 4. Opportunity Hub redesign (blog-grade reading + dashboard freshness)

- **Cards (`OpportunityCard`)**: editorial layout — cover image with subtle gradient overlay, gold category chip, deadline countdown pill ("3 days left" → red when <24h), organization with avatar, 2-line title in display font, 2-line excerpt, save + share row. Hover lift + amber hairline.
- **Detail page (`OpportunityDetail`)**: magazine layout — full-bleed cover, sticky apply CTA, prose-style description (markdown rendered), key facts side card (deadline, eligibility, location, reward), related opportunities, share-to-WhatsApp/Twitter buttons.
- **Dashboard `OpportunityHubPreview`**: subscribe to `opportunities` realtime channel; show "NEW" gold dot on items added in last 48h; auto-refresh on insert.

## 5. AI features that "just work"

- **AI Tutor chat (`ai-tutor-chat`)** and **Ask AI** entry points: switch to `google/gemini-3-flash-preview` (current default) via Lovable AI Gateway, harden error surfacing (429 / 402 / validation → user-readable toast instead of silent failure). Stream responses with `streamText`.
- **Summary generator (`summarize-material`)**: remove the verification gate (currently blocks if quiz_attempts < N or similar). Anyone signed in can summarize any material they can access. Keep daily AI quota.
- Add a 1-line "AI is thinking…" skeleton + retry button on failure across both surfaces.

## 6. Notifications work end-to-end

- **NotificationsPage**: ensure realtime subscription on `notifications` insert; mark-as-read on click; group by day; empty state.
- **Bell badge** in `TopHeader`: live unread count via the same subscription.
- **Deep links**: every notification stores a `link`; clicking navigates and marks as read.
- New notification preferences row auto-created on signup (trigger) so `notify_messages / notify_mentions / notify_posts / notify_opportunities` default to true.

## 7. In-app document viewer (no export)

- New `<InAppDocViewer>` component using `pdfjs-dist` (PDF) and image rendering for jpg/png. Loads via short-lived signed URLs.
- **Watermark**: overlay `userEmail · OverraPrep` diagonally across each page at low opacity (canvas overlay).
- **Hardening**: `oncontextmenu={preventDefault}`, CSS `user-select: none`, intercept `Ctrl/⌘+P` and `Ctrl/⌘+S` on the viewer, no `download` attribute, signed URL TTL 60s and never exposed in DOM (fetched into blob).
- Remove "Download" buttons from `LectureNotes`, `Library`, course material lists, study packs. Replace with "Open in viewer".
- Note: this deters but does not prevent screenshots — call this out to the user.

## 8. Course material upload fix + startup checklist fix

- **Course uploads (`TutorCourseEditor` / lecture notes uploader)**: audit current failure paths — likely `course-materials` bucket RLS missing tutor INSERT, or path convention mismatch (`{userId}/...` vs `{courseId}/...`). Fix RLS to allow `auth.uid() = tutor_id AND course_owner(course_id)`, normalize path to `${courseId}/${noteId}.${ext}`, surface upload errors via toast.
- **Startup checklist (`pages/admin/StartupChecklist.tsx` + `startup-check` edge fn)**: read function logs to find the failing check, fix the broken assertion(s), add try/catch per-check so one failure doesn't blank the whole page, render per-row status with "Re-run".

---

## Technical details

### Migrations (single combined migration where safe)

```sql
-- 1. Discussion permissions
DROP POLICY IF EXISTS "posts_insert" ON public.community_posts;
CREATE POLICY "posts_insert_tutor_admin" ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid()
              AND (has_role(auth.uid(),'tutor') OR has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "chat_threads_insert" ON public.chat_threads;
CREATE POLICY "chat_threads_insert_scoped" ON public.chat_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (kind = 'dm'
         OR kind = 'course'
         OR has_role(auth.uid(),'tutor')
         OR has_role(auth.uid(),'admin'))
  );

-- 2. Auto course thread
CREATE OR REPLACE FUNCTION public.create_course_discussion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_thread uuid;
BEGIN
  INSERT INTO public.chat_threads (kind, title, course_id, created_by)
  VALUES ('course', NEW.code || ' — Discussion', NEW.id, NEW.created_by)
  RETURNING id INTO v_thread;
  INSERT INTO public.chat_thread_members (thread_id, user_id, role)
  VALUES (v_thread, NEW.created_by, 'owner');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_create_course_discussion
AFTER INSERT ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.create_course_discussion();

-- auto-join on enrollment
CREATE OR REPLACE FUNCTION public.join_course_discussion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_thread uuid;
BEGIN
  SELECT id INTO v_thread FROM public.chat_threads
   WHERE kind='course' AND course_id = NEW.course_id LIMIT 1;
  IF v_thread IS NOT NULL THEN
    INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (v_thread, NEW.student_id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_join_course_discussion
AFTER INSERT ON public.student_courses
FOR EACH ROW EXECUTE FUNCTION public.join_course_discussion();

-- 3. Public opportunities
DROP POLICY IF EXISTS "opportunities_select_auth" ON public.opportunities;
CREATE POLICY "opportunities_select_public" ON public.opportunities
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- 4. Chat message mention notifications
CREATE OR REPLACE FUNCTION public.notify_chat_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_match text; v_target uuid; v_name text;
BEGIN
  IF NEW.content IS NULL THEN RETURN NEW; END IF;
  FOR v_match IN
    SELECT DISTINCT UPPER(m[1]) FROM regexp_matches(NEW.content,'@(TUT-[A-Z0-9]{4,})','gi') m
  LOOP
    SELECT id INTO v_target FROM public.profiles WHERE tutor_code = v_match;
    IF v_target IS NULL OR v_target = NEW.author_id THEN CONTINUE; END IF;
    SELECT COALESCE(full_name,'Someone') INTO v_name FROM public.profiles WHERE id = NEW.author_id;
    INSERT INTO public.notifications (user_id,title,message,type,link)
    VALUES (v_target,'You were mentioned',
            v_name||' mentioned you in a discussion','info',
            '/chat/'||NEW.thread_id||'?msg='||NEW.id);
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_chat_mentions
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_mentions();
```

### Files to touch

- **Permissions UI**: `src/pages/posts/PostComposer.tsx`, `src/pages/chat/Inbox.tsx` (hide create buttons for students; allow DM compose).
- **Opportunities**: `src/components/opportunities/OpportunityCard.tsx`, `src/pages/opportunities/Opportunities.tsx`, `src/pages/opportunities/OpportunityDetail.tsx`, `src/components/student/dashboard/OpportunityHubPreview.tsx`, `public/sitemap.xml`.
- **Notifications**: `src/pages/NotificationsPage.tsx`, `src/components/student/dashboard/TopHeader.tsx` (already in scope), `src/hooks/useNotifications.ts`.
- **AI**: `supabase/functions/ai-tutor-chat/index.ts`, `supabase/functions/summarize-material/index.ts`, `supabase/functions/chat-ai-reply/index.ts`.
- **Doc viewer**: new `src/components/viewer/InAppDocViewer.tsx`; replace download CTAs in `src/pages/tutor/LectureNotes.tsx`, `src/pages/student/Library.tsx`, course material list.
- **Course upload fix**: `src/pages/tutor/TutorCourseEditor.tsx` + RLS migration for `course-materials` storage bucket.
- **Startup checklist**: `src/pages/admin/StartupChecklist.tsx`, `supabase/functions/startup-check/index.ts`.
- **Chat deep-link**: `src/pages/chat/ThreadView.tsx` (read `?msg=` and scroll/highlight).

### Verification

- Sign in as a student → "New post"/"New brainstorm" buttons hidden, can comment, can DM, can post in course thread.
- Sign in as tutor/admin → can create posts and group/brainstorm threads.
- New course inserted → discussion thread appears, all enrolled students see it.
- @TUT-XXXX in a chat message → target gets a notification; clicking opens the message.
- Logged-out visitor → can browse `/opportunities` and view a scholarship; bookmark prompts sign-in.
- Opportunity admin publishes a new item → dashboard preview shows "NEW" badge in real time.
- Ask AI returns a streamed answer; on error a clear toast appears.
- "Summarize" on any material works for any signed-in student.
- Lecture note opens in viewer with watermark; no download/print works; right-click disabled.
- Tutor uploads a material under a course → succeeds and appears in the course materials list.
- Admin opens Startup Checklist → all rows render with green/red status.

### Out of scope / caveats

- Screenshot prevention is impossible in a browser; watermark is the deterrent.
- I will not change pricing, splash, or locked visuals.
