import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_ENVIRONMENTS,
  AdminEnvironmentOption,
} from "@/config/environments";

const KEY = "overra_admin_environment";

/**
 * Which academic environment the admin is currently managing.
 * Persisted so the admin never loses track between page loads.
 */
export function useAdminEnvironment() {
  const [id, setId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && ADMIN_ENVIRONMENTS.some((e) => e.id === saved)) return saved;
    } catch { /* noop */ }
    return ADMIN_ENVIRONMENTS[0].id;
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, id); } catch { /* noop */ }
  }, [id]);

  const current: AdminEnvironmentOption =
    ADMIN_ENVIRONMENTS.find((e) => e.id === id) ?? ADMIN_ENVIRONMENTS[0];

  const select = useCallback((next: string) => setId(next), []);

  return {
    current,
    options: ADMIN_ENVIRONMENTS,
    select,
    isJamb: current.env === "jamb",
    /** Filter to apply to any environment-scoped query. */
    scope: { environment_type: current.env, university: current.institution },
  };
}

export default useAdminEnvironment;
