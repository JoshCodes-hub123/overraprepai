import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_ENVIRONMENTS,
  AdminEnvironmentOption,
  InstitutionCode,
} from "@/config/environments";

const KEY = "overra_admin_environment";
const EVENT_NAME = "overra:admin_env_changed";

/**
 * Which university campus the admin is currently managing.
 * Persisted and reactively synced across all admin screens and subcomponents.
 */
export function useAdminEnvironment() {
  const [id, setId] = useState<string>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = localStorage.getItem(KEY);
        if (saved && ADMIN_ENVIRONMENTS.some((e) => e.id === saved)) return saved;
      }
    } catch {
      /* noop */
    }
    return ADMIN_ENVIRONMENTS[0].id;
  });

  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail && custom.detail !== id) {
        setId(custom.detail);
      }
    };
    window.addEventListener(EVENT_NAME, handleSync);
    return () => window.removeEventListener(EVENT_NAME, handleSync);
  }, [id]);

  const current: AdminEnvironmentOption =
    ADMIN_ENVIRONMENTS.find((e) => e.id === id) ?? ADMIN_ENVIRONMENTS[0];

  const select = useCallback((next: string) => {
    setId(next);
    try {
      localStorage.setItem(KEY, next);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
    } catch {
      /* noop */
    }
  }, []);

  return {
    current,
    options: ADMIN_ENVIRONMENTS,
    select,
    isJamb: false,
    isUniversity: true,
    institution: current.institution as InstitutionCode | null,
    /** Filter to apply to any university-scoped query. */
    scope: { environment_type: "university" as const, university: current.institution },
    /** Concise title e.g. "Managing FUTA" */
    managingTitle: `Managing ${current.label}`,
  };
}

export default useAdminEnvironment;
