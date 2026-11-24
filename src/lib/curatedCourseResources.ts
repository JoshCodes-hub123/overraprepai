export interface CuratedFormulaItem {
  title: string;
  expression: string;
  applicationNote: string;
}

export interface CuratedStudyNote {
  id: string;
  title: string;
  topicName: string;
  readMinutes: number;
  summary: string;
  keyTakeaways: string[];
  examTrap: string;
}

export interface CuratedSyllabusTopic {
  id: string;
  name: string;
  summary: string;
  questionCount: number;
}

export interface CuratedPracticeQuestion {
  id: string;
  topic: string;
  question: string;
  formula?: string;
  options: { label: "A" | "B" | "C" | "D"; text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface CuratedCoursePack {
  disciplineLabel: string;
  formulas: CuratedFormulaItem[];
  notes: CuratedStudyNote[];
  topics: CuratedSyllabusTopic[];
  questions: CuratedPracticeQuestion[];
}

export function getCuratedCoursePack(
  courseCode?: string | null,
  courseName?: string | null
): CuratedCoursePack {
  const code = (courseCode || "COURSE").toUpperCase().trim();
  const name = (courseName || "University Course").trim();
  const combined = `${code} ${name}`.toLowerCase();

  if (/\b(mth|mts|mat|sta|calculus|algebra|trigonometry|math)\b/i.test(combined)) {
    const isSecondSem = /2$|102|202|calculus/i.test(code) || /calculus/i.test(name);
    return {
      disciplineLabel: isSecondSem
        ? "2nd Semester · Differential & Integral Calculus"
        : "1st Semester · Algebra, Sets & Trigonometry",
      formulas: isSecondSem
        ? [
            {
              title: "First Principles Derivative",
              expression: "f'(x) = lim_{h -> 0} [f(x+h) - f(x)] / h",
              applicationNote: "Foundation for tangent slopes and instantaneous rates of change.",
            },
            {
              title: "Product & Quotient Rules",
              expression: "d/dx [u·v] = u'v + uv'   |   d/dx [u/v] = (u'v - uv') / v²",
              applicationNote: "Essential for composite algebraic and trigonometric derivatives.",
            },
            {
              title: "Fundamental Theorem of Calculus",
              expression: "∫_a^b f(x) dx = F(b) - F(a), where F'(x) = f(x)",
              applicationNote: "Links definite integration directly to antiderivatives.",
            },
          ]
        : [
            {
              title: "Quadratic Roots & Discriminant",
              expression: "x = [-b ± √(b² - 4ac)] / 2a,   Δ = b² - 4ac",
              applicationNote: "Δ > 0 gives distinct real roots; Δ = 0 gives equal roots; Δ < 0 gives complex conjugates.",
            },
            {
              title: "Binomial Theorem Expansion",
              expression: "(a + b)^n = Σ_{k=0}^n C(n, k) a^(n-k) b^k",
              applicationNote: "General (r+1)-th term is T_{r+1} = C(n, r) a^(n-r) b^r.",
            },
            {
              title: "De Moivre's Theorem",
              expression: "[r(cos θ + i sin θ)]^n = r^n (cos nθ + i sin nθ)",
              applicationNote: "Used for finding powers and n-th roots of complex numbers.",
            },
          ],
      notes: [
        {
          id: `${code}-note-1`,
          title: isSecondSem
            ? `${code} Module 1: Limits, Continuity & Differentiability`
            : `${code} Module 1: Set Theory, Induction & Binomial Series`,
          topicName: isSecondSem ? "Limits & Continuity" : "Algebraic Foundations",
          readMinutes: 8,
          summary: isSecondSem
            ? `A function f(x) is continuous at x = a if lim_{x->a} f(x) = f(a). Differentiability implies continuity, but continuity alone does not guarantee differentiability (e.g., |x| at x = 0).`
            : `Covers Venn diagram identities, Principle of Mathematical Induction, and Binomial expansions for positive and rational indices.`,
          keyTakeaways: isSecondSem
            ? [
                "Always check left-hand and right-hand limits before declaring a limit exists.",
                "Apply L'Hôpital's Rule only to indeterminate forms 0/0 or ∞/∞.",
                "Stationary points occur where f'(x) = 0; classify via the second derivative f''(x).",
              ]
            : [
                "n(A ∪ B) = n(A) + n(B) - n(A ∩ B) for any two finite sets.",
                "Sum of roots α + β = -b/a and product of roots αβ = c/a.",
                "For |x| < 1, (1 + x)^n = 1 + nx + [n(n-1)/2!]x² + ...",
              ],
          examTrap: isSecondSem
            ? "Do not apply L'Hôpital's rule when the limit is not of the form 0/0 or ∞/∞."
            : "Remember to divide through by the leading coefficient 'a' before computing α + β = -b/a.",
        },
      ],
      topics: [
        {
          id: `${code}-top-1`,
          name: isSecondSem ? "Limits, Continuity & L'Hôpital's Rule" : "Sets, Real Numbers & Mathematical Induction",
          summary: isSecondSem
            ? "Evaluating algebraic and trigonometric limits, continuity tests, and indeterminate forms."
            : "Set operations, inclusion-exclusion, and proof by mathematical induction.",
          questionCount: 15,
        },
        {
          id: `${code}-top-2`,
          name: isSecondSem ? "Techniques of Differentiation & Applications" : "Quadratic Theory, Polynomials & Binomial Expansion",
          summary: isSecondSem
            ? "Chain, product, quotient, implicit differentiation, maxima/minima, and tangents."
            : "Symmetric functions of roots, remainder theorem, and binomial series.",
          questionCount: 15,
        },
      ],
      questions: [
        {
          id: `${code}-q-1`,
          topic: isSecondSem ? "Limits & Continuity" : "Quadratic Equations",
          question: isSecondSem
            ? "Evaluate lim_{x -> 0} (sin 3x) / x."
            : "If α and β are the roots of 2x² - 6x + 5 = 0, what is the value of α + β?",
          formula: isSecondSem ? "lim_{u -> 0} (sin u)/u = 1" : "α + β = -b / a",
          options: isSecondSem
            ? [
                { label: "A", text: "0", isCorrect: false },
                { label: "B", text: "1", isCorrect: false },
                { label: "C", text: "3", isCorrect: true },
                { label: "D", text: "1/3", isCorrect: false },
              ]
            : [
                { label: "A", text: "3", isCorrect: true },
                { label: "B", text: "-3", isCorrect: false },
                { label: "C", text: "6", isCorrect: false },
                { label: "D", text: "5/2", isCorrect: false },
              ],
          explanation: isSecondSem
            ? "Rewrite as 3 · lim_{x->0} (sin 3x)/(3x) = 3 × 1 = 3."
            : "For ax² + bx + c = 0, the sum of roots α + β = -b/a = -(-6)/2 = 3.",
        },
      ],
    };
  }

  if (/\b(phy|physics|mechanics|electricity)\b/i.test(combined)) {
    const isSecondSem = /2$|102|202|electricity|magnet/i.test(code) || /electricity/i.test(name);
    return {
      disciplineLabel: isSecondSem
        ? "2nd Semester · Electricity, Magnetism & Modern Physics"
        : "1st Semester · Mechanics, Thermal Physics & Properties of Matter",
      formulas: isSecondSem
        ? [
            {
              title: "Coulomb's Law",
              expression: "F = k |q₁ q₂| / r²,   k = 1 / (4π ε₀) ≈ 8.99 × 10⁹ N·m²/C²",
              applicationNote: "Gives the electrostatic force between two point charges separated by distance r.",
            },
            {
              title: "Ohm's Law & Electrical Power",
              expression: "V = I R   |   P = I V = I² R = V² / R",
              applicationNote: "Relates potential difference, current, resistance, and power dissipation.",
            },
          ]
        : [
            {
              title: "Equations of Uniformly Accelerated Motion",
              expression: "v = u + at   |   s = ut + ½at²   |   v² = u² + 2as",
              applicationNote: "Valid strictly when acceleration a is constant.",
            },
            {
              title: "Newton's Second Law & Impulse",
              expression: "F_net = dp/dt = m a   |   J = F Δt = Δp",
              applicationNote: "Relates net external force to rate of change of linear momentum.",
            },
          ],
      notes: [
        {
          id: `${code}-note-1`,
          title: isSecondSem
            ? `${code} Module 1: Electrostatics, Gauss's Law & Capacitors`
            : `${code} Module 1: Kinematics, Vectors & Newton's Laws of Motion`,
          topicName: isSecondSem ? "Electrostatics & Fields" : "Classical Mechanics",
          readMinutes: 9,
          summary: isSecondSem
            ? "Covers electric field intensity, electric potential, Gauss's flux theorem, and equivalent capacitance in series and parallel networks."
            : "Covers dimensional analysis, projectile kinematics, Newton's three laws, conservation of linear momentum, and work-energy theorem.",
          keyTakeaways: isSecondSem
            ? [
                "Capacitors in parallel add directly: C_eq = C₁ + C₂.",
                "Electric field inside a conducting sphere in electrostatic equilibrium is zero.",
              ]
            : [
                "Horizontal velocity of a projectile remains constant when air resistance is negligible.",
                "Total linear momentum is conserved in both elastic and inelastic collisions.",
              ],
          examTrap: isSecondSem
            ? "Do not confuse capacitor series/parallel rules with resistor formulas — they are inverted!"
            : "Always convert mass to kg, velocity to m/s, and angles to degrees/radians consistently.",
        },
      ],
      topics: [
        {
          id: `${code}-top-1`,
          name: isSecondSem ? "Electrostatics, Coulomb's Law & Electric Potential" : "Units, Dimensions, Vectors & Kinematics",
          summary: isSecondSem
            ? "Point charges, electric field lines, potential energy, and capacitance."
            : "Dimensional consistency, vector resolution, and projectile motion.",
          questionCount: 15,
        },
        {
          id: `${code}-top-2`,
          name: isSecondSem ? "DC Circuits, Kirchhoff's Laws & Electromagnetism" : "Dynamics, Work, Energy & Rotational Motion",
          summary: isSecondSem
            ? "Resistor networks, Kirchhoff's loop and junction rules, and magnetic force."
            : "Newton's laws, friction, conservation of energy, and moment of inertia.",
          questionCount: 15,
        },
      ],
      questions: [
        {
          id: `${code}-q-1`,
          topic: isSecondSem ? "Capacitance" : "Projectile Motion",
          question: isSecondSem
            ? "Two capacitors of 6 μF and 3 μF are connected in series. What is their equivalent capacitance?"
            : "At what launch angle does a projectile achieve maximum horizontal range on level ground?",
          options: isSecondSem
            ? [
                { label: "A", text: "9 μF", isCorrect: false },
                { label: "B", text: "2 μF", isCorrect: true },
                { label: "C", text: "3 μF", isCorrect: false },
                { label: "D", text: "18 μF", isCorrect: false },
              ]
            : [
                { label: "A", text: "30°", isCorrect: false },
                { label: "B", text: "45°", isCorrect: true },
                { label: "C", text: "60°", isCorrect: false },
                { label: "D", text: "90°", isCorrect: false },
              ],
          explanation: isSecondSem
            ? "For series capacitors, C_eq = (C₁ × C₂) / (C₁ + C₂) = (6 × 3) / (6 + 3) = 18 / 9 = 2 μF."
            : "Range R = (u² sin 2θ)/g is maximized when sin 2θ = 1, so 2θ = 90° => θ = 45°.",
        },
      ],
    };
  }

  return {
    disciplineLabel: `${code} · Accredited University Syllabus`,
    formulas: [
      {
        title: "Core Syllabus Principle",
        expression: `${code} — ${name}`,
        applicationNote: "Review the uploaded departmental lecture handouts and CBT practice drills below.",
      },
    ],
    notes: [
      {
        id: `${code}-note-1`,
        title: `${code} Comprehensive Study Guide & Exam Breakdown`,
        topicName: "Core Curriculum Overview",
        readMinutes: 7,
        summary: `Essential departmental summary for ${code} (${name}), covering core definitions, analytical frameworks, and high-frequency CBT examination concepts.`,
        keyTakeaways: [
          "Focus on core definitions and primary departmental handout examples.",
          "Practice timed CBT drills to build speed and accuracy before exams.",
        ],
        examTrap: "Read every multiple-choice stem carefully for negative qualifiers such as 'EXCEPT' or 'NOT'.",
      },
    ],
    topics: [
      {
        id: `${code}-top-1`,
        name: "Module 1: Fundamental Concepts & Definitions",
        summary: `Foundational principles and terminology for ${code}.`,
        questionCount: 12,
      },
      {
        id: `${code}-top-2`,
        name: "Module 2: Applied Problem Solving & Past Exam Drills",
        summary: `Practical applications and examination questions for ${code}.`,
        questionCount: 12,
      },
    ],
    questions: [
      {
        id: `${code}-q-1`,
        topic: "Core Curriculum",
        question: `Which study strategy is most effective when preparing for the ${code} (${name}) CBT examination?`,
        options: [
          {
            label: "A",
            text: "Combining official departmental lecture handouts with timed CBT topic drills",
            isCorrect: true,
          },
          {
            label: "B",
            text: "Skipping foundational definitions and formulas",
            isCorrect: false,
          },
          {
            label: "C",
            text: "Memorizing option letters without understanding the syllabus concepts",
            isCorrect: false,
          },
          {
            label: "D",
            text: "Ignoring boundary conditions in problem statements",
            isCorrect: false,
          },
        ],
        explanation: `Mastering the uploaded departmental notes alongside timed CBT drills ensures full coverage of ${code}.`,
      },
    ],
  };
}

const HIDDEN_BUILTIN_PACKS_KEY = "overra_builtin_pack_hidden_courses";

export function getHiddenBuiltInPackCourseIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIDDEN_BUILTIN_PACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isBuiltInPackHidden(courseId?: string | null): boolean {
  if (!courseId) return false;
  return getHiddenBuiltInPackCourseIds().includes(courseId);
}

export function setBuiltInPackHidden(courseId: string, hidden: boolean): void {
  if (typeof window === "undefined" || !courseId) return;
  try {
    const current = new Set(getHiddenBuiltInPackCourseIds());
    if (hidden) {
      current.add(courseId);
    } else {
      current.delete(courseId);
    }
    localStorage.setItem(HIDDEN_BUILTIN_PACKS_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // ignore storage errors
  }
}
