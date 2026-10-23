export interface SyllabusTopic {
  id: string;
  orderIndex: number;
  title: string;
  description: string;
  keyFormulas?: string[];
  examTraps?: string;
  masteryPercentage?: number;
  lectureNote?: string;
}

export interface CourseSyllabusData {
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  semester: "1st Semester" | "2nd Semester";
  overview: string;
  topics: SyllabusTopic[];
}

export const ACCREDITED_SYLLABI: Record<string, CourseSyllabusData> = {
  "MTH 101": {
    courseCode: "MTH 101",
    courseTitle: "Elementary Mathematics I (Algebra & Trigonometry)",
    creditUnits: 3,
    semester: "1st Semester",
    overview: "Set theory, real numbers, quadratic equations, mathematical induction, binomial theorem, trigonometric identities, and complex numbers.",
    topics: [
      {
        id: "mth101-1",
        orderIndex: 1,
        title: "Set Theory & Number Systems",
        description: "Subsets, universal set, Venn diagrams, union, intersection, complement, Cartesian product, algebraic laws of sets.",
        keyFormulas: [
          "n(A \\cup B) = n(A) + n(B) - n(A \\cap B)",
          "A \\cap (B \\cup C) = (A \\cap B) \\cup (A \\cap C)",
          "(A \\cup B)' = A' \\cap B'"
        ],
        examTraps: "Confusing subset $\\subset$ with strict element belonging $\\in$, especially when dealing with the empty set $\\emptyset$.",
        masteryPercentage: 88,
        lectureNote: `### 1. Set Operations & Algebra of Sets
A set is a well-defined collection of distinct objects. Let $U$ be the universal set.

#### Essential Laws:
1. **De Morgan's Laws:**
   $$(A \\cup B)' = A' \\cap B' \\quad \\text{and} \\quad (A \\cap B)' = A' \\cup B'$$
2. **Inclusion-Exclusion Principle:**
   $$n(A \\cup B \\cup C) = n(A) + n(B) + n(C) - n(A \\cap B) - n(B \\cap C) - n(A \\cap C) + n(A \\cap B \\cap C)$$

#### Exam Trap:
In Nigerian CBT questions, watch out for "neither A nor B" questions:
$$n(A' \\cap B') = n(U) - n(A \\cup B)$$`
      },
      {
        id: "mth101-2",
        orderIndex: 2,
        title: "Quadratic Equations & Roots Theory",
        description: "Discriminant analysis, nature of roots, sum and product of roots, formation of quadratic equations from roots.",
        keyFormulas: [
          "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
          "\\alpha + \\beta = -\\frac{b}{a}, \\quad \\alpha\\beta = \\frac{c}{a}",
          "x^2 - (\\alpha + \\beta)x + \\alpha\\beta = 0"
        ],
        examTraps: "Forgetting to evaluate $\\alpha^2 + \\beta^2 = (\\alpha + \\beta)^2 - 2\\alpha\\beta$ or dividing by negative coefficients when forming new equations.",
        masteryPercentage: 74,
        lectureNote: `### 2. Roots of Quadratic Equations
For the equation $ax^2 + bx + c = 0$ with roots $\\alpha$ and $\\beta$:

#### Key Symmetrical Functions of Roots:
1. **Sum of Squares:**
   $$\\alpha^2 + \\beta^2 = (\\alpha + \\beta)^2 - 2\\alpha\\beta = \\left(-\\frac{b}{a}\\right)^2 - 2\\left(\\frac{c}{a}\\right) = \\frac{b^2 - 2ac}{a^2}$$
2. **Sum of Cubes:**
   $$\\alpha^3 + \\beta^3 = (\\alpha + \\beta)(\\alpha^2 - \\alpha\\beta + \\beta^2) = (\\alpha + \\beta)[(\\alpha + \\beta)^2 - 3\\alpha\\beta]$$
3. **Difference of Roots:**
   $$|\\alpha - \\beta| = \\sqrt{(\\alpha + \\beta)^2 - 4\\alpha\\beta} = \\frac{\\sqrt{b^2 - 4ac}}{|a|}$$`
      },
      {
        id: "mth101-3",
        orderIndex: 3,
        title: "Mathematical Induction & Binomial Theorem",
        description: "Principle of mathematical induction, factorial notation, permutations, combinations, and expansion of $(a + x)^n$ for positive integral and rational index.",
        keyFormulas: [
          "(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k",
          "T_{r+1} = \\binom{n}{r} a^{n-r} b^r",
          "\\binom{n}{r} = \\frac{n!}{r!(n - r)!}"
        ],
        examTraps: "Off-by-one errors in finding the $(r+1)$-th term. For the 5th term, $r = 4$, not $5$.",
        masteryPercentage: 62,
        lectureNote: `### 3. General Term of Binomial Expansion
For $(a + x)^n$, the general $(r+1)$-th term is given by:
$$T_{r+1} = \\binom{n}{r} a^{n-r} x^r$$

#### Finding Term Independent of $x$:
Set the overall exponent of $x$ to $0$ and solve for $r$. Ensure $r$ is a non-negative integer.`
      },
      {
        id: "mth101-4",
        orderIndex: 4,
        title: "Trigonometric Identities & De Moivre's Theorem",
        description: "Compound angles, double angles, half angles, solution of trigonometric equations, Argand diagram, polar representation $r(\\cos\\theta + i\\sin\\theta)$.",
        keyFormulas: [
          "\\sin(A \\pm B) = \\sin A\\cos B \\pm \\cos A\\sin B",
          "\\cos 2\\theta = \\cos^2\\theta - \\sin^2\\theta = 2\\cos^2\\theta - 1 = 1 - 2\\sin^2\\theta",
          "[r(\\cos\\theta + i\\sin\\theta)]^n = r^n(\\cos n\\theta + i\\sin n\\theta)"
        ],
        examTraps: "Missing secondary quadrant solutions when solving $\\sin\\theta = k$ or $\\cos\\theta = k$ over the interval $0 \\le \\theta \\le 360^\\circ$.",
        masteryPercentage: 55,
        lectureNote: `### 4. Complex Numbers & De Moivre's Theorem
Let $z = x + iy$.
- Modulus: $|z| = r = \\sqrt{x^2 + y^2}$
- Argument: $\\theta = \\arg(z) = \\arctan\\left(\\frac{y}{x}\\right)$ adjusted for quadrant.

#### De Moivre's Theorem:
$$(\\cos\\theta + i\\sin\\theta)^n = \\cos(n\\theta) + i\\sin(n\\theta)$$
This is indispensable for computing roots of unity $\\sqrt[n]{z}$.`
      }
    ]
  },
  "PHY 101": {
    courseCode: "PHY 101",
    courseTitle: "General Physics I (Mechanics, Thermal Physics & Waves)",
    creditUnits: 3,
    semester: "1st Semester",
    overview: "Vectors, kinematics in 1D and 2D, Newton's laws of motion, work, energy and momentum, rotational dynamics, gravitation, elasticity, and heat transfer.",
    topics: [
      {
        id: "phy101-1",
        orderIndex: 1,
        title: "Vectors & Dimensions in Physical Quantities",
        description: "Scalar and vector quantities, dot and cross products, dimensional analysis, testing physical equations for dimensional consistency.",
        keyFormulas: [
          "\\vec{A} \\cdot \\vec{B} = |A||B|\\cos\\theta",
          "|\\vec{A} \\times \\vec{B}| = |A||B|\\sin\\theta",
          "[F] = M L T^{-2}, \\quad [W] = M L^2 T^{-2}, \\quad [P] = M L^{-1} T^{-2}"
        ],
        examTraps: "Assuming dimensional consistency guarantees physical correctness: dimensionless constants like $2\\pi$ or $1/2$ cannot be determined by dimensional analysis alone.",
        masteryPercentage: 90,
        lectureNote: `### 1. Vector Operations & Dimensional Consistency
#### Dot (Scalar) Product:
$$\\vec{A} \\cdot \\vec{B} = A_x B_x + A_y B_y + A_z B_z$$
If $\\vec{A} \\cdot \\vec{B} = 0$, the vectors are strictly orthogonal (perpendicular).

#### Cross (Vector) Product:
$$\\vec{A} \\times \\vec{B} = \\begin{vmatrix} \\hat{i} & \\hat{j} & \\hat{k} \\\\ A_x & A_y & A_z \\\\ B_x & B_y & B_z \\end{vmatrix}$$`
      },
      {
        id: "phy101-2",
        orderIndex: 2,
        title: "Newton's Laws & Linear Momentum",
        description: "Inertial reference frames, friction, impulse, conservation of linear momentum, elastic and inelastic collisions in 1D and 2D.",
        keyFormulas: [
          "\\sum \\vec{F} = \\frac{d\\vec{p}}{dt} = m\\vec{a}",
          "\\vec{J} = \\int \\vec{F} dt = \\Delta \\vec{p} = m\\vec{v} - m\\vec{u}",
          "m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2"
        ],
        examTraps: "Forgetting vector signs for velocities in opposite directions during collision questions. An object moving left must have negative velocity.",
        masteryPercentage: 78,
        lectureNote: `### 2. Collisions & Impulse
- **Elastic Collision:** Both momentum and kinetic energy are conserved ($K_i = K_f$).
- **Inelastic Collision:** Momentum is conserved, but kinetic energy is converted into sound/heat.
- **Perfect Inelastic:** Bodies stick together with common velocity:
  $$V = \\frac{m_1 u_1 + m_2 u_2}{m_1 + m_2}$$`
      },
      {
        id: "phy101-3",
        orderIndex: 3,
        title: "Work, Energy & Gravitation",
        description: "Work-energy theorem, conservative and non-conservative forces, gravitational potential energy, escape velocity, Kepler's laws.",
        keyFormulas: [
          "W = \\Delta K = \\frac{1}{2} m v^2 - \\frac{1}{2} m u^2",
          "F_g = G\\frac{M m}{r^2}",
          "v_e = \\sqrt{\\frac{2GM}{R}} = \\sqrt{2gR}"
        ],
        examTraps: "Using $U = mgh$ for interplanetary distances instead of the universal potential formula $U = -\\frac{GMm}{r}$.",
        masteryPercentage: 65,
        lectureNote: `### 3. Work-Energy Principle & Escape Velocity
Escape velocity from Earth's surface ($R = 6.4 \\times 10^6\\text{ m}$):
$$v_e = \\sqrt{2gR} \\approx \\sqrt{2 \\times 9.8 \\times 6.4 \\times 10^6} \\approx 11.2\\text{ km/s}$$`
      }
    ]
  },
  "CSC 201": {
    courseCode: "CSC 201",
    courseTitle: "Computer Programming I (Structured & OOP Paradigms)",
    creditUnits: 3,
    semester: "1st Semester",
    overview: "Data types, memory models, control structures, pointers and references, functions, recursive algorithms, structs, and object-oriented encapsulation.",
    topics: [
      {
        id: "csc201-1",
        orderIndex: 1,
        title: "Memory Addressing, Pointers & References",
        description: "Stack vs Heap allocation, pointer arithmetic, dereferencing, void pointers, dynamic memory management (malloc/free vs new/delete).",
        keyFormulas: [
          "p = \\&var \\implies *p = var",
          "\\text{SizeOf}(int*) = 4 \\text{ or } 8 \\text{ bytes}",
          "*(arr + i) \\equiv arr[i]"
        ],
        examTraps: "Dangling pointers after free() or segmentation faults caused by dereferencing a NULL pointer.",
        masteryPercentage: 70,
        lectureNote: `### 1. Pointer Fundamentals in C / C++
A pointer stores the memory address of another variable.

\`\`\`c
int x = 42;
int *ptr = &x; // ptr holds address of x
*ptr = 99;     // dereferences ptr to modify x directly
\`\`\`

#### Pointer Arithmetic:
Adding 1 to a pointer increases its address by \`sizeof(type)\` bytes:
$$addr(\\text{ptr} + 1) = addr(\\text{ptr}) + 1 \\times \\text{sizeof}(T)$$`
      },
      {
        id: "csc201-2",
        orderIndex: 2,
        title: "Recursion & Call Stack Complexity",
        description: "Base case formulation, recursive step, call stack frames, tail-call optimization, time complexity using recurrence relations.",
        keyFormulas: [
          "T(n) = a T(n/b) + f(n) \\quad [\\text{Master Theorem}]",
          "\\text{Fib}(n) = \\text{Fib}(n-1) + \\text{Fib}(n-2)",
          "O(2^n) \\implies O(n) \\text{ with memoization}"
        ],
        examTraps: "Omitting the base case, resulting in stack overflow error (SIGSEGV).",
        masteryPercentage: 82,
        lectureNote: `### 2. Recursion Dynamics
Every recursive function requires:
1. **Base Case:** Halting condition where no recursive call is triggered.
2. **Inductive Step:** Progress towards the base case with reduced input size.

#### Master Theorem Quick-Lookup:
For $T(n) = aT(n/b) + \\Theta(n^k)$:
- If $\\log_b a > k \\implies T(n) = \\Theta(n^{\\log_b a})$
- If $\\log_b a = k \\implies T(n) = \\Theta(n^k \\log n)$
- If $\\log_b a < k \\implies T(n) = \\Theta(n^k)$`
      }
    ]
  },
  "GST 111": {
    courseCode: "GST 111",
    courseTitle: "Communication in English & Academic Writing",
    creditUnits: 2,
    semester: "1st Semester",
    overview: "Grammatical concord, sentence structure, punctuation, essay organization, phonetics and phonology, vowel and consonant sounds, stress patterns.",
    topics: [
      {
        id: "gst111-1",
        orderIndex: 1,
        title: "Grammatical Concord & Subject-Verb Agreement",
        description: "Proximity concord, notional concord, collective nouns, compound subjects joined by 'as well as', 'together with', 'either...or'.",
        keyFormulas: [
          "\\text{Singular Subject} \\to \\text{Singular Verb (-s)}",
          "\\text{Subject} + \\text{'together with'} + \\text{N}_2 \\to \\text{Verb agrees with Subject 1}",
          "\\text{Either A or B} \\to \\text{Verb agrees with B (Proximity)}"
        ],
        examTraps: "Letting intervening prepositional phrases like 'in addition to' or 'accompanied by' deceive you into picking a plural verb.",
        masteryPercentage: 92,
        lectureNote: `### 1. The Rules of Concord in University English
#### 1. The Principle of Proximity:
When correlative conjunctions (*either...or*, *neither...nor*, *not only...but also*) join subjects, the verb agrees with the closer subject:
- *Neither the lecturer nor the **students** **were** present.*
- *Neither the students nor the **lecturer** **was** present.*

#### 2. Parenthetical Phrases:
Expressions such as *with*, *together with*, *along with*, *as well as*, *in collaboration with* do NOT alter the number of the real subject:
- *The Vice Chancellor, together with his deputies, **is** attending the senate meeting.*`
      },
      {
        id: "gst111-2",
        orderIndex: 2,
        title: "English Phonetics & Syllable Stress",
        description: "Pure vowels (monophthongs), diphthongs, consonant clusters, primary and secondary stress, shift in stress between nouns and verbs.",
        keyFormulas: [
          "\\text{Noun (2 syllables)}: \\text{Stress on 1st syllable (PRE-sent)}",
          "\\text{Verb (2 syllables)}: \\text{Stress on 2nd syllable (pre-SENT)}"
        ],
        examTraps: "Picking unstressed schwa /ə/ sounds as long vowels in CBT phonetic questions.",
        masteryPercentage: 75,
        lectureNote: `### 2. Syllabic Stress Rules
1. **Two-Syllable Words (Noun vs. Verb shift):**
   - **OB-ject** (Noun) vs. **ob-JECT** (Verb)
   - **CON-duct** (Noun) vs. **con-DUCT** (Verb)
   - **RE-cord** (Noun) vs. **re-CORD** (Verb)
2. **Words ending in '-tion', '-sion', '-ic':**
   - Stress always falls on the penultimate (second-to-last) syllable: *e-lec-**TRON**-ic*, *or-gani-**ZA**-tion*.`
      }
    ]
  }
};

/**
 * Procedural fallback syllabus generator for courses not explicitly in ACCREDITED_SYLLABI.
 * Generates an institutional 5-topic curriculum with learning goals, formulas, and notes.
 */
export function getOrCreateCourseSyllabus(
  courseCode: string,
  courseTitle?: string,
  level?: string | null
): CourseSyllabusData {
  const normalizedCode = (courseCode || "").trim().toUpperCase();
  if (ACCREDITED_SYLLABI[normalizedCode]) {
    return ACCREDITED_SYLLABI[normalizedCode];
  }

  // Check code matches without space (e.g. MTH101 -> MTH 101)
  const spaced = normalizedCode.replace(/^([A-Z]{3})(\d{3})$/, "$1 $2");
  if (ACCREDITED_SYLLABI[spaced]) {
    return ACCREDITED_SYLLABI[spaced];
  }

  const title = courseTitle || `${normalizedCode} Core Course`;
  const isSecondSemester = /2$|two|ii/i.test(normalizedCode);
  const units = /101|102|201|202|301/i.test(normalizedCode) ? 3 : 2;

  return {
    courseCode: normalizedCode,
    courseTitle: title,
    creditUnits: units,
    semester: isSecondSemester ? "2nd Semester" : "1st Semester",
    overview: `Accredited Nigerian university departmental syllabus for ${normalizedCode} (${title}), aligned with NUC Benchmark Minimum Academic Standards (BMAS).`,
    topics: [
      {
        id: `${normalizedCode}-mod1`,
        orderIndex: 1,
        title: "Foundations & Theoretical Frameworks",
        description: `Introduction to fundamental principles, historical context, and core axioms governing ${normalizedCode}.`,
        keyFormulas: [
          "\\text{Criterion}(x) \\iff x \\in \\text{System Domain}",
          "\\Delta S_{total} \\ge 0"
        ],
        examTraps: "Confusing foundational definitions with specific case applications in CBT multi-choice options.",
        masteryPercentage: 80,
        lectureNote: `### Module 1: Foundational Frameworks of ${normalizedCode}
This module introduces the operational boundaries and core definitions required for solving analytical problems in **${normalizedCode}**.

#### Key Principles:
1. **Domain Boundary Rule:** Ensure all variables are evaluated within legitimate boundary conditions.
2. **Dimensional Consistency:** Check units across equations before substitution.`
      },
      {
        id: `${normalizedCode}-mod2`,
        orderIndex: 2,
        title: "Analytical Formulations & Problem Solving",
        description: "Mathematical modeling, governing equations, derivations, and standard problem-solving methodologies.",
        keyFormulas: [
          "f(t) = \\int_{0}^{t} K(t - \\tau) u(\\tau) d\\tau",
          "\\nabla \\cdot \\vec{F} = \\rho"
        ],
        examTraps: "Skipping intermediate sign verification during algebraic substitution.",
        masteryPercentage: 65,
        lectureNote: `### Module 2: Analytical Formulations in ${normalizedCode}
Derivations in Nigerian university CBT exams frequently test whether students understand the transitional steps between general principles and specific problem setups.`
      },
      {
        id: `${normalizedCode}-mod3`,
        orderIndex: 3,
        title: "Experimental Methodology & Lab Implementations",
        description: "Instrumentation, error estimation, standard laboratory protocols, and observational data synthesis.",
        keyFormulas: [
          "\\text{Relative Error} = \\frac{|x_{true} - x_{meas}|}{x_{true}} \\times 100\\%",
          "\\sigma = \\sqrt{\\frac{1}{N-1} \\sum_{i=1}^{N} (x_i - \\bar{x})^2}"
        ],
        examTraps: "Reporting error margins without identical significant figures to the measured quantity.",
        masteryPercentage: 70,
        lectureNote: `### Module 3: Measurement & Verification
Understand the difference between systematic errors (calibration issues) and random errors (stochastic variations).`
      },
      {
        id: `${normalizedCode}-mod4`,
        orderIndex: 4,
        title: "Real-World Applications & Case Studies",
        description: "Industrial implementations, Nigerian case studies, environmental considerations, and technical optimization.",
        keyFormulas: [
          "\\eta = \\frac{\\text{Useful Output}}{\\text{Total Input}} \\times 100\\%"
        ],
        examTraps: "Applying ideal formulas to real-world non-ideal systems without efficiency loss corrections.",
        masteryPercentage: 50,
        lectureNote: `### Module 4: Applied Implementations
Examines practical constraints and engineering trade-offs in local Nigerian industrial contexts.`
      },
      {
        id: `${normalizedCode}-mod5`,
        orderIndex: 5,
        title: "Past Examination Synthesis & Revision Drills",
        description: "High-yield past exam questions, typical CBT traps, time management strategies, and fast elimination heuristics.",
        keyFormulas: [
          "T_{opt} = \\frac{\\text{Total Duration (mins)}}{\\text{Total Questions}} \\approx 45\\text{s per question}"
        ],
        examTraps: "Spending over 90 seconds on a single computational question when other conceptual marks remain unclaimed.",
        masteryPercentage: 85,
        lectureNote: `### Module 5: CBT Exam Speed & Accuracy
In university CBT exams (e.g. at FUTA, UNILAG, OAU), pacing is everything:
1. Mark difficult computational problems for review.
2. Answer all instant conceptual questions first.
3. Eliminate clearly wrong extreme numerical options.`
      }
    ]
  };
}
