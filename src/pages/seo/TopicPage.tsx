import { useParams } from "react-router-dom";
import { SEOLandingShell } from "@/components/seo/SEOLandingShell";
import { Brain, Target, BookOpen, Headphones, Sparkles, Trophy } from "lucide-react";

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TopicPage() {
  const { slug = "" } = useParams();
  const topic = titleCase(slug);

  const faqs = [
    { q: `How does OverraPrep AI teach ${topic}?`, a: `We combine a concept summary, worked examples, AI-generated practice questions, flashcards and an audio summary — all in one flow.` },
    { q: `Can I generate ${topic} flashcards from my own notes?`, a: "Yes — upload a PDF, DOCX or paste text and we'll turn it into spaced-repetition flashcards in seconds." },
    { q: `Is ${topic} part of university degree courses?`, a: "Yes — topics are mapped directly to Nigerian university course codes and departmental syllabi." },
  ];

  const jsonLd = [
    { "@type": "LearningResource", name: topic, learningResourceType: "Topic", educationalLevel: "Tertiary, Higher Education", inLanguage: "en-NG", provider: { "@type": "Organization", name: "OverraPrep AI" } },
    { "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <SEOLandingShell
      seoTitle={`${topic} — AI Practice, Flashcards & Notes`}
      seoDescription={`Master ${topic} with AI explanations, worked examples, instant flashcards and audio summaries. Built for Nigerian students.`}
      canonicalPath={`/topics/${slug}`}
      jsonLd={jsonLd}
      eyebrow="Topic Mastery"
      h1={`${topic} — Master It with AI`}
      intro={`Concept summary, worked examples, AI-generated practice and flashcards — everything you need to truly master ${topic}.`}
      features={[
        { icon: <Brain className="h-4 w-4" />, title: "AI concept summary", body: `A clear walk-through of ${topic} from first principles.` },
        { icon: <Target className="h-4 w-4" />, title: "Practice questions", body: "Adaptive MCQs and short-answer drills with instant feedback." },
        { icon: <Sparkles className="h-4 w-4" />, title: "Auto flashcards", body: "Turn this topic into spaced-repetition cards in one tap." },
        { icon: <Headphones className="h-4 w-4" />, title: "Audio summary", body: "Listen to a narrated revision on your way to class." },
        { icon: <Trophy className="h-4 w-4" />, title: "Mastery score", body: "Track exactly how confident you are before the exam." },
        { icon: <BookOpen className="h-4 w-4" />, title: "Linked courses", body: "Jump into the full course this topic belongs to." },
      ]}
      faqs={faqs}
      related={[
        { label: "AI Flashcard Generator", href: "/ai/flashcard-generator" },
        { label: "AI Quiz Generator", href: "/ai/quiz-generator" },
        { label: "Courses", href: "/courses" },
        { label: "Mock Exams", href: "/mock-exams" },
        { label: "Audio Learning", href: "/audio-learning" },
      ]}
    />
  );
}
