import { useParams } from "react-router-dom";
import { SEOLandingShell } from "@/components/seo/SEOLandingShell";
import { GraduationCap, BookOpen, Brain, Target, Trophy, Users } from "lucide-react";

const UNI_LONG: Record<string, string> = {
  futa: "Federal University of Technology, Akure",
  oau: "Obafemi Awolowo University",
  unilag: "University of Lagos",
  ui: "University of Ibadan",
  unn: "University of Nigeria, Nsukka",
  uniben: "University of Benin",
  unilorin: "University of Ilorin",
  abu: "Ahmadu Bello University",
  uniport: "University of Port Harcourt",
  lasu: "Lagos State University",
  funaab: "Federal University of Agriculture, Abeokuta",
  uniabuja: "University of Abuja",
};

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function UniversityPage() {
  const { slug = "" } = useParams();
  const key = slug.toLowerCase();
  const name = UNI_LONG[key] ?? titleCase(key);
  const short = key.toUpperCase();

  const faqs = [
    { q: `What does OverraPrep AI offer for ${short} students?`, a: `Course-by-course AI tutors, past questions, flashcards, audio summaries, mock CBTs and live tutor sessions — all mapped to the ${short} curriculum.` },
    { q: `Are the tutors really from ${short}?`, a: "Yes — verified students and scholars currently studying at the university." },
    { q: "Do you cover Post-UTME prep too?", a: `Yes — visit the ${short} Post-UTME page for screening practice.` },
  ];

  const jsonLd = [
    { "@type": "CollegeOrUniversity", name, identifier: short, sameAs: `https://overraprepai.com/universities/${key}` },
    { "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <SEOLandingShell
      seoTitle={`${name} — AI Study Hub for ${short} Students`}
      seoDescription={`Past questions, AI tutors, flashcards and live sessions for every ${short} course. Built by and for ${name} students.`}
      canonicalPath={`/universities/${key}`}
      jsonLd={jsonLd}
      eyebrow="University Hub"
      h1={`${name} — Your AI Study Hub`}
      intro={`Everything ${short} students need in one place: course-by-course AI tutoring, past questions, flashcards, audio summaries, mock CBTs and verified tutors.`}
      features={[
        { icon: <BookOpen className="h-4 w-4" />, title: `${short} course library`, body: `Past questions, notes and AI tutors mapped to ${short}'s curriculum.` },
        { icon: <Brain className="h-4 w-4" />, title: "AI study assistant", body: "Ask anything about your course and get a worked answer in seconds." },
        { icon: <Target className="h-4 w-4" />, title: "Mastery tracking", body: "See exactly which topics you've mastered before the test." },
        { icon: <Trophy className="h-4 w-4" />, title: "Mock exams", body: `Course-specific mocks built to mirror ${short} CBT style.` },
        { icon: <GraduationCap className="h-4 w-4" />, title: `Verified ${short} tutors`, body: `Match with scholars currently studying at ${name}.` },
        { icon: <Users className="h-4 w-4" />, title: `${short} community`, body: `Study groups, leaderboards and team challenges with fellow ${short} students.` },
      ]}
      faqs={faqs}
      related={[
        { label: `${short} Post-UTME`, href: `/post-utme/${key}` },
        { label: "JAMB Hub", href: "/jamb" },
        { label: "Courses", href: "/courses" },
        { label: "Mock Exams", href: "/mock-exams" },
        { label: "AI Quiz Generator", href: "/ai/quiz-generator" },
      ]}
    />
  );
}
