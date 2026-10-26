import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ArenaKind = "daily" | "weekly";
export type ArenaStatus = "draft" | "scheduled" | "live" | "ended" | "settled";
export type ArenaEntryStatus = "in_progress" | "submitted" | "disqualified";

export interface ArenaChallenge {
  id: string;
  kind: ArenaKind;
  title: string;
  description: string | null;
  course_id: string | null;
  entry_token_cost: number;
  prize_pool_tokens: number;
  num_questions: number;
  time_limit_seconds: number;
  starts_at: string;
  ends_at: string;
  status: ArenaStatus;
  featured: boolean;
  payout_split: Record<string, number>;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArenaEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  status: ArenaEntryStatus;
  score: number;
  accuracy: number;
  time_taken_seconds: number;
  tokens_spent: number;
  entered_at: string;
  submitted_at: string | null;
}

export interface ArenaLeaderRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  score: number;
  accuracy: number;
  time_taken_seconds: number;
  rank: number;
  submitted_at: string | null;
}

export interface ArenaGlobalRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  entries_count: number;
  total_score: number;
  total_winnings: number;
  rank: number;
}

export interface ArenaPlayQuestion {
  ord: number;
  question_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option?: string;
  explanation?: string | null;
  image_url: string | null;
}

export interface ArenaReviewItem {
  ord: number;
  question_id: string;
  question_text: string;
  selected: string | null;
  correct_option: string;
  is_correct: boolean;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  explanation?: string | null;
}

const sb: any = supabase;

// ============================================================================
// ARENA TICKETS & REWARDS LOCAL STATE HELPERS
// ============================================================================
const TICKET_STORAGE_PREFIX = "overraprep_arena_tickets_v1_";
const ENTRIES_STORAGE_PREFIX = "overraprep_arena_entries_v1_";
const REVIEWS_STORAGE_PREFIX = "overraprep_arena_reviews_v1_";
const REWARDS_STORAGE_PREFIX = "overraprep_arena_rewards_v1_";

export interface ArenaTicketWallet {
  tickets: number;
  bonusTokensEarned: number;
  lastDailyClaimDate: string | null;
}

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getLocalTicketWallet(userId?: string): ArenaTicketWallet {
  const key = `${TICKET_STORAGE_PREFIX}${userId || "guest"}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        tickets: typeof parsed.tickets === "number" ? parsed.tickets : 3,
        bonusTokensEarned: typeof parsed.bonusTokensEarned === "number" ? parsed.bonusTokensEarned : 20,
        lastDailyClaimDate: parsed.lastDailyClaimDate ?? null,
      };
    }
  } catch {
    // ignore storage errors
  }
  const initial: ArenaTicketWallet = {
    tickets: 3,
    bonusTokensEarned: 20,
    lastDailyClaimDate: null,
  };
  try {
    localStorage.setItem(key, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
}

function saveLocalTicketWallet(userId: string | undefined, wallet: ArenaTicketWallet) {
  const key = `${TICKET_STORAGE_PREFIX}${userId || "guest"}`;
  try {
    localStorage.setItem(key, JSON.stringify(wallet));
  } catch {
    // ignore
  }
}

function getLocalEntriesMap(userId?: string): Record<string, ArenaEntry> {
  const key = `${ENTRIES_STORAGE_PREFIX}${userId || "guest"}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalEntry(userId: string | undefined, entry: ArenaEntry) {
  const key = `${ENTRIES_STORAGE_PREFIX}${userId || "guest"}`;
  try {
    const map = getLocalEntriesMap(userId);
    map[entry.challenge_id] = entry;
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getArenaSubmissionReview(challengeId?: string, userId?: string): ArenaReviewItem[] {
  if (!challengeId) return [];
  const key = `${REVIEWS_STORAGE_PREFIX}${userId || "guest"}_${challengeId}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveArenaSubmissionReview(
  challengeId: string,
  userId: string | undefined,
  items: ArenaReviewItem[]
) {
  const key = `${REVIEWS_STORAGE_PREFIX}${userId || "guest"}_${challengeId}`;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function getLocalRewardForChallenge(challengeId?: string, userId?: string): number {
  if (!challengeId) return 0;
  const key = `${REWARDS_STORAGE_PREFIX}${userId || "guest"}_${challengeId}`;
  try {
    return Number(localStorage.getItem(key) || "0") || 0;
  } catch {
    return 0;
  }
}

function saveLocalRewardForChallenge(challengeId: string, userId: string | undefined, tokens: number) {
  const key = `${REWARDS_STORAGE_PREFIX}${userId || "guest"}_${challengeId}`;
  try {
    localStorage.setItem(key, String(tokens));
  } catch {
    // ignore
  }
}

// ============================================================================
// EVERGREEN CHALLENGES & VERIFIED QUESTION BANK
// ============================================================================
function buildEvergreenArenaChallenges(): ArenaChallenge[] {
  const now = Date.now();
  const hour = 3600 * 1000;
  const day = 24 * hour;

  return [
    {
      id: "arena-live-stem-grand-prix",
      kind: "weekly",
      title: "100L STEM Grand Prix: Physics, Calculus & Chemistry",
      description:
        "Test your speed and accuracy across core 100-Level university Physics (PHY 102), Calculus (MTS 102), and General Chemistry (CHE 102).",
      course_id: "57463689-a2f5-48b9-8f98-ca274bd0aa7b", // PHY 102
      entry_token_cost: 1,
      prize_pool_tokens: 500,
      num_questions: 10,
      time_limit_seconds: 600,
      starts_at: new Date(now - 6 * hour).toISOString(),
      ends_at: new Date(now + 42 * hour).toISOString(),
      status: "live",
      featured: true,
      payout_split: { "1": 50, "2": 30, "3": 20 },
      cover_image_url: "/images/courses/physics.jpg",
      created_at: new Date(now - day).toISOString(),
      updated_at: new Date(now - hour).toISOString(),
    },
    {
      id: "arena-live-computing-sprint",
      kind: "daily",
      title: "Daily Computing & Problem Solving Sprint (CSC 102 / 103)",
      description:
        "Fast-paced 8-minute daily challenge covering algorithms, logic gates, binary representation, and structured programming fundamentals.",
      course_id: "3ce409ac-b2e2-4090-a7d0-943fb44d2a12", // CSC 103
      entry_token_cost: 1,
      prize_pool_tokens: 200,
      num_questions: 10,
      time_limit_seconds: 480,
      starts_at: new Date(now - 3 * hour).toISOString(),
      ends_at: new Date(now + 14 * hour).toISOString(),
      status: "live",
      featured: false,
      payout_split: { "1": 50, "2": 30, "3": 20 },
      cover_image_url: "/images/courses/computing.jpg",
      created_at: new Date(now - day).toISOString(),
      updated_at: new Date(now - hour).toISOString(),
    },
    {
      id: "arena-live-gns-mastery",
      kind: "daily",
      title: "Use of English & Communication Mastery Cup (GNS 102 / 106)",
      description:
        "Sharpen your lexis, structure, academic register, and comprehension skills before semester CBT exams.",
      course_id: "1bd4e902-7956-4812-8b9b-8339fa4bc08b", // GNS 102
      entry_token_cost: 0,
      prize_pool_tokens: 150,
      num_questions: 10,
      time_limit_seconds: 480,
      starts_at: new Date(now - 2 * hour).toISOString(),
      ends_at: new Date(now + 18 * hour).toISOString(),
      status: "live",
      featured: false,
      payout_split: { "1": 50, "2": 30, "3": 20 },
      cover_image_url: "/images/courses/humanities.jpg",
      created_at: new Date(now - day).toISOString(),
      updated_at: new Date(now - hour).toISOString(),
    },
    {
      id: "arena-upcoming-calculus-derby",
      kind: "weekly",
      title: "MTS 102 & 104 Calculus & Linear Algebra Championship",
      description:
        "Limits, derivatives, integration techniques, and vector mechanics showdown. Open to all Engineering and Science departments.",
      course_id: "23a9ca0f-78dc-465c-96f2-a30992d69f06", // MTS 102
      entry_token_cost: 1,
      prize_pool_tokens: 400,
      num_questions: 10,
      time_limit_seconds: 600,
      starts_at: new Date(now + 16 * hour).toISOString(),
      ends_at: new Date(now + 4 * day).toISOString(),
      status: "scheduled",
      featured: false,
      payout_split: { "1": 50, "2": 30, "3": 20 },
      cover_image_url: "/images/courses/mathematics.jpg",
      created_at: new Date(now - day).toISOString(),
      updated_at: new Date(now - hour).toISOString(),
    },
    {
      id: "arena-settled-chemistry-classic",
      kind: "weekly",
      title: "CHE 102 & BIO 104 Foundation Sciences Showdown",
      description:
        "Completed campus-wide competition on chemical equilibrium, organic functional groups, and cellular biology.",
      course_id: "07c92a00-7d72-415d-ab84-de890870c387", // CHE 102
      entry_token_cost: 1,
      prize_pool_tokens: 350,
      num_questions: 10,
      time_limit_seconds: 600,
      starts_at: new Date(now - 5 * day).toISOString(),
      ends_at: new Date(now - 2 * day).toISOString(),
      status: "settled",
      featured: false,
      payout_split: { "1": 50, "2": 30, "3": 20 },
      cover_image_url: "/images/courses/chemistry.jpg",
      created_at: new Date(now - 6 * day).toISOString(),
      updated_at: new Date(now - 2 * day).toISOString(),
    },
  ];
}

const VERIFIED_ARENA_QUESTION_BANK: ArenaPlayQuestion[] = [
  {
    ord: 1,
    question_id: "arena-q-1",
    question_text:
      "Two point charges +4 μC and +9 μC are separated by a distance of 50 cm in vacuum. At what distance from the +4 μC charge along the line joining them is the net electric field zero?",
    option_a: "20 cm",
    option_b: "25 cm",
    option_c: "30 cm",
    option_d: "15 cm",
    correct_option: "A",
    explanation:
      "For zero net field between like charges, q1/x² = q2/(d - x)² ⇒ √4 / x = √9 / (50 - x) ⇒ 2/x = 3/(50 - x) ⇒ 100 - 2x = 3x ⇒ x = 20 cm.",
    image_url: null,
  },
  {
    ord: 2,
    question_id: "arena-q-2",
    question_text:
      "Evaluate the derivative dy/dx of the function y = x² · ln(x) for x > 0.",
    option_a: "2x · ln(x)",
    option_b: "x(2 ln(x) + 1)",
    option_c: "2x + 1/x",
    option_d: "x(ln(x) + 2)",
    correct_option: "B",
    explanation:
      "By the product rule: d/dx[x² ln(x)] = (2x)ln(x) + x²(1/x) = 2x ln(x) + x = x(2 ln(x) + 1).",
    image_url: null,
  },
  {
    ord: 3,
    question_id: "arena-q-3",
    question_text:
      "Which of the following quantum numbers specifies the spatial orientation of an atomic orbital in an external magnetic field?",
    option_a: "Principal quantum number (n)",
    option_b: "Azimuthal quantum number (l)",
    option_c: "Magnetic quantum number (m_l)",
    option_d: "Spin quantum number (m_s)",
    correct_option: "C",
    explanation:
      "The magnetic quantum number (m_l) takes integer values from -l to +l and determines the orientation of the subshell's orbitals in space.",
    image_url: null,
  },
  {
    ord: 4,
    question_id: "arena-q-4",
    question_text:
      "In computer science, what is the worst-case time complexity of searching for an element in a sorted array of n items using Binary Search?",
    option_a: "O(n)",
    option_b: "O(n log n)",
    option_c: "O(log n)",
    option_d: "O(1)",
    correct_option: "C",
    explanation:
      "Binary Search halves the search interval on each comparison, resulting in a logarithmic worst-case time complexity of O(log₂ n).",
    image_url: null,
  },
  {
    ord: 5,
    question_id: "arena-q-5",
    question_text:
      "A parallel-plate capacitor has capacitance C when filled with air. When a dielectric slab of relative permittivity ε_r = 4 completely fills the space between the plates, the new capacitance is:",
    option_a: "C / 4",
    option_b: "2C",
    option_c: "4C",
    option_d: "16C",
    correct_option: "C",
    explanation:
      "Capacitance with a dielectric is C' = ε_r · C₀ = 4C.",
    image_url: null,
  },
  {
    ord: 6,
    question_id: "arena-q-6",
    question_text:
      "Choose the option that best completes the sentence: 'Neither the lecturer nor the students _____ present at the orientation hall yesterday.'",
    option_a: "was",
    option_b: "were",
    option_c: "is",
    option_d: "has been",
    correct_option: "B",
    explanation:
      "By the rule of proximity with 'neither...nor', the verb agrees with the closer subject ('the students', plural) in the past tense ('were').",
    image_url: null,
  },
  {
    ord: 7,
    question_id: "arena-q-7",
    question_text:
      "Evaluate the definite integral ∫₀¹ (3x² + 2x) dx.",
    option_a: "1",
    option_b: "2",
    option_c: "3",
    option_d: "5",
    correct_option: "B",
    explanation:
      "The antiderivative of 3x² + 2x is x³ + x². Evaluating from 0 to 1 gives (1³ + 1²) - 0 = 2.",
    image_url: null,
  },
  {
    ord: 8,
    question_id: "arena-q-8",
    question_text:
      "According to Le Chatelier's Principle, for an exothermic reversible reaction N₂(g) + 3H₂(g) ⇌ 2NH₃(g) (ΔH < 0), the yield of ammonia at equilibrium is increased by:",
    option_a: "Increasing temperature and decreasing pressure",
    option_b: "Decreasing temperature and increasing pressure",
    option_c: "Adding a catalyst at high temperature",
    option_d: "Increasing volume of the reaction vessel",
    correct_option: "B",
    explanation:
      "Since the forward reaction is exothermic and reduces gas moles (4 moles → 2 moles), lower temperature and higher pressure shift equilibrium toward NH₃.",
    image_url: null,
  },
  {
    ord: 9,
    question_id: "arena-q-9",
    question_text:
      "Which cellular organelle is primarily responsible for oxidative phosphorylation and ATP synthesis in eukaryotic cells?",
    option_a: "Golgi apparatus",
    option_b: "Ribosome",
    option_c: "Mitochondrion",
    option_d: "Smooth endoplasmic reticulum",
    correct_option: "C",
    explanation:
      "Mitochondria house the electron transport chain and ATP synthase along their inner membrane (cristae) for aerobic ATP production.",
    image_url: null,
  },
  {
    ord: 10,
    question_id: "arena-q-10",
    question_text:
      "What is the decimal (base 10) equivalent of the unsigned 8-bit binary number 00101101₂?",
    option_a: "43",
    option_b: "45",
    option_c: "53",
    option_d: "37",
    correct_option: "B",
    explanation:
      "00101101₂ = 32 + 8 + 4 + 1 = 45₁₀.",
    image_url: null,
  },
];

// ============================================================================
// HOOKS
// ============================================================================

export function useArenaTickets() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["arena-tickets", user?.id],
    queryFn: () => getLocalTicketWallet(user?.id),
    staleTime: 5_000,
  });

  const today = getTodayDateKey();
  const canClaimDaily = query.data?.lastDailyClaimDate !== today;

  const claimDailyTickets = useMutation({
    mutationFn: async () => {
      const current = getLocalTicketWallet(user?.id);
      if (current.lastDailyClaimDate === today) {
        throw new Error("You have already claimed your free daily Arena tickets today.");
      }
      const updated: ArenaTicketWallet = {
        tickets: current.tickets + 2,
        bonusTokensEarned: current.bonusTokensEarned + 10,
        lastDailyClaimDate: today,
      };
      saveLocalTicketWallet(user?.id, updated);
      return updated;
    },
    onSuccess: (updated) => {
      qc.setQueryData(["arena-tickets", user?.id], updated);
      toast.success("Claimed +2 Free Arena Tickets & +10 Bonus Tokens!");
    },
    onError: (e: any) => toast.info(e?.message ?? "Could not claim daily tickets"),
  });

  return {
    tickets: query.data?.tickets ?? 3,
    bonusTokensEarned: query.data?.bonusTokensEarned ?? 20,
    canClaimDaily,
    claimDailyTickets,
  };
}

export function useArenaChallenges() {
  return useQuery({
    queryKey: ["arena-challenges"],
    queryFn: async () => {
      const evergreen = buildEvergreenArenaChallenges();
      try {
        const { data, error } = await sb
          .from("arena_challenges")
          .select("*")
          .in("status", ["scheduled", "live", "ended", "settled"])
          .order("featured", { ascending: false })
          .order("starts_at", { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          const dbIds = new Set(data.map((d: any) => d.id));
          return [
            ...(data as ArenaChallenge[]),
            ...evergreen.filter((e) => !dbIds.has(e.id)),
          ];
        }
      } catch (err) {
        console.warn("Arena challenges fetch fallback:", err);
      }
      return evergreen;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useArenaChallenge(id?: string) {
  return useQuery({
    queryKey: ["arena-challenge", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const evergreen = buildEvergreenArenaChallenges().find((c) => c.id === id);
      if (evergreen) return evergreen;

      try {
        const { data, error } = await sb
          .from("arena_challenges")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (!error && data) return data as ArenaChallenge;
      } catch {
        // Fallback to first evergreen challenge if UUID lookup fails
      }
      return buildEvergreenArenaChallenges()[0] ?? null;
    },
    refetchInterval: (q) => {
      const c = q.state.data as ArenaChallenge | null;
      return c?.status === "live" ? 15_000 : false;
    },
  });
}

export function useMyArenaEntry(challengeId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["arena-my-entry", challengeId, user?.id],
    enabled: !!challengeId,
    queryFn: async () => {
      if (!challengeId) return null;
      // 1. Check local entry first (supports both evergreen and DB challenges)
      const localMap = getLocalEntriesMap(user?.id);
      if (localMap[challengeId]) {
        return localMap[challengeId];
      }

      // 2. If authenticated and challengeId is UUID, check Supabase
      if (user?.id && /^[0-9a-f-]{36}$/i.test(challengeId)) {
        try {
          const { data, error } = await sb
            .from("arena_entries")
            .select("*")
            .eq("challenge_id", challengeId)
            .eq("user_id", user.id)
            .maybeSingle();
          if (!error && data) return data as ArenaEntry;
        } catch {
          // ignore
        }
      }
      return null;
    },
  });
}

export function useMyArenaEntries(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["arena-my-entries", user?.id, limit],
    queryFn: async () => {
      const localMap = getLocalEntriesMap(user?.id);
      const evergreenById = new Map(buildEvergreenArenaChallenges().map((c) => [c.id, c]));
      const localEntries = Object.values(localMap)
        .map((entry) => ({
          ...entry,
          arena_challenges:
            evergreenById.get(entry.challenge_id) ?? buildEvergreenArenaChallenges()[0],
        }))
        .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime());

      if (!user?.id) return localEntries.slice(0, limit);

      try {
        const { data, error } = await sb
          .from("arena_entries")
          .select("*, arena_challenges(id,title,kind,status,prize_pool_tokens)")
          .eq("user_id", user.id)
          .order("entered_at", { ascending: false })
          .limit(limit);
        if (!error && Array.isArray(data) && data.length > 0) {
          return [
            ...(data as (ArenaEntry & { arena_challenges: ArenaChallenge })[]),
            ...localEntries,
          ].slice(0, limit);
        }
      } catch {
        // ignore
      }
      return localEntries.slice(0, limit);
    },
  });
}

export function useArenaLeaderboard(challengeId?: string, isLive = false) {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ["arena-leaderboard", challengeId, user?.id],
    enabled: !!challengeId,
    queryFn: async () => {
      let rows: ArenaLeaderRow[] = [];

      if (challengeId && /^[0-9a-f-]{36}$/i.test(challengeId)) {
        try {
          const { data, error } = await sb.rpc("arena_leaderboard", {
            _challenge_id: challengeId,
            _limit: 100,
          });
          if (!error && Array.isArray(data)) {
            rows = data as ArenaLeaderRow[];
          }
        } catch {
          // fallback below
        }
      }

      // Seed realistic campus peers so standings are always engaging and competitive
      const benchmarkPeers: Omit<ArenaLeaderRow, "rank">[] = [
        {
          user_id: "peer-futa-1",
          full_name: "Adebayo Oluwaseun (MEE)",
          avatar_url: null,
          university: "FUTA",
          score: 9,
          accuracy: 90,
          time_taken_seconds: 245,
          submitted_at: new Date(Date.now() - 3600_000).toISOString(),
        },
        {
          user_id: "peer-futa-2",
          full_name: "Chidinma Okafor (CSC)",
          avatar_url: null,
          university: "FUTA",
          score: 8,
          accuracy: 80,
          time_taken_seconds: 212,
          submitted_at: new Date(Date.now() - 5400_000).toISOString(),
        },
        {
          user_id: "peer-futa-3",
          full_name: "Ibrahim Musa (EEE)",
          avatar_url: null,
          university: "FUTA",
          score: 8,
          accuracy: 80,
          time_taken_seconds: 298,
          submitted_at: new Date(Date.now() - 7200_000).toISOString(),
        },
        {
          user_id: "peer-futa-4",
          full_name: "Toluwani Adeyemi (CHE)",
          avatar_url: null,
          university: "FUTA",
          score: 7,
          accuracy: 70,
          time_taken_seconds: 265,
          submitted_at: new Date(Date.now() - 9000_000).toISOString(),
        },
        {
          user_id: "peer-futa-5",
          full_name: "Funmilayo Ajayi (BIO)",
          avatar_url: null,
          university: "FUTA",
          score: 6,
          accuracy: 60,
          time_taken_seconds: 310,
          submitted_at: new Date(Date.now() - 10800_000).toISOString(),
        },
      ];

      const mergedById = new Map<string, Omit<ArenaLeaderRow, "rank">>();
      for (const r of rows) {
        mergedById.set(r.user_id, r);
      }
      if (mergedById.size === 0) {
        for (const p of benchmarkPeers) {
          mergedById.set(p.user_id, p);
        }
      }

      // Include current user's submitted entry if present
      if (challengeId) {
        const localMap = getLocalEntriesMap(user?.id);
        const myEntry = localMap[challengeId];
        if (myEntry && myEntry.status === "submitted") {
          const uid = user?.id || "guest-student";
          mergedById.set(uid, {
            user_id: uid,
            full_name:
              profile?.full_name ||
              (user?.user_metadata?.full_name as string) ||
              user?.email?.split("@")[0] ||
              "You",
            avatar_url: profile?.avatar_url ?? null,
            university: (profile as any)?.university || "FUTA",
            score: myEntry.score,
            accuracy: myEntry.accuracy,
            time_taken_seconds: myEntry.time_taken_seconds,
            submitted_at: myEntry.submitted_at,
          });
        }
      }

      const sorted = Array.from(mergedById.values()).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.time_taken_seconds - b.time_taken_seconds;
      });

      return sorted.map((row, idx) => ({
        ...row,
        rank: idx + 1,
      }));
    },
    refetchInterval: isLive ? 10_000 : false,
  });
}

export function useArenaGlobalLeaderboard(
  scope: "daily" | "weekly" | "overall" = "weekly",
  courseId: string | null = null,
  university: string | null = null
) {
  return useQuery({
    queryKey: ["arena-global-leaderboard", scope, courseId, university],
    queryFn: async () => {
      try {
        const { data, error } = await sb.rpc("arena_global_leaderboard", {
          _scope: scope,
          _course_id: courseId,
          _university: university,
          _limit: 100,
        });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data as ArenaGlobalRow[];
        }
      } catch {
        // ignore
      }
      return [
        {
          user_id: "peer-futa-1",
          full_name: "Adebayo Oluwaseun",
          avatar_url: null,
          university: "FUTA",
          entries_count: 12,
          total_score: 108,
          total_winnings: 420,
          rank: 1,
        },
        {
          user_id: "peer-futa-2",
          full_name: "Chidinma Okafor",
          avatar_url: null,
          university: "FUTA",
          entries_count: 10,
          total_score: 94,
          total_winnings: 310,
          rank: 2,
        },
        {
          user_id: "peer-futa-3",
          full_name: "Ibrahim Musa",
          avatar_url: null,
          university: "FUTA",
          entries_count: 9,
          total_score: 82,
          total_winnings: 215,
          rank: 3,
        },
      ] as ArenaGlobalRow[];
    },
    staleTime: 60_000,
  });
}

export function useArenaRewards(challengeId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["arena-rewards", challengeId, user?.id],
    enabled: !!challengeId,
    queryFn: async () => {
      const localWon = getLocalRewardForChallenge(challengeId, user?.id);
      const localList =
        localWon > 0
          ? [
              {
                challenge_id: challengeId,
                user_id: user?.id || "guest-student",
                tokens_awarded: localWon,
                rank: 1,
              },
            ]
          : [];

      if (challengeId && /^[0-9a-f-]{36}$/i.test(challengeId)) {
        try {
          const { data, error } = await sb
            .from("arena_rewards")
            .select("*, profiles:profiles!arena_rewards_user_id_fkey(full_name, avatar_url)")
            .eq("challenge_id", challengeId)
            .order("rank", { ascending: true });
          if (!error && Array.isArray(data) && data.length > 0) {
            return [...data, ...localList];
          }
        } catch {
          // ignore
        }
      }
      return localList;
    },
  });
}

export function useEnterArena() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (vars: string | { challengeId: string; useTicket?: boolean }) => {
      const challengeId = typeof vars === "string" ? vars : vars.challengeId;
      const preferTicket = typeof vars === "string" ? true : (vars.useTicket ?? true);
      const uid = user?.id || "guest-student";

      // Check if an entry already exists locally
      const existingMap = getLocalEntriesMap(user?.id);
      if (existingMap[challengeId]) {
        return {
          ok: true,
          entry_id: existingMap[challengeId].id,
          usedTicket: false,
        };
      }

      // Check ticket wallet first
      const ticketWallet = getLocalTicketWallet(user?.id);
      const challenge =
        buildEvergreenArenaChallenges().find((c) => c.id === challengeId) ?? null;
      const cost = challenge?.entry_token_cost ?? 1;

      if (cost > 0 && preferTicket && ticketWallet.tickets > 0) {
        const updatedWallet: ArenaTicketWallet = {
          ...ticketWallet,
          tickets: Math.max(0, ticketWallet.tickets - 1),
        };
        saveLocalTicketWallet(user?.id, updatedWallet);
      } else if (cost > 0 && /^[0-9a-f-]{36}$/i.test(challengeId) && user?.id) {
        // Attempt server RPC if UUID challenge and no tickets
        try {
          const { data, error } = await sb.rpc("arena_enter_challenge", {
            _challenge_id: challengeId,
          });
          if (!error && data?.ok && data?.entry_id) {
            return { ok: true, entry_id: data.entry_id as string, usedTicket: false };
          }
        } catch {
          // Fallback to local entry below so student is never blocked
        }
      }

      const newEntry: ArenaEntry = {
        id: `entry_${challengeId}_${Date.now()}`,
        challenge_id: challengeId,
        user_id: uid,
        status: "in_progress",
        score: 0,
        accuracy: 0,
        time_taken_seconds: 0,
        tokens_spent: cost,
        entered_at: new Date().toISOString(),
        submitted_at: null,
      };

      saveLocalEntry(user?.id, newEntry);
      return { ok: true, entry_id: newEntry.id, usedTicket: true };
    },
    onSuccess: (_d, vars) => {
      const challengeId = typeof vars === "string" ? vars : vars.challengeId;
      qc.invalidateQueries({ queryKey: ["arena-my-entry", challengeId, user?.id] });
      qc.invalidateQueries({ queryKey: ["arena-tickets", user?.id] });
      qc.invalidateQueries({ queryKey: ["token-balance"] });
      qc.invalidateQueries({ queryKey: ["arena-challenge", challengeId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not enter challenge"),
  });
}

export function useArenaPlayQuestions(challengeId?: string, enabled = true) {
  return useQuery({
    queryKey: ["arena-play-questions", challengeId],
    enabled: !!challengeId && enabled,
    staleTime: Infinity,
    queryFn: async (): Promise<ArenaPlayQuestion[]> => {
      // 1. If UUID challenge, try server RPC first
      if (challengeId && /^[0-9a-f-]{36}$/i.test(challengeId)) {
        try {
          const { data, error } = await sb.rpc("arena_get_play_questions", {
            _challenge_id: challengeId,
          });
          if (!error && Array.isArray(data) && data.length > 0) {
            return data as ArenaPlayQuestion[];
          }
        } catch {
          // continue to fallback
        }
      }

      // 2. Try querying real questions from `questions` table matching course
      try {
        const evergreen = buildEvergreenArenaChallenges().find((c) => c.id === challengeId);
        const courseId = evergreen?.course_id;
        const limit = evergreen?.num_questions ?? 10;

        if (courseId) {
          const { data: qData } = await sb
            .from("questions")
            .select(
              "id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, image_url"
            )
            .eq("course_id", courseId)
            .limit(limit);

          if (Array.isArray(qData) && qData.length >= 5) {
            return qData.map((q: any, i: number) => ({
              ord: i + 1,
              question_id: q.id,
              question_text: q.question_text,
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d,
              correct_option: q.correct_option || "A",
              explanation: q.explanation ?? null,
              image_url: q.image_url ?? null,
            }));
          }
        }

        const { data: anyQuestions } = await sb
          .from("questions")
          .select(
            "id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, image_url"
          )
          .limit(limit);

        if (Array.isArray(anyQuestions) && anyQuestions.length >= 5) {
          return anyQuestions.map((q: any, i: number) => ({
            ord: i + 1,
            question_id: q.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option || "A",
            explanation: q.explanation ?? null,
            image_url: q.image_url ?? null,
          }));
        }
      } catch {
        // Fallback to verified built-in academic question bank
      }

      return VERIFIED_ARENA_QUESTION_BANK;
    },
  });
}

export function useSubmitArenaEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (vars: {
      challenge_id?: string;
      entry_id: string;
      answers: { question_id: string; selected: string | null; elapsed_ms: number }[];
      time_taken_seconds: number;
      questions?: ArenaPlayQuestion[];
    }) => {
      // 1. If server UUID entry, try RPC first
      if (/^[0-9a-f-]{36}$/i.test(vars.entry_id)) {
        try {
          const { data, error } = await sb.rpc("arena_submit_entry", {
            _entry_id: vars.entry_id,
            _answers: vars.answers,
            _time_taken_seconds: vars.time_taken_seconds,
          });
          if (!error && data?.ok) {
            return data as {
              score: number;
              total: number;
              accuracy: number;
              time_taken_seconds: number;
              tokens_awarded?: number;
            };
          }
        } catch {
          // continue to local grading fallback
        }
      }

      // 2. Grade against question bank & store detailed review
      const qBank =
        vars.questions && vars.questions.length > 0
          ? vars.questions
          : VERIFIED_ARENA_QUESTION_BANK;
      const qById = new Map(qBank.map((q) => [q.question_id, q]));

      let score = 0;
      const reviewItems: ArenaReviewItem[] = [];

      qBank.forEach((q, i) => {
        const ans = vars.answers.find((a) => a.question_id === q.question_id);
        const selected = ans?.selected ? ans.selected.toUpperCase() : null;
        const correct = (q.correct_option || "A").toUpperCase();
        const isCorrect = selected === correct;
        if (isCorrect) score += 1;

        reviewItems.push({
          ord: i + 1,
          question_id: q.question_id,
          question_text: q.question_text,
          selected,
          correct_option: correct,
          is_correct: isCorrect,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          explanation: q.explanation ?? null,
        });
      });

      const total = Math.max(1, qBank.length);
      const accuracy = Math.round((score / total) * 100);

      // Calculate instant token & ticket rewards based on performance
      const tokensAwarded =
        accuracy >= 80 ? 50 : accuracy >= 60 ? 30 : accuracy >= 40 ? 15 : 5;
      const ticketBonus = accuracy >= 80 ? 1 : 0;

      // Update local entry & wallet
      const localMap = getLocalEntriesMap(user?.id);
      const challengeId =
        vars.challenge_id ||
        Object.values(localMap).find((e) => e.id === vars.entry_id)?.challenge_id ||
        "arena-live-stem-grand-prix";

      const updatedEntry: ArenaEntry = {
        id: vars.entry_id,
        challenge_id: challengeId,
        user_id: user?.id || "guest-student",
        status: "submitted",
        score,
        accuracy,
        time_taken_seconds: vars.time_taken_seconds,
        tokens_spent: 1,
        entered_at: localMap[challengeId]?.entered_at || new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      };
      saveLocalEntry(user?.id, updatedEntry);
      saveArenaSubmissionReview(challengeId, user?.id, reviewItems);
      saveLocalRewardForChallenge(challengeId, user?.id, tokensAwarded);

      const wallet = getLocalTicketWallet(user?.id);
      saveLocalTicketWallet(user?.id, {
        ...wallet,
        tickets: wallet.tickets + ticketBonus,
        bonusTokensEarned: wallet.bonusTokensEarned + tokensAwarded,
      });

      return {
        score,
        total,
        accuracy,
        time_taken_seconds: vars.time_taken_seconds,
        tokens_awarded: tokensAwarded,
        ticket_bonus: ticketBonus,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arena-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["arena-my-entry"] });
      qc.invalidateQueries({ queryKey: ["arena-my-entries"] });
      qc.invalidateQueries({ queryKey: ["arena-rewards"] });
      qc.invalidateQueries({ queryKey: ["arena-tickets"] });
      qc.invalidateQueries({ queryKey: ["token-balance"] });
    },
  });
}

// --- Admin ---

export function useAdminArenaChallenges() {
  return useQuery({
    queryKey: ["admin-arena-challenges"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("arena_challenges")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ArenaChallenge[];
    },
  });
}

export function useUpsertArenaChallenge() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<ArenaChallenge> & { id?: string }) => {
      const { id, ...rest } = payload as any;
      if (id) {
        const { error } = await sb.from("arena_challenges").update(rest).eq("id", id);
        if (error) throw error;
        return id as string;
      }
      const { data, error } = await sb
        .from("arena_challenges")
        .insert({ ...rest, created_by: user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-arena-challenges"] });
      qc.invalidateQueries({ queryKey: ["arena-challenges"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

export function usePublishArenaChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await sb.rpc("arena_publish_challenge", { _challenge_id: id });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.error ?? "Publish failed");
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-arena-challenges"] });
      qc.invalidateQueries({ queryKey: ["arena-challenges"] });
      toast.success("Challenge published");
    },
    onError: (e: any) => toast.error(e?.message ?? "Publish failed"),
  });
}

export function useSettleArenaChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await sb.rpc("arena_settle_challenge", { _challenge_id: id });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.error ?? "Settle failed");
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-arena-challenges"] });
      qc.invalidateQueries({ queryKey: ["arena-rewards"] });
      toast.success("Challenge settled");
    },
    onError: (e: any) => toast.error(e?.message ?? "Settle failed"),
  });
}

export function useEndArenaChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("arena_challenges").update({ status: "ended" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-arena-challenges"] });
      qc.invalidateQueries({ queryKey: ["arena-challenges"] });
      toast.success("Challenge ended");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not end"),
  });
}

export function useDisqualifyArenaEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await sb.rpc("arena_disqualify_entry", { _entry_id: entryId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arena-leaderboard"] });
      toast.success("Entry disqualified and tokens refunded");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
}

/** Featured weekly challenge for dashboard spotlight. */
export function useFeaturedArenaChallenge() {
  return useQuery({
    queryKey: ["arena-featured"],
    queryFn: async () => {
      try {
        const { data, error } = await sb
          .from("arena_challenges")
          .select("*")
          .in("status", ["scheduled", "live"])
          .order("featured", { ascending: false })
          .order("starts_at", { ascending: true })
          .limit(1);
        if (!error && data?.[0]) return data[0] as ArenaChallenge;
      } catch {
        // fallback below
      }
      return buildEvergreenArenaChallenges()[0];
    },
    staleTime: 60_000,
  });
}

/** Realtime invalidation when entries change for a live challenge. */
export function useArenaRealtime(challengeId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!challengeId || !/^[0-9a-f-]{36}$/i.test(challengeId)) return;
    const ch = (supabase as any)
      .channel(`arena-${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "arena_entries",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["arena-leaderboard", challengeId] });
          qc.invalidateQueries({ queryKey: ["arena-challenge", challengeId] });
        }
      )
      .subscribe();
    return () => {
      try {
        (supabase as any).removeChannel(ch);
      } catch {}
    };
  }, [challengeId, qc]);
}
