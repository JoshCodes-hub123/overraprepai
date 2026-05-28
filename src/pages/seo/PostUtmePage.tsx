import { useParams } from "react-router-dom";
import { SEOLandingShell } from "@/components/seo/SEOLandingShell";
import { Target, Trophy, Brain, BookOpen, GraduationCap, Clock } from "lucide-react";

const UNI_NAMES: Record<string, string> = {
  futa: "FUTA",
  oau: "OAU",
  unilag: "UNILAG",
  ui: "UI",
  unn: "UNN",
  uniben: "UNIBEN",
  unilorin: "UNILORIN",
  abu: "ABU",
  uniport: "UNIPORT",
  lasu: "LASU",
  funaab: "FUNAAB",
  uniabuja: "UNIABUJA",
};

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

export default function PostUtmePage() {
  const { university = "" } = useParams();
  const slug = university.toLowerCase();
  const short = UNI_NAMES[slug] ?? slug.toUpperCase();
  const long = UNI_LONG[slug] ?? short;

  const faqs = [
    { q: `Where do the ${short} Post-UTME questions come from?`, a: `Curated from verified past papers, screening guides and tutors who sat the ${short} Post-UTME — refreshed every cycle.` },
    { q: `Can I practice ${short} Post-UTME by department?`, a: `Yes — choose your faculty or course (Engineering, Sciences, Arts, Law) and practice only what matters for your aggregate.` },
    { q: "Is there a mock exam with the real timing?", a: `Yes — a full ${short} Post-UTME mock with the exact subject mix and time limit.` },
  ];

  const jsonLd = [
    { "@type": "EducationalOccupationalProgram", name: `${short} Post-UTME Preparation`, programType: "Admission screening prep", educationalLevel: "Tertiary entrance", provider: { "@type": "Organization", name: "OverraPrep AI" } },
    { "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://overraprepai.com/" },
      { "@type": "ListItem", position: 2, name: "Post-UTME", item: "https://overraprepai.com/post-utme/futa" },
      { "@type": "ListItem", position: 3, name: short, item: `https://overraprepai.com/post-utme/${slug}` },
    ]},
  ];

  return (
    <SEOLandingShell
      seoTitle={`${short} Post-UTME Past Questions & AI Practice`}
      seoDescription={`Practice ${long} Post-UTME with AI explanations, full mock screening, and department-specific drills. Built for ${short} aspirants.`}
      canonicalPath={`/post-utme/${slug}`}
      jsonLd={jsonLd}
      eyebrow={`${short} Aspirant`}
      h1={`${short} Post-UTME Past Questions & AI Practice`}
      intro={`Prepare for the ${long} Post-UTME screening with curated past questions, AI step-by-step explanations, and a full mock that mirrors the real test.`}
      highlightStat={[
        { value: short, label: "Focused" },
        { value: "AI", label: "Explained" },
        { value: "Mock", label: "Screening" },
      ]}
      features={[
        { icon: <Target className="h-4 w-4" />, title: `${short}-specific drills`, body: `Practice in the exact format ${short} uses for screening.` },
        { icon: <Brain className="h-4 w-4" />, title: "AI explanations", body: "Tap any question for instant working and concept notes." },
        { icon: <Trophy className="h-4 w-4" />, title: "Full mock screening", body: `One-click mock with ${short} timing and subject mix.` },
        { icon: <BookOpen className="h-4 w-4" />, title: "Course-aware practice", body: "Practice by faculty: Engineering, Sciences, Arts, Law and more." },
        { icon: <GraduationCap className="h-4 w-4" />, title: `Verified ${short} tutors`, body: `Get matched with scholars currently studying at ${short}.` },
        { icon: <Clock className="h-4 w-4" />, title: "Daily prep plan", body: "AI builds your week of practice — never wonder what to study." },
      ]}
      faqs={faqs}
      related={[
        { label: "FUTA Post-UTME", href: "/post-utme/futa" },
        { label: "OAU Post-UTME", href: "/post-utme/oau" },
        { label: "UNILAG Post-UTME", href: "/post-utme/unilag" },
        { label: "UI Post-UTME", href: "/post-utme/ui" },
        { label: "JAMB Hub", href: "/jamb" },
        { label: `${short} Profile`, href: `/universities/${slug}` },
      ]}
    />
  );
}
