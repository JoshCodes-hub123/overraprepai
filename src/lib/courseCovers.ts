/**
 * Course, Topic, Note & CBT Drill visual image covers helper
 * Provides high-resolution, thematic academic cover images with fallback gradients and subject mapping.
 */

const SUBJECT_IMAGE_MAP: Record<string, string[]> = {
  math: ["/images/courses/mathematics.jpg", "/images/courses/mathematics-2.jpg"],
  mth: ["/images/courses/mathematics.jpg", "/images/courses/mathematics-2.jpg"],
  calc: ["/images/courses/mathematics-2.jpg", "/images/courses/mathematics.jpg"],
  phys: ["/images/courses/physics.jpg", "/images/courses/physics-2.jpg"],
  phy: ["/images/courses/physics.jpg", "/images/courses/physics-2.jpg"],
  chem: ["/images/courses/chemistry.jpg", "/images/courses/chemistry-2.jpg"],
  chm: ["/images/courses/chemistry.jpg", "/images/courses/chemistry-2.jpg"],
  bio: ["/images/courses/biology.jpg", "/images/courses/biology-2.jpg"],
  bot: ["/images/courses/biology.jpg", "/images/courses/biology-2.jpg"],
  zoo: ["/images/courses/biology-2.jpg", "/images/courses/biology.jpg"],
  comp: ["/images/courses/computing.jpg", "/images/courses/computing-2.jpg"],
  csc: ["/images/courses/computing.jpg", "/images/courses/computing-2.jpg"],
  cos: ["/images/courses/computing-2.jpg", "/images/courses/computing.jpg"],
  eng: ["/images/courses/engineering.jpg", "/images/courses/physics.jpg"],
  mech: ["/images/courses/engineering.jpg", "/images/courses/physics-2.jpg"],
  elec: ["/images/courses/physics.jpg", "/images/courses/engineering.jpg"],
  law: ["/images/courses/law.jpg"],
  med: ["/images/courses/medicine.jpg", "/images/courses/biology.jpg"],
  anat: ["/images/courses/medicine.jpg", "/images/courses/biology-2.jpg"],
  econ: ["/images/courses/business.jpg", "/images/courses/general.jpg"],
  bus: ["/images/courses/business.jpg"],
  acc: ["/images/courses/business.jpg", "/images/courses/mathematics.jpg"],
  agric: ["/images/courses/agriculture.jpg"],
  agr: ["/images/courses/agriculture.jpg"],
  gst: ["/images/courses/general.jpg", "/images/courses/general-2.jpg"],
  gen: ["/images/courses/general.jpg", "/images/courses/general-2.jpg"],
  hum: ["/images/courses/humanities.jpg", "/images/courses/humanities-2.jpg"],
  lit: ["/images/courses/humanities.jpg", "/images/courses/humanities-2.jpg"],
  his: ["/images/courses/humanities-2.jpg", "/images/courses/humanities.jpg"],
};

const ALL_COVERS = [
  "/images/courses/mathematics.jpg",
  "/images/courses/physics.jpg",
  "/images/courses/computing.jpg",
  "/images/courses/chemistry.jpg",
  "/images/courses/biology.jpg",
  "/images/courses/engineering.jpg",
  "/images/courses/business.jpg",
  "/images/courses/general.jpg",
  "/images/courses/law.jpg",
  "/images/courses/medicine.jpg",
  "/images/courses/humanities.jpg",
  "/images/courses/agriculture.jpg",
  "/images/courses/mathematics-2.jpg",
  "/images/courses/physics-2.jpg",
  "/images/courses/computing-2.jpg",
  "/images/courses/chemistry-2.jpg",
  "/images/courses/biology-2.jpg",
  "/images/courses/general-2.jpg",
  "/images/courses/humanities-2.jpg",
];

/**
 * Returns a high-res cover image URL tailored to the title, course code, and index
 */
export function getCoverImage(
  type: "topic" | "note" | "cbt",
  title: string,
  courseCode?: string,
  index = 0
): string {
  const combined = `${courseCode || ""} ${title || ""}`.toLowerCase();

  for (const [key, covers] of Object.entries(SUBJECT_IMAGE_MAP)) {
    if (combined.includes(key)) {
      return covers[index % covers.length];
    }
  }

  // Fallback to rotating deterministic cover based on index and title hash
  const hash = Math.abs(
    combined.split("").reduce((acc, char) => acc + char.charCodeAt(0), index * 3)
  );
  return ALL_COVERS[hash % ALL_COVERS.length];
}

/**
 * Subject badge colors for visual variety
 */
export function getCoverBadgeStyle(type: "topic" | "note" | "cbt", index = 0): {
  badge: string;
  gradient: string;
  text: string;
} {
  if (type === "cbt") {
    return {
      badge: "bg-amber-500 text-neutral-950 font-bold",
      gradient: "from-amber-950/80 via-neutral-950/60 to-transparent",
      text: "CBT Drill",
    };
  }

  if (type === "note") {
    const accents = [
      { badge: "bg-red-500 text-white font-bold", text: "PDF Note" },
      { badge: "bg-blue-600 text-white font-bold", text: "Lecture Slide" },
      { badge: "bg-amber-500 text-neutral-950 font-bold", text: "Handout" },
      { badge: "bg-emerald-600 text-white font-bold", text: "Study Guide" },
    ];
    const picked = accents[index % accents.length];
    return {
      badge: picked.badge,
      gradient: "from-neutral-950/85 via-neutral-950/50 to-transparent",
      text: picked.text,
    };
  }

  // Topic
  return {
    badge: "bg-amber-400 text-neutral-950 font-bold",
    gradient: "from-neutral-950/80 via-neutral-950/40 to-transparent",
    text: `Topic ${String(index + 1).padStart(2, "0")}`,
  };
}
