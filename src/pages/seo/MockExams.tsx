import { SEOLandingShell } from "@/components/seo/SEOLandingShell";
import { Trophy, Clock, Brain, Target, GraduationCap, BookOpen } from "lucide-react";

export default function MockExams() {
  const faqs = [
    { q: "What mocks are available?", a: "Comprehensive course-specific CBT mocks and semester exam simulations for FUTA, OAU, UNILAG, UI and leading Nigerian universities." },
    { q: "How realistic are they?", a: "Same timing, same MCQ format, randomized question order — built to mirror the real university CBT examination centre." },
    { q: "Do I get a remediation plan after?", a: "Yes — AI builds a personalized weak-area drill and flashcard deck from your performance." },
  ];

  const jsonLd = [
    { "@type": "Course", name: "Mock CBT Exams", description: "Full-length, timed CBT mock exams for Nigerian university courses.", provider: { "@type": "Organization", name: "OverraPrep AI" } },
    { "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <SEOLandingShell
      seoTitle="Mock CBT Exams — University Semester Practice"
      seoDescription="Full-length timed mock exams for Nigerian university CBTs and semester courses. AI remediation plan after every attempt. Free to start."
      canonicalPath="/mock-exams"
      jsonLd={jsonLd}
      eyebrow="Mock Centre"
      h1="Mock CBT Exams — Sit the Real Thing Before It Counts"
      intro="Full-length, timed mocks for university degree courses and semester CBTs. Real timing, real interface, AI remediation after every attempt."
      features={[
        { icon: <Clock className="h-4 w-4" />, title: "Real exam clock", body: "Same time pressure, same navigation, no surprises on the day." },
        { icon: <Trophy className="h-4 w-4" />, title: "Score reports", body: "Subject-by-subject breakdown with predicted exam score." },
        { icon: <Brain className="h-4 w-4" />, title: "AI remediation", body: "Personalized drill built from your weak topics." },
        { icon: <Target className="h-4 w-4" />, title: "Adaptive difficulty", body: "Tighten weak spots before they cost you marks." },
        { icon: <BookOpen className="h-4 w-4" />, title: "Auto flashcards", body: "Missed questions become flashcards you'll never miss again." },
        { icon: <GraduationCap className="h-4 w-4" />, title: "Live tutor follow-up", body: "Book a session with a verified tutor for what AI couldn't unstick." },
      ]}
      faqs={faqs}
      related={[
        { label: "FUTA Courses", href: "/universities/futa" },
        { label: "OAU Courses", href: "/universities/oau" },
        { label: "UNILAG Courses", href: "/universities/unilag" },
        { label: "UI Courses", href: "/universities/ui" },
        { label: "AI Quiz Generator", href: "/ai/quiz-generator" },
      ]}
      ctaPractice="/exams"
    />
  );
}
