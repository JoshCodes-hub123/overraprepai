import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";

/**
 * Applies the signed-in student's academic environment to the document root as
 * `data-env`, which resolves the `--env-*` design tokens.
 *
 * This is the entire mechanism that makes University Mode and JAMB Mode feel
 * like two separate academic worlds — no component forking, no duplicate
 * screens. On sign-out the attribute is removed so the next account never
 * inherits the previous student's environment.
 */
export function EnvironmentThemeApplier() {
  const { user } = useAuth();
  const { environment, isConfigured } = useEnvironment();

  useEffect(() => {
    const root = document.documentElement;
    if (!user || !isConfigured) {
      root.removeAttribute("data-env");
      return;
    }
    root.setAttribute("data-env", environment);
  }, [user, environment, isConfigured]);

  return null;
}

export default EnvironmentThemeApplier;
