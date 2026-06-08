import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SessionSlot = {
  id: string; tutor_id: string; curriculum_id: string | null;
  title: string; description: string | null;
  starts_at: string; duration_min: number; capacity: number;
  meeting_url: string | null; status: string;
  price_tokens: number; payout_share_bps: number;
  tutor?: { full_name: string | null; avatar_url: string | null; tutor_code: string | null };
  booked_count?: number;
  i_booked?: boolean;
};

export type SessionBooking = {
  id: string; slot_id: string; student_id: string; thread_id: string | null;
  status: string; payment_status: string;
  tokens_paid: number; tokens_to_tutor: number;
  completed_at: string | null; released_at: string | null;
  created_at: string;
  slot?: SessionSlot;
  student?: { full_name: string | null; avatar_url: string | null };
};

export function useUpcomingSessions() {
  return useQuery({
    queryKey: ["session-slots", "upcoming"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_session_slots")
        .select("id, tutor_id, curriculum_id, title, description, starts_at, duration_min, capacity, status, price_tokens, payout_share_bps")
        .eq("status", "open")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      const slots = (data ?? []) as SessionSlot[];
      const tutorIds = Array.from(new Set(slots.map(s => s.tutor_id)));
      if (tutorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, tutor_code")
          .in("id", tutorIds);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
        slots.forEach(s => { s.tutor = map.get(s.tutor_id) as any; });
      }
      const ids = slots.map(s => s.id);
      if (ids.length) {
        const { data: bookings } = await supabase
          .from("session_bookings")
          .select("slot_id, student_id")
          .in("slot_id", ids)
          .eq("status", "confirmed");
        const counts = new Map<string, number>();
        const me = (await supabase.auth.getUser()).data.user?.id;
        const mine = new Set<string>();
        (bookings ?? []).forEach((b: any) => {
          counts.set(b.slot_id, (counts.get(b.slot_id) ?? 0) + 1);
          if (b.student_id === me) mine.add(b.slot_id);
        });
        slots.forEach(s => {
          s.booked_count = counts.get(s.id) ?? 0;
          s.i_booked = mine.has(s.id);
        });
      }
      return slots;
    },
  });
}

export function useTutorSlots() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["session-slots", "mine", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutor_session_slots")
        .select("id, tutor_id, curriculum_id, title, description, starts_at, duration_min, capacity, status, price_tokens, payout_share_bps")
        .eq("tutor_id", user!.id)
        .order("starts_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SessionSlot[];
    },
  });
}

export function useTutorBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["session-bookings", "tutor", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      // first get tutor's slots
      const { data: slots } = await supabase
        .from("tutor_session_slots")
        .select("id, title, starts_at, price_tokens")
        .eq("tutor_id", user!.id);
      const ids = (slots ?? []).map((s: any) => s.id);
      if (ids.length === 0) return [] as SessionBooking[];
      const { data, error } = await supabase
        .from("session_bookings")
        .select("*, slot:tutor_session_slots(*)")
        .in("slot_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const bookings = (data ?? []) as SessionBooking[];
      const studentIds = Array.from(new Set(bookings.map(b => b.student_id)));
      if (studentIds.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id, full_name, avatar_url").in("id", studentIds);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
        bookings.forEach(b => { b.student = map.get(b.student_id) as any; });
      }
      return bookings;
    },
  });
}

export function useMyBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["session-bookings", "mine", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_bookings")
        .select("*, slot:tutor_session_slots(*)")
        .eq("student_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SessionBooking[];
    },
  });
}

export function useBookSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) => {
      const { data, error } = await supabase.rpc("book_session", { _slot_id: slotId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-slots"] });
      qc.invalidateQueries({ queryKey: ["session-bookings"] });
      qc.invalidateQueries({ queryKey: ["token-wallet"] });
    },
  });
}

export function useCompleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await (supabase as any).rpc("complete_session", { _booking_id: bookingId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-bookings"] });
      qc.invalidateQueries({ queryKey: ["token-wallet"] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await (supabase as any).rpc("cancel_session_booking", { _booking_id: bookingId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-bookings"] });
      qc.invalidateQueries({ queryKey: ["session-slots"] });
      qc.invalidateQueries({ queryKey: ["token-wallet"] });
    },
  });
}

export function useCreateSlot() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SessionSlot> & { title: string; starts_at: string }) => {
      if (!user?.id) throw new Error("not signed in");
      const { error } = await supabase.from("tutor_session_slots").insert({
        tutor_id: user.id,
        title: input.title,
        description: input.description ?? null,
        starts_at: input.starts_at,
        duration_min: input.duration_min ?? 60,
        capacity: input.capacity ?? 1,
        meeting_url: input.meeting_url ?? null,
        curriculum_id: input.curriculum_id ?? null,
        price_tokens: input.price_tokens ?? 0,
        payout_share_bps: input.payout_share_bps ?? 7000,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session-slots"] }),
  });
}
