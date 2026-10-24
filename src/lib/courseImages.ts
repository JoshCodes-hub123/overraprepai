/**
 * Automatic Course Image & Discipline Intelligence Engine
 * Maps any academic course (code, name, department) to high-resolution,
 * curated, contextual academic imagery and visual styling automatically.
 */

export interface CourseImageInfo {
  imageUrl: string;
  category: string;
  gradient: string;
  accentHex: string;
  badgeBg: string;
  badgeText: string;
}

interface DisciplineConfig {
  matcher: RegExp;
  category: string;
  images: string[];
  gradient: string;
  accentHex: string;
  badgeBg: string;
  badgeText: string;
}

const DISCIPLINES: DisciplineConfig[] = [
  {
    matcher: /\b(csc|cps|ift|sen|cos|ict|comp|software|algorithm|program|database|python|java|web|cyber|network|data\s*science|cloud)\b/i,
    category: "Computer Science & Tech",
    images: [
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-blue-950/80 via-slate-900/60 to-transparent",
    accentHex: "#3b82f6",
    badgeBg: "bg-blue-500/20 border-blue-400/30",
    badgeText: "text-blue-300",
  },
  {
    matcher: /\b(mth|mat|sta|math|calculus|algebra|statistic|vector|differential|geometry|trigonometry)\b/i,
    category: "Mathematics & Stats",
    images: [
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-amber-950/80 via-neutral-900/60 to-transparent",
    accentHex: "#f59e0b",
    badgeBg: "bg-amber-500/20 border-amber-400/30",
    badgeText: "text-amber-300",
  },
  {
    matcher: /\b(phy|phs|physics|mechanics|optics|quantum|thermodynamics|electromagnet|wave|astronomy)\b/i,
    category: "Physics & Physical Sciences",
    images: [
      "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-indigo-950/80 via-slate-900/60 to-transparent",
    accentHex: "#6366f1",
    badgeBg: "bg-indigo-500/20 border-indigo-400/30",
    badgeText: "text-indigo-300",
  },
  {
    matcher: /\b(chm|che|chemistry|organic|inorganic|polymer|reaction|biochem|bch)\b/i,
    category: "Chemical Sciences",
    images: [
      "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1514792368985-f80e9d482a02?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-emerald-950/80 via-neutral-900/60 to-transparent",
    accentHex: "#10b981",
    badgeBg: "bg-emerald-500/20 border-emerald-400/30",
    badgeText: "text-emerald-300",
  },
  {
    matcher: /\b(bio|mcb|microbio|botany|zoology|genetics|cell|organism|ecology)\b/i,
    category: "Biological Sciences",
    images: [
      "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-teal-950/80 via-neutral-900/60 to-transparent",
    accentHex: "#14b8a6",
    badgeBg: "bg-teal-500/20 border-teal-400/30",
    badgeText: "text-teal-300",
  },
  {
    matcher: /\b(med|ana|phs|pha|pharm|nur|nursing|mls|anatomy|physiology|pathology|medicine|clinical|health)\b/i,
    category: "Medicine & Health",
    images: [
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-cyan-950/80 via-slate-900/60 to-transparent",
    accentHex: "#06b6d4",
    badgeBg: "bg-cyan-500/20 border-cyan-400/30",
    badgeText: "text-cyan-300",
  },
  {
    matcher: /\b(eee|cve|mee|age|che|mme|eng|engineering|circuit|cad|robotics|structural|civil|mechanical|electrical)\b/i,
    category: "Engineering & Applied Tech",
    images: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-amber-950/80 via-zinc-900/60 to-transparent",
    accentHex: "#d97706",
    badgeBg: "bg-amber-500/20 border-amber-400/30",
    badgeText: "text-amber-300",
  },
  {
    matcher: /\b(acc|ecn|bus|bfn|pad|fin|mkt|economics|accounting|finance|management|business|banking|marketing)\b/i,
    category: "Business & Economics",
    images: [
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-emerald-950/80 via-slate-900/60 to-transparent",
    accentHex: "#059669",
    badgeBg: "bg-emerald-500/20 border-emerald-400/30",
    badgeText: "text-emerald-300",
  },
  {
    matcher: /\b(law|pul|cil|jurisprudence|legal|torts|constitution|justice)\b/i,
    category: "Law & Jurisprudence",
    images: [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-stone-950/80 via-neutral-900/60 to-transparent",
    accentHex: "#b45309",
    badgeBg: "bg-stone-500/20 border-stone-400/30",
    badgeText: "text-stone-300",
  },
  {
    matcher: /\b(eng|lit|frn|yor|hau|ibo|linguistics|literature|language|history|philosophy|art|theatre)\b/i,
    category: "Humanities & Arts",
    images: [
      "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-rose-950/80 via-neutral-900/60 to-transparent",
    accentHex: "#e11d48",
    badgeBg: "bg-rose-500/20 border-rose-400/30",
    badgeText: "text-rose-300",
  },
  {
    matcher: /\b(gst|gns|general|citizenship|peace|communication|study\s*skills)\b/i,
    category: "General Studies",
    images: [
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-amber-950/80 via-slate-900/60 to-transparent",
    accentHex: "#eab308",
    badgeBg: "bg-amber-500/20 border-amber-400/30",
    badgeText: "text-amber-300",
  },
  {
    matcher: /\b(agr|aph|csp|fwm|fat|aec|agriculture|crop|soil|forestry|animal|fisheries)\b/i,
    category: "Agricultural Sciences",
    images: [
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-green-950/80 via-neutral-900/60 to-transparent",
    accentHex: "#22c55e",
    badgeBg: "bg-green-500/20 border-green-400/30",
    badgeText: "text-green-300",
  },
  {
    matcher: /\b(geo|glg|met|rsg|geology|meteorology|geophysics|mining|survey)\b/i,
    category: "Earth & Geospatial",
    images: [
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    ],
    gradient: "from-sky-950/80 via-stone-900/60 to-transparent",
    accentHex: "#0284c7",
    badgeBg: "bg-sky-500/20 border-sky-400/30",
    badgeText: "text-sky-300",
  },
];

// Fallback high-quality academic library images when no specific keyword is matched
const GENERAL_ACADEMIC_IMAGES = [
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Automatically determine the best image, category, and styling for any course.
 * Stable across reloads for the same course code or ID.
 */
export function getAutomaticCourseImage(course: {
  id?: string;
  code?: string | null;
  name?: string | null;
  department?: string | null;
}): CourseImageInfo {
  const code = (course.code || "").trim();
  const name = (course.name || "").trim();
  const dept = (course.department || "").trim();
  const fullText = `${code} ${name} ${dept}`.toLowerCase();

  // Find matching discipline
  const matched = DISCIPLINES.find((d) => d.matcher.test(fullText));

  if (matched) {
    const seed = hashString(`${code || ""}_${name || ""}`);
    const imgIndex = seed % matched.images.length;
    return {
      imageUrl: matched.images[imgIndex],
      category: matched.category,
      gradient: matched.gradient,
      accentHex: matched.accentHex,
      badgeBg: matched.badgeBg,
      badgeText: matched.badgeText,
    };
  }

  // Graceful deterministic fallback
  const fallbackSeed = hashString(`${code || "CRS"}_${name || "COURSE"}`);
  const fallbackImg = GENERAL_ACADEMIC_IMAGES[fallbackSeed % GENERAL_ACADEMIC_IMAGES.length];

  return {
    imageUrl: fallbackImg,
    category: dept || "Academic Course",
    gradient: "from-amber-950/80 via-slate-900/60 to-transparent",
    accentHex: "#d97706",
    badgeBg: "bg-amber-500/20 border-amber-400/30",
    badgeText: "text-amber-300",
  };
}
