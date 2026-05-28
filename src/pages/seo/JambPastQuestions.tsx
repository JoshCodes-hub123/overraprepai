import { SEOLandingShell } from "@/components/seo/SEOLandingShell";
import { FileText, Brain, Target, BookOpen, Trophy, Headphones } from "lucide-react";

export default function JambPastQuestions() {
  const faqs = [
    { q: "How far back do the JAMB past questions go?", a: "We cover the last 20+ years of JAMB UTME across every subject." },
    { q: "Are explanations included?", a: "Yes — every question has an instant AI explanation, plus links to topic notes and flashcards." },
    { q: "Can I download a PDF?", a: "Pro users can export curated past-question packs by subject and year as PDFs." },
  ];
  const jsonLd = [
    { "@type": "CreativeWork", name: "JAMB Past Questions Library", about: "JAMB UTME past questions with AI explanations", inLanguage: "en-NG" },
    { "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];
  return (
    <SEOLandingShell
      seoTitle="JAMB Past Questions & Answers (All Subjects)"
      seoDescription="20+ years of JAMB UTME past questions with instant AI explanations, topic mastery tracking, flashcards and audio summaries — all in one app."
      canonicalPath="/jamb/past-questions"
      jsonLd={jsonLd}
      eyebrow="Past Questions"
      h1="JAMB Past Questions & Answers — 20+ Years, AI Explained"
      intro="Stop memorising in the dark. Practice every JAMB past question with instant explanations, mastery tracking, and personalized study plans."
      highlightStat={[
        { value: "20+", label: "Years" },
        { value: "AI", label: "Explained" },
        { value: "All", label: "Subjects" },
      ]}
      features={[
        { icon: <FileText className="h-4 w-4" />, title: "Filter by year & subject", body: "Pull any year, any subject, any topic in seconds." },
        { icon: <Brain className="h-4 w-4" />, title: "AI explains every Q", body: "Don't just see the answer — understand the working." },
        { icon: <Target className="h-4 w-4" />, title: "Mastery tracking", body: "Know exactly which topics you've truly mastered." },
        { icon: <BookOpen className="h-4 w-4" />, title: "Linked flashcards", body: "One tap to turn weak topics into spaced-repetition cards." },
        { icon: <Trophy className="h-4 w-4" />, title: "Predict your score", body: "AI estimates your JAMB score as you practice." },
        { icon: <Headphones className="h-4 w-4" />, title: "Audio revision", body: "Listen to past-question solutions on the road." },
      ]}
      faqs={faqs}
      related={[
        { label: "JAMB Hub", href: "/jamb" },
        { label: "JAMB CBT Practice", href: "/jamb/cbt-practice" },
        { label: "Mock Exams", href: "/mock-exams" },
        { label: "AI Flashcard Generator", href: "/ai/flashcard-generator" },
        { label: "AI Quiz Generator", href: "/ai/quiz-generator" },
      ]}
      ctaPractice="/jamb-intelligence"
    />
  );
}
