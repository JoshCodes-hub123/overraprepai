import { SEOLandingShell } from "@/components/seo/SEOLandingShell";
import { Target, Trophy, Clock, BookOpen, Brain, GraduationCap } from "lucide-react";

export default function JambHub() {
  const faqs = [
    { q: "Is OverraPrep AI free to use for JAMB practice?", a: "Yes — you can practice JAMB CBT questions and get AI explanations for free. Premium features unlock with tokens or a Pro plan." },
    { q: "Does it match the real JAMB CBT format?", a: "Every drill mirrors JAMB timing, navigation, and 4-option MCQs, so you walk into the centre with zero surprises." },
    { q: "Which subjects are covered?", a: "Use of English, Mathematics, Physics, Chemistry, Biology, Government, Literature, Economics, CRS, IRS and more." },
  ];
  const jsonLd = [
    { "@type": "EducationalOccupationalProgram", name: "JAMB CBT Preparation", provider: { "@type": "Organization", name: "OverraPrep AI" }, educationalProgramMode: "online", occupationalCategory: "University admission preparation" },
    { "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://overraprepai.com/" },
      { "@type": "ListItem", position: 2, name: "JAMB", item: "https://overraprepai.com/jamb" },
    ]},
  ];
  return (
    <SEOLandingShell
      seoTitle="JAMB CBT Practice & AI Past Questions"
      seoDescription="Practice every JAMB subject with AI explanations, mock CBT exams, and personalized study plans. Built for Nigerian students aiming for top universities."
      canonicalPath="/jamb"
      jsonLd={jsonLd}
      eyebrow="JAMB 2026 Prep"
      h1="JAMB CBT Practice, Past Questions & AI Explanations"
      intro="Master Use of English, Maths, Physics, Chemistry, Biology and more with adaptive practice, instant AI feedback, and full mock CBT simulations."
      highlightStat={[
        { value: "40k+", label: "Past Qs" },
        { value: "9", label: "Subjects" },
        { value: "Free", label: "to start" },
      ]}
      features={[
        { icon: <Target className="h-4 w-4" />, title: "Adaptive practice", body: "Questions get harder as you improve — focus time on weak topics, not what you already know." },
        { icon: <Brain className="h-4 w-4" />, title: "AI step-by-step", body: "Tap any question to get a clear explanation in seconds, with worked examples." },
        { icon: <Clock className="h-4 w-4" />, title: "Real CBT timing", body: "Exact JAMB clock, navigation, and 4-option MCQs so the real exam feels familiar." },
        { icon: <Trophy className="h-4 w-4" />, title: "Mock exams", body: "Full-length, timed practice with score reports and remediation playlists." },
        { icon: <BookOpen className="h-4 w-4" />, title: "Topic mastery", body: "Drill projectile motion, calculus, organic chemistry, comprehension and more." },
        { icon: <GraduationCap className="h-4 w-4" />, title: "Verified tutors", body: "Match with university scholars for live sessions when you need a human." },
      ]}
      faqs={faqs}
      related={[
        { label: "JAMB CBT Practice", href: "/jamb/cbt-practice" },
        { label: "JAMB Past Questions", href: "/jamb/past-questions" },
        { label: "FUTA Post-UTME", href: "/post-utme/futa" },
        { label: "OAU Post-UTME", href: "/post-utme/oau" },
        { label: "Mock Exams", href: "/mock-exams" },
        { label: "AI Flashcard Generator", href: "/ai/flashcard-generator" },
      ]}
      ctaPractice="/jamb-intelligence"
    />
  );
}
