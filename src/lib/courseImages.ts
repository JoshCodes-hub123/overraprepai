/**
 * Automatic Course Image & Discipline Intelligence Engine
 * Maps any academic course (code, name, department) to real photographic
 * local academic imagery (`/images/courses/*.jpg`) AND human-friendly
 * descriptive titles so course cards never look like raw course codes.
 */

export interface CourseImageInfo {
  imageUrl: string;
  fallbackUrl: string;
  category: string;
  displayTitle: string;
  displayDepartment: string;
  gradient: string;
  accentHex: string;
  badgeBg: string;
  badgeText: string;
}

interface DisciplineConfig {
  matcher: RegExp;
  category: string;
  defaultDepartment: string;
  images: string[];
  gradient: string;
  accentHex: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Curated dictionary of real university course titles keyed by normalized course code
 * so courses stored in the database as just "CHE 104", "CSC 102", "GNS 102", etc.
 * automatically display their proper academic course title.
 */
const KNOWN_COURSE_TITLES: Record<string, { title: string; department: string }> = {
  "PHY 101": {
    title: "General Physics I: Mechanics, Thermal Physics & Properties of Matter",
    department: "Physics",
  },
  "PHY 102": {
    title: "General Physics II: Electricity, Magnetism & Modern Physics",
    department: "Physics",
  },
  "PHY 103": {
    title: "General Physics III: Waves, Optics & Acoustics",
    department: "Physics",
  },
  "PHY 107": {
    title: "Experimental Physics Laboratory I",
    department: "Physics",
  },
  "PHY 108": {
    title: "Experimental Physics Laboratory II",
    department: "Physics",
  },
  "CHE 101": {
    title: "General Chemistry I: Physical & Inorganic Principles",
    department: "Chemistry",
  },
  "CHE 102": {
    title: "General Chemistry II: Organic & Analytical Chemistry",
    department: "Chemistry",
  },
  "CHE 103": {
    title: "Practical Chemistry I: Quantitative Analysis",
    department: "Chemistry",
  },
  "CHE 104": {
    title: "Experimental & Practical Chemistry Laboratory",
    department: "Chemistry",
  },
  "CHM 101": {
    title: "General Physical & Inorganic Chemistry",
    department: "Chemistry",
  },
  "CHM 102": {
    title: "General Organic Chemistry",
    department: "Chemistry",
  },
  "MTS 101": {
    title: "Introductory Mathematics I: Algebra & Trigonometry",
    department: "Mathematical Sciences",
  },
  "MTS 102": {
    title: "Introductory Mathematics II: Calculus & Analytic Geometry",
    department: "Mathematical Sciences",
  },
  "MTS 103": {
    title: "Vectors, Geometry & Dynamics",
    department: "Mathematical Sciences",
  },
  "MTS 104": {
    title: "Vectors, Mechanics & Linear Algebra",
    department: "Mathematical Sciences",
  },
  "MTH 101": {
    title: "Elementary Mathematics I: Algebra & Trigonometry",
    department: "Mathematics",
  },
  "MTH 102": {
    title: "Elementary Mathematics II: Differential & Integral Calculus",
    department: "Mathematics",
  },
  "CSC 101": {
    title: "Introduction to Computer Science & Digital Systems",
    department: "Computer Science",
  },
  "CSC 102": {
    title: "Introduction to Problem Solving & Structured Programming",
    department: "Computer Science",
  },
  "CSC 103": {
    title: "Introduction to Computing & Algorithmic Problem Solving",
    department: "Computer Science",
  },
  "CSC 201": {
    title: "Computer Programming I & Software Design",
    department: "Computer Science",
  },
  "CSC 202": {
    title: "Data Structures & Algorithms",
    department: "Computer Science",
  },
  "BIO 101": {
    title: "General Biology I: Cell Biology, Genetics & Evolution",
    department: "Biology",
  },
  "BIO 102": {
    title: "General Biology II: Diversity of Life & Ecology",
    department: "Biology",
  },
  "BIO 103": {
    title: "Practical Biology Laboratory I",
    department: "Biology",
  },
  "BIO 104": {
    title: "Applied General Biology & Ecological Systems",
    department: "Biology",
  },
  "GNS 101": {
    title: "Use of English & Academic Reading Skills I",
    department: "General Studies",
  },
  "GNS 102": {
    title: "Use of English & Academic Writing Communication II",
    department: "General Studies",
  },
  "GNS 103": {
    title: "Information Literacy & Library Studies",
    department: "General Studies",
  },
  "GNS 106": {
    title: "Use of English & International Language Communication",
    department: "General Studies",
  },
  "GNS 203": {
    title: "Nigerian Peoples, Culture & Citizenship Studies",
    department: "General Studies",
  },
  "GNS 203/GST 112": {
    title: "Nigerian Peoples, Culture & National Development",
    department: "General Studies",
  },
  "GST 111": {
    title: "Communication in English & Study Skills",
    department: "General Studies",
  },
  "GST 112": {
    title: "Nigerian Peoples and Culture",
    department: "General Studies",
  },
  "MEE 101": {
    title: "Engineering Drawing & Technical Graphics I",
    department: "Mechanical Engineering",
  },
  "MEE 102": {
    title: "Workshop Practice & Manufacturing Processes",
    department: "Mechanical Engineering",
  },
  "EEE 201": {
    title: "Applied Electricity & Circuit Theory I",
    department: "Electrical & Electronics Engineering",
  },
  "STA 101": {
    title: "Introduction to Probability & Descriptive Statistics",
    department: "Statistics",
  },
};

const DISCIPLINES: DisciplineConfig[] = [
  {
    matcher: /\b(mts|mth|mat|sta|math|calculus|algebra|statistic|vector|differential|geometry|trigonometry|probability)\b/i,
    category: "Mathematics & Quantitative",
    defaultDepartment: "Mathematical Sciences",
    images: ["/images/courses/mathematics.jpg", "/images/courses/mathematics-2.jpg"],
    gradient: "from-amber-950/85 via-neutral-900/60 to-transparent",
    accentHex: "#f59e0b",
    badgeBg: "bg-amber-500/20 border-amber-400/30",
    badgeText: "text-amber-300",
  },
  {
    matcher: /\b(phy|phs|physics|mechanics|optics|quantum|thermodynamics|electromagnet|wave|astronomy|relativity)\b/i,
    category: "Physics & Physical Sciences",
    defaultDepartment: "Physics",
    images: ["/images/courses/physics.jpg", "/images/courses/physics-2.jpg"],
    gradient: "from-indigo-950/85 via-slate-900/60 to-transparent",
    accentHex: "#6366f1",
    badgeBg: "bg-indigo-500/20 border-indigo-400/30",
    badgeText: "text-indigo-300",
  },
  {
    matcher: /\b(chm|che|chemistry|organic|inorganic|polymer|reaction|biochem|bch|stoichiometry|titration)\b/i,
    category: "Chemical Sciences",
    defaultDepartment: "Chemistry",
    images: ["/images/courses/chemistry.jpg", "/images/courses/chemistry-2.jpg"],
    gradient: "from-emerald-950/85 via-neutral-900/60 to-transparent",
    accentHex: "#10b981",
    badgeBg: "bg-emerald-500/20 border-emerald-400/30",
    badgeText: "text-emerald-300",
  },
  {
    matcher: /\b(csc|cps|ift|sen|cos|ict|cys|comp|software|algorithm|database|cyber|network|data\s*science|cloud|computing)\b/i,
    category: "Computing & Technology",
    defaultDepartment: "Computer Science",
    images: ["/images/courses/computing.jpg", "/images/courses/computing-2.jpg"],
    gradient: "from-blue-950/85 via-slate-900/60 to-transparent",
    accentHex: "#3b82f6",
    badgeBg: "bg-blue-500/20 border-blue-400/30",
    badgeText: "text-blue-300",
  },
  {
    matcher: /\b(bio|mcb|microbio|botany|zoology|genetics|cell|organism|ecology|plant|animal\s*biology)\b/i,
    category: "Biological & Life Sciences",
    defaultDepartment: "Biology",
    images: ["/images/courses/biology.jpg", "/images/courses/biology-2.jpg"],
    gradient: "from-teal-950/85 via-neutral-900/60 to-transparent",
    accentHex: "#14b8a6",
    badgeBg: "bg-teal-500/20 border-teal-400/30",
    badgeText: "text-teal-300",
  },
  {
    matcher: /\b(gst|gns|general\s*studies|citizenship|peace|use\s*of\s*english|communication|french|german|nigeria|culture)\b/i,
    category: "General & Communication Studies",
    defaultDepartment: "General Studies",
    images: [
      "/images/courses/general.jpg",
      "/images/courses/humanities.jpg",
      "/images/courses/general-2.jpg",
    ],
    gradient: "from-amber-950/85 via-slate-900/60 to-transparent",
    accentHex: "#eab308",
    badgeBg: "bg-amber-500/20 border-amber-400/30",
    badgeText: "text-amber-300",
  },
  {
    matcher: /\b(eee|cve|mee|age|mme|ipe|mne|arc|bdg|qsv|urp|eng|engineering|circuit|cad|robotics|structural|civil|mechanical|electrical|architecture)\b/i,
    category: "Engineering & Built Environment",
    defaultDepartment: "Engineering",
    images: ["/images/courses/engineering.jpg", "/images/courses/physics-2.jpg"],
    gradient: "from-amber-950/85 via-zinc-900/60 to-transparent",
    accentHex: "#d97706",
    badgeBg: "bg-amber-500/20 border-amber-400/30",
    badgeText: "text-amber-300",
  },
  {
    matcher: /\b(med|ana|pha|pharm|nur|nursing|mls|anatomy|physiology|pathology|medicine|clinical|health|hospital)\b/i,
    category: "Medicine & Health Sciences",
    defaultDepartment: "College of Health Sciences",
    images: ["/images/courses/medicine.jpg", "/images/courses/biology-2.jpg"],
    gradient: "from-cyan-950/85 via-slate-900/60 to-transparent",
    accentHex: "#06b6d4",
    badgeBg: "bg-cyan-500/20 border-cyan-400/30",
    badgeText: "text-cyan-300",
  },
  {
    matcher: /\b(acc|ecn|bus|bfn|pad|fin|mkt|tmt|esm|economics|accounting|finance|management|business|banking|marketing)\b/i,
    category: "Management & Economics",
    defaultDepartment: "Management Sciences",
    images: ["/images/courses/business.jpg", "/images/courses/general.jpg"],
    gradient: "from-emerald-950/85 via-slate-900/60 to-transparent",
    accentHex: "#059669",
    badgeBg: "bg-emerald-500/20 border-emerald-400/30",
    badgeText: "text-emerald-300",
  },
  {
    matcher: /\b(law|pul|cil|jurisprudence|legal|torts|constitution|justice)\b/i,
    category: "Law & Jurisprudence",
    defaultDepartment: "Faculty of Law",
    images: ["/images/courses/law.jpg", "/images/courses/humanities-2.jpg"],
    gradient: "from-stone-950/85 via-neutral-900/60 to-transparent",
    accentHex: "#b45309",
    badgeBg: "bg-stone-500/20 border-stone-400/30",
    badgeText: "text-stone-300",
  },
  {
    matcher: /\b(agr|aph|csp|fwm|fat|aec|fst|ewm|agriculture|crop|soil|forestry|fisheries|food\s*science)\b/i,
    category: "Agricultural & Earth Sciences",
    defaultDepartment: "Agricultural Sciences",
    images: ["/images/courses/agriculture.jpg", "/images/courses/biology.jpg"],
    gradient: "from-green-950/85 via-neutral-900/60 to-transparent",
    accentHex: "#22c55e",
    badgeBg: "bg-green-500/20 border-green-400/30",
    badgeText: "text-green-300",
  },
  {
    matcher: /\b(lit|frn|yor|hau|ibo|linguistics|literature|language|history|philosophy|art|theatre|humanities)\b/i,
    category: "Humanities & Languages",
    defaultDepartment: "Humanities",
    images: ["/images/courses/humanities.jpg", "/images/courses/humanities-2.jpg"],
    gradient: "from-rose-950/85 via-neutral-900/60 to-transparent",
    accentHex: "#e11d48",
    badgeBg: "bg-rose-500/20 border-rose-400/30",
    badgeText: "text-rose-300",
  },
];

const GENERAL_ACADEMIC_IMAGES = [
  "/images/courses/general.jpg",
  "/images/courses/general-2.jpg",
  "/images/courses/humanities.jpg",
  "/images/courses/humanities-2.jpg",
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
 * Checks if a stored course name is just a raw course code or generic placeholder
 * (e.g. "CHE 104", "CSC 102", "GNS 102", "MTS 104 past questions", "PHY 102 (Resources and Past Questions)").
 */
function resolveHumanCourseTitle(
  rawCode: string,
  rawName: string,
  category: string,
  defaultDept: string,
  rawDept?: string | null
): { displayTitle: string; displayDepartment: string } {
  const normalizedCode = rawCode.trim().toUpperCase().replace(/\s+/g, " ");
  const known = KNOWN_COURSE_TITLES[normalizedCode];

  // Clean noisy suffixes from rawName like "(Resources and Past Questions)" or "past questions"
  const cleanedName = rawName
    .replace(/\(resources\s+and\s+past\s+questions\)/gi, "")
    .replace(/\bpast\s+questions\b/gi, "")
    .replace(/^([A-Z]{3}\s*\d{3})\s*[—\-:]\s*/i, "")
    .trim();

  // Check if cleanedName is empty or essentially just a course code like "CHE 104", "CSC 102", "CHEMISTRY 102"
  const looksLikeRawCode =
    !cleanedName ||
    cleanedName.toUpperCase() === normalizedCode ||
    /^[A-Z]{3}\s*\d{3}(\/[A-Z]{3}\s*\d{3})?$/i.test(cleanedName) ||
    /^(chemistry|biology|physics|mathematics)\s+\d{3}$/i.test(cleanedName);

  if (known) {
    return {
      displayTitle: looksLikeRawCode ? known.title : cleanedName,
      displayDepartment: rawDept?.trim() || known.department || defaultDept,
    };
  }

  if (looksLikeRawCode) {
    const levelMatch = normalizedCode.match(/\d{3}/);
    const levelNum = levelMatch ? levelMatch[0] : "";
    const roman = levelNum.endsWith("1")
      ? "I"
      : levelNum.endsWith("2")
        ? "II"
        : levelNum.endsWith("3")
          ? "III"
          : levelNum.endsWith("4")
            ? "IV"
            : "";
    return {
      displayTitle: `${defaultDept || category} ${roman || "Curriculum"}`.trim(),
      displayDepartment: rawDept?.trim() || defaultDept || category,
    };
  }

  return {
    displayTitle: cleanedName,
    displayDepartment: rawDept?.trim() || defaultDept || category,
  };
}

/**
 * Automatically determine the best real photograph, human-readable title,
 * discipline category, and styling for any course.
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

  const matched = DISCIPLINES.find((d) => d.matcher.test(fullText));
  const seed = hashString(`${code || "CRS"}_${name || "COURSE"}`);

  if (matched) {
    const imgIndex = seed % matched.images.length;
    const fallbackIndex = (imgIndex + 1) % matched.images.length;
    const { displayTitle, displayDepartment } = resolveHumanCourseTitle(
      code,
      name,
      matched.category,
      matched.defaultDepartment,
      dept
    );

    return {
      imageUrl: matched.images[imgIndex],
      fallbackUrl: matched.images[fallbackIndex],
      category: matched.category,
      displayTitle,
      displayDepartment,
      gradient: matched.gradient,
      accentHex: matched.accentHex,
      badgeBg: matched.badgeBg,
      badgeText: matched.badgeText,
    };
  }

  const fallbackImg = GENERAL_ACADEMIC_IMAGES[seed % GENERAL_ACADEMIC_IMAGES.length];
  const { displayTitle, displayDepartment } = resolveHumanCourseTitle(
    code,
    name,
    dept || "University Curriculum",
    dept || "Academic Studies",
    dept
  );

  return {
    imageUrl: fallbackImg,
    fallbackUrl: GENERAL_ACADEMIC_IMAGES[(seed + 1) % GENERAL_ACADEMIC_IMAGES.length],
    category: dept || "University Curriculum",
    displayTitle,
    displayDepartment,
    gradient: "from-amber-950/85 via-slate-900/60 to-transparent",
    accentHex: "#d97706",
    badgeBg: "bg-amber-500/20 border-amber-400/30",
    badgeText: "text-amber-300",
  };
}
