import { SEO } from "@/components/seo/SEO";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import TrustStrip from "@/components/landing/TrustStrip";
import StatsSection from "@/components/landing/StatsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturedTutorsSection from "@/components/landing/FeaturedTutorsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import TutorSection from "@/components/landing/TutorSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/layout/Footer";


const SITE_URL = "https://prep-mentor-hub-50.lovable.app";

const homepageFaqs: { q: string; a: string }[] = [
  { q: "What is OverraPrep AI?", a: "OverraPrep AI is an AI-powered CBT exam preparation platform designed specifically for FUTA students. It combines practice quizzes, AI-powered explanations, and a tutor marketplace where verified tutors create premium quiz content to help you excel in your exams." },
  { q: "How do tokens work?", a: "Tokens are the platform currency used to access premium quiz content. New users receive free tokens upon signup. You can purchase additional tokens, and once approved, tokens are credited to your wallet." },
  { q: "What is the difference between Practice Mode and CBT Simulation?", a: "Practice Mode allows untimed learning with immediate feedback after each question. CBT Simulation Mode recreates actual exam conditions with timed sessions and results shown only at the end." },
  { q: "How do I become a tutor?", a: "Submit a tutor application with your qualifications, experience, and courses. Admin reviews all applications. Once approved, you can create quizzes, set prices, and earn from student purchases." },
  { q: "Are the AI explanations available for all questions?", a: "Yes. AI-powered explanations provide step-by-step breakdowns for every question, available on-demand after any answer." },
  { q: "Can I track my progress?", a: "Yes. Your dashboard tracks accuracy, speed, weak areas, and improvement over time so you can focus on topics that need more attention." },
];

const homepageStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OverraPrep AI",
    url: `${SITE_URL}/`,
    description: "AI-powered CBT exam preparation platform for FUTA students",
    publisher: {
      "@type": "Organization",
      name: "OverraPrep AI",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/app-icon.png` },
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homepageFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

const Index = () => {
  return (
    <>
      <SEO
        title="AI-Powered CBT Exam Preparation"
        description="Ace your FUTA CBT exams with AI-powered practice questions, instant explanations, and personalized learning paths."
        keywords="FUTA, CBT, exam preparation, past questions, AI tutoring"
        url="/website"
        structuredData={homepageStructuredData}
        noindex={false}
      />
      
      <div className="min-h-screen">
        <Navbar />
        <div>
          <HeroSection />
          <TrustStrip />
          <StatsSection />
          <FeaturesSection />
          <HowItWorksSection />
          <FeaturedTutorsSection />
          <TestimonialsSection />
          <FAQSection />
          <TutorSection />
          <CTASection />
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Index;
