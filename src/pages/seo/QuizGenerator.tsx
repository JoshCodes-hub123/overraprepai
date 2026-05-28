import { SEOLandingShell } from "@/components/seo/SEOLandingShell";
import { Sparkles, Brain, Target, BookOpen, Upload, Trophy } from "lucide-react";

export default function QuizGenerator() {
  const faqs = [
    { q: "How long does it take to generate a quiz?", a: "Under 15 seconds for a 20-question quiz from any uploaded PDF, DOCX or pasted notes." },
    { q: "Can I choose the format?", a: "Yes — MCQ, theory, true/false or a mix. Set difficulty and time limit too." },
    { q: "Can my study group take the same quiz?", a: "Yes — share a quiz link and compare scores on the leaderboard." },
  ];

  const jsonLd = [
    { "@type": "SoftwareApplication", name: "AI Quiz Generator", applicationCategory: "EducationalApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" } },
    { "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <SEOLandingShell
      seoTitle="AI Quiz Generator — Turn Any PDF Into a Quiz"
      seoDescription="Generate a 20-question quiz from any PDF, DOCX or notes in 15 seconds. MCQ, theory, share with study groups. Free to start."
      canonicalPath="/ai/quiz-generator"
      jsonLd={jsonLd}
      eyebrow="AI Tool"
      h1="AI Quiz Generator — Built for Nigerian Students"
      intro="Turn any lecture note, past-question paper or textbook chapter into a sharable quiz in seconds. MCQ, theory or mixed format, with instant AI grading."
      highlightStat={[
        { value: "<15s", label: "to generate" },
        { value: "MCQ", label: "+ theory" },
        { value: "Share", label: "with peers" },
      ]}
      features={[
        { icon: <Upload className="h-4 w-4" />, title: "Drop any source", body: "PDF, DOCX, pasted notes — even photos of handwritten material." },
        { icon: <Sparkles className="h-4 w-4" />, title: "Pick your format", body: "MCQ, theory, true/false or a mix. Choose difficulty and time limit." },
        { icon: <Brain className="h-4 w-4" />, title: "Instant AI grading", body: "Theory answers get a fair, rubric-based AI mark." },
        { icon: <Target className="h-4 w-4" />, title: "Mastery feedback", body: "See exactly what to revise next." },
        { icon: <Trophy className="h-4 w-4" />, title: "Group leaderboards", body: "Share a quiz link with your class and compete." },
        { icon: <BookOpen className="h-4 w-4" />, title: "Course-aware", body: "Tag a quiz to a course and feed the mastery engine." },
      ]}
      faqs={faqs}
      related={[
        { label: "AI Flashcard Generator", href: "/ai/flashcard-generator" },
        { label: "Mock Exams", href: "/mock-exams" },
        { label: "Audio Learning", href: "/audio-learning" },
        { label: "JAMB CBT Practice", href: "/jamb/cbt-practice" },
      ]}
      ctaPractice="/library"
    />
  );
}
