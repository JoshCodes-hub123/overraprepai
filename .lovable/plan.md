## Problem

Course chat messages are already saved to the database (`course_chat_messages`) and reload correctly when the user reopens the course. The reason a freshly-sent message looks like it "didn't send" is that the chat UI never optimistically renders your own message — it waits for a Supabase Realtime event to echo it back. But `course_chat_messages`, `course_chat_reactions`, and `course_pinned_prompts` are **not in the `supabase_realtime` publication**, so the echo never arrives. The row is safely in the DB; the screen just doesn't refresh until you leave and come back.

## Fix

### 1. Enable realtime on the three chat tables (migration)
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.course_chat_messages,
  public.course_chat_reactions,
  public.course_pinned_prompts;

ALTER TABLE public.course_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.course_chat_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.course_pinned_prompts REPLICA IDENTITY FULL;
```

### 2. Optimistic append in `CourseChat.send` (belt + suspenders)
In `src/components/course/CourseChat.tsx`, change the insert to `.select().single()` and immediately push the returned row into local `messages` state (deduping against the realtime echo by id). This way the message is on screen the instant the DB write succeeds, even if realtime is briefly down.

### 3. Friendlier error toast
The current insert-failure toast says "You need to enroll in this course (or be its tutor) to chat here." Since chat is now open to all signed-in students, switch it to: "Couldn't send message. Please sign in and try again." Keep the original text restore so the typed message isn't lost.

## Out of scope
- No RLS changes (write policy already allows any signed-in user on an active course).
- No new "My messages" history page — messages already persist and are visible whenever you reopen the course.
- No edge function changes.

## Verification
Reload a course → open Discussion → type and send → message appears immediately and remains after a hard refresh.
