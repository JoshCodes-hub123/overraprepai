import { SEOLandingShell } from "@/components/seo/SEOLandingShell";
import { Sparkles, Brain, Target, BookOpen, Upload, Clock } from "lucide-react";

export default function FlashcardGenerator() {
  const faqs = [
    { q: "What can I generate flashcards from?", a: "Upload a PDF, DOCX or paste any text — lecture notes, past questions, textbook chapters. Our AI turns it into clean spaced-repetition cards in seconds." },
    { q: "Does it work for any Nigerian course?", a: "Yes — GST, MTH, PHY, CHM, BIO, ENG, ECN, Law, Medicine and beyond. Tag cards by course code and the SRS engine schedules reviews." },
    { q: "Is it free?", a: "You get free generations every day. Power users top up with tokens for unlimited generation." },
  ];

  const jsonLd = [
    { "@type": "SoftwareApplication", name: "AI Flashcard Generator", applicationCategory: "EducationalApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" } },
    { "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <SEOLandingShell
      seoTitle="AI Flashcard Generator — From PDF or Notes in Seconds"
      seoDescription="Turn any PDF, DOCX or pasted notes into spaced-repetition flashcards in under 10 seconds. Built for Nigerian university undergraduates."
      canonicalPath="/ai/flashcard-generator"
      jsonLd={jsonLd}
      eyebrow="AI Tool"
      h1="AI Flashcard Generator — From Notes to Mastery"
      intro="Upload a PDF, paste your lecture notes or drop a past-question paper. Our AI returns 20 spaced-repetition flashcards in under 10 seconds."
      highlightStat={[
        { value: "<10s", label: "to generate" },
        { value: "PDF", label: "& DOCX" },
        { value: "SRS", label: "scheduling" },
      ]}
      features={[
        { icon: <Upload className="h-4 w-4" />, title: "Any source", body: "PDF, DOCX, plain text — even a snap of a whiteboard." },
        { icon: <Sparkles className="h-4 w-4" />, title: "Clean cards", body: "Concise question / answer pairs ready for revision." },
        { icon: <Clock className="h-4 w-4" />, title: "SRS scheduling", body: "Review at the perfect time so nothing slips out of memory." },
        { icon: <Target className="h-4 w-4" />, title: "Tag by course", body: "Group cards by GST, MTH, BIO and track mastery per course." },
        { icon: <Brain className="h-4 w-4" />, title: "AI explanations", body: "Tap any card for a deeper walk-through from your AI tutor." },
        { icon: <BookOpen className="h-4 w-4" />, title: "Share with peers", body: "Send a deck to a study group with one link." },
      ]}
      faqs={faqs}
      related={[
        { label: "AI Quiz Generator", href: "/ai/quiz-generator" },
        { label: "Audio Learning", href: "/audio-learning" },
        { label: "Courses", href: "/courses" },
        { label: "Mock Exams", href: "/mock-exams" },
      ]}
      ctaFlashcards="/flashcards"
    />
  );
}
