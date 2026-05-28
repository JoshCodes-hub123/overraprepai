# OverraPrep AI — Voice & Copywriting Guide

> The product feels world-class when its language does. This guide is the single source of truth for tone, vocabulary, and microcopy across every screen in OverraPrep AI.

---

## 1. Voice Pillars

| Pillar | We sound… | We never sound… |
|---|---|---|
| **Intelligent** | Like a brilliant senior who's been through it | Robotic, jargon-heavy, AI-y |
| **Trustworthy** | Calm, specific, honest about limits | Hype-y, exclamation-heavy, vague |
| **Premium** | Spare, confident, well-spaced | Bloated, decorative, over-explained |
| **Motivational** | Quiet encouragement, named the next action | Cheerleader, "You got this 🎉" |
| **Student-Focused** | Their goal, their timeline, their words | Marketing copy, "leverage", "unlock potential" |

Default rule: **the shortest sentence that respects the student wins.**

---

## 2. Tone by Surface

- **Onboarding** — warm, confident, future-tense. "We'll line up past questions around these courses."
- **Dashboard** — calm, declarative, action-naming. "Pick up where you left off." not "Welcome back, Adaeze! 🎉"
- **Empty states** — invite, don't apologize. "Nothing here yet — start your first study pack."
- **Errors** — own it in one sentence, give one next action. "We couldn't reach the server. Try again."
- **Success toasts** — name the outcome, not the click. "Quiz submitted — 18/20." not "Success!"
- **Paywalls / upgrades** — value first, price second, never guilt.
- **Quiz / drill** — focused, present-tense, no congratulations mid-flow.

---

## 3. The Rewrite Cheatsheet

Replace the left column wherever it appears.

| Don't write | Write instead |
|---|---|
| Generate quiz | Challenge your understanding |
| Generate flashcards | Turn this into flashcards |
| Upload document | Transform your notes into a smart study pack |
| Upload file | Bring in your material |
| Start quiz | Begin practice |
| Submit | Finish & review |
| Loading… | Pulling your courses… *(name the thing)* |
| Welcome back! | Pick up where you left off |
| Get started | Start studying |
| Sign up | Create your account |
| Continue with Google | Sign in with Google |
| Forgot password? | Can't remember your password? |
| Something went wrong | We couldn't load that. Try again. |
| No data | Nothing here yet |
| Choose option | Pick one to continue |
| Save changes | Save |
| Settings | Your account |
| AI is thinking… | Working on it… |
| Premium feature | For Pro members |
| Subscribe now | Go Pro |
| Unlock | Open |
| Click here | *(never — use a verb-led link: "See your progress")* |
| Please wait | *(remove — show a skeleton)* |

---

## 4. Hero Copy Library

Drop-in headlines for top surfaces.

**Splash / first open**
> Study smart, not hard.
> Your academic operating system.

**Auth — sign-in**
> Welcome back.
> Your courses, tutors and AI are right where you left them.

**Auth — sign-up**
> Start your smarter semester.
> Free to start. No card required.

**Dashboard hero**
> Pick up where you left off, *{first_name}*.
> *{n}* courses · *{streak}* day streak

**Empty study pack**
> Your first study pack is one upload away.
> Drop in a PDF or photo of your notes — we'll do the rest.

**Empty quiz**
> No quizzes yet.
> Generate one from any course material in 10 seconds.

**Course hub**
> Everything you need for *{COURSE_CODE}*, in one place.

**Mock exams**
> Real exam pressure. Real feedback.
> A timed CBT environment, marked the moment you finish.

**Tutors**
> Verified tutors, picked for your courses.

**Live class joining**
> Class is in session.

**Live class ended**
> Class wrapped. Your recap is being written.

---

## 5. CTAs — The Verb Library

Use these. Don't invent new ones unless you have to.

- **Practice** — Begin practice · Try one question · Drill weak topics
- **Create** — Make a study pack · Generate flashcards · Build a quiz
- **Upload** — Add your notes · Bring in material · Drop a file
- **Continue** — Continue learning · Resume · Pick up where you left off
- **Open** — Open course · View tutor · See feedback
- **Share** — Send to a friend · Share your score
- **Subscribe** — Go Pro · See Pro plans
- **Negative** — Skip for now · Maybe later · Not yet

Never use: "Click here", "Submit", "OK" (use the verb of the action).

---

## 6. Microcopy Patterns

**Loading states** — name the thing.
> Pulling your courses… · Generating your quiz… · Marking your script…

**Confirm destructive** — name the consequence.
> Delete this study pack? You'll lose its flashcards and quizzes.

**Permission asks** — say *why* before *what*.
> So we can send your streak reminders — turn on notifications?

**Form errors** — be specific, never blame.
> That email isn't recognized. → Use *That looks off — double-check your email.*

**Success without noise**
> ✓ Saved · ✓ Quiz submitted — 18/20 · ✓ Course added

---

## 7. Numbers & Time

- Use **digits** for everything (12 courses, not "twelve courses").
- Streaks: "3 day streak", not "3 days in a row".
- Time-left: "Ends in 2h 14m" — never "Time remaining: 2 hours 14 minutes".
- Past times: "Just now", "5m ago", "2h ago", "Yesterday", "Mon".
- Currency: always show "₦" inline ("₦500"), never "NGN 500".

---

## 8. Words We Don't Use

Banned at the company level:
- "Leverage", "unlock potential", "supercharge", "revolutionize", "synergize"
- "Awesome", "amazing", "incredible" (in product UI — only in marketing)
- "Click", "tap" (tell them *what* will happen, not the physical motion)
- "Easily", "simply", "just" (if it were easy, you wouldn't need to say it)
- "Please" in CTAs ("Please continue" → "Continue")
- "Sorry" without an action ("Sorry, something went wrong" → "We couldn't load that — try again")
- Emoji decoration in core product UI (sparingly OK in social/chat surfaces)

---

## 9. Brand Positioning Line

The one sentence used in App Store, OG meta, hero, pitch deck:

> **OverraPrep AI — the AI academic operating system for African university students.**

Use this exact wording in:
- `<title>` defaults
- App store / Play store description
- Hero subtitle on the marketing site
- "About" copy

Short form (≤ 60 chars, for OG titles):
> Study smart, not hard. OverraPrep AI.

---

## 10. Inclusivity & Locale

- Default to Nigerian English (e.g. "secondary school", "lecturer", not "high school" / "professor") unless context demands otherwise.
- Always second-person ("you", not "the student" / "users").
- Never assume gender, age, or background in greetings.
- Use first name when available, "there" as fallback. Never "user" or "friend".

---

## 11. AI Output Hygiene

AI-generated explanations, summaries, and flashcards must follow the same voice. The `sanitizeAIText()` helper already strips noisy markdown — copywriters and prompt authors must:

- Prompt for **no preambles** ("Sure! Here is…") and **no sign-offs** ("Hope that helps!").
- Prompt for **short paragraphs**, plain prose, max 1 heading per block.
- Forbid asterisks for emphasis. Use sentence rhythm instead.
- Always ask for "the one most useful next step" at the end of long explanations.

---

*Last updated: Phase 7A. Owners: Product + Brand. Changes go through PR review.*
