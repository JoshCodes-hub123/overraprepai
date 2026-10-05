import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";

export interface SearchHit {
  kind: "course" | "topic" | "material" | "tutor";
  id: string;
  title: string;
  subtitle: string;
  course_id: string | null;
}

export function useCourseSearch(query: string) {
  const q = query.trim();
  const { user } = useAuth();
  const { environment, isUniversity, institution } = useEnvironment();
  return useQuery({
    queryKey: ["course-search", user?.id, environment, institution, q],
    enabled: !!user && isUniversity && !!institution && q.length >= 2,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("search_courses_scoped", { _q: q });
      if (error) throw error;
      return (data ?? []) as SearchHit[];
    },
    staleTime: 30_000,
  });
}