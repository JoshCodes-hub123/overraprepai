import { SEOLandingShell } from "@/components/seo/SEOLandingShell";
import { Target, Clock, Brain, Trophy, Headphones, BookOpen } from "lucide-react";

export default function JambCBTPractice() {
  const faqs = [
    { q: "How is this different from a regular JAMB past-question app?", a: "It's a full CBT simulator with adaptive difficulty, AI explanations on every question, and personalized remediation after each session." },
    { q: "Can I practice subject-by-subject?", a: "Yes. Pick any single subject or combine your four JAMB subjects for a full mock." },
    { q: "Does it work offline?", a: "Download practice sets from the offline tab and run them with no internet." },
  ];
  const jsonLd = [
    { "@type": "Course", name: "JAMB CBT Practice", description: "Adaptive JAMB CBT practice with AI explanations and timed mocks.", provider: { "@type": "Organization", name: "OverraPrep AI", sameAs: "https://overraprepai.com" } },
    { "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];
  return (
    <SEOLandingShell
      seoTitle="JAMB CBT Practice — Real Exam Simulator"
      seoDescription="Practice JAMB CBT online with the real exam interface, adaptive difficulty, instant AI explanations, and full-length mocks. Free to start."
      canonicalPath="/jamb/cbt-practice"
      jsonLd={jsonLd}
      eyebrow="CBT Simulator"
      h1="JAMB CBT Practice — Built Like the Real Thing"
      intro="Sit JAMB the way it actually feels. Authentic CBT interface, exam clock, randomized questions and AI explanations on every answer."
      features={[
        { icon: <Clock className="h-4 w-4" />, title: "Authentic CBT UI", body: "Same layout, timer, and navigation as the JAMB exam centre." },
        { icon: <Target className="h-4 w-4" />, title: "Adaptive engine", body: "Difficulty adjusts to your skill so you always train at the right level." },
        { icon: <Brain className="h-4 w-4" />, title: "AI feedback", body: "After every session, AI flags weak topics and queues focused drills." },
        { icon: <Trophy className="h-4 w-4" />, title: "Score reports", body: "See subject-by-subject mastery and a predicted JAMB score." },
        { icon: <Headphones className="h-4 w-4" />, title: "Audio review", body: "Convert any explanation into an audio summary for on-the-go revision." },
        { icon: <BookOpen className="h-4 w-4" />, title: "Topic library", body: "Jump straight into the topic you fluffed and master it." },
      ]}
      faqs={faqs}
      related={[
        { label: "JAMB Hub", href: "/jamb" },
        { label: "JAMB Past Questions", href: "/jamb/past-questions" },
        { label: "Mock Exams", href: "/mock-exams" },
        { label: "FUTA Post-UTME", href: "/post-utme/futa" },
        { label: "UNILAG Post-UTME", href: "/post-utme/unilag" },
      ]}
      ctaPractice="/jamb-intelligence"
    />
  );
}
