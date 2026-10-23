import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSecurityEvent } from "@/lib/securityAudit";
import { useSingleSession } from "@/hooks/useSingleSession";
import { track } from "@/lib/analytics";
import { purgeUserSessionData } from "@/lib/sessionPurge";

type AppRole =
  | "student"
  | "tutor"
  | "admin"
  | "school_owner"
  | "school_admin"
  | "teacher"
  | "parent"
  | "content_creator";
export type AcademicPath = "secondary" | "jamb" | "university";

export interface AcademicMetadata {
  level?: string;
  subjects?: string[];
  target_course?: string;
  school?: string;
  department?: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  academic_path: AcademicPath | null;
  academic_metadata: AcademicMetadata;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Single-active-session enforcement (graceful sign-out if a newer login replaces this device)
  useSingleSession(user?.id);

  // Heartbeat last_seen_at for the daily reminder targeting (every 5 min)
  useEffect(() => {
    if (!user?.id) return;
    const ping = () => {
      supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id).then(() => {});
    };
    ping();
    const t = window.setInterval(ping, 5 * 60 * 1000);
    const onFocus = () => ping();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [user?.id]);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Use SECURITY DEFINER RPC so the owner can read their own full row
      // (including sensitive columns like email/phone) without granting those
      // columns to the authenticated role at large.
      const { data: profileData } = await (supabase as any).rpc("get_my_profile");

      if (profileData) {
        setProfile({
          ...(profileData as any),
          academic_metadata: (profileData as any).academic_metadata || {},
        } as Profile);
      }

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const fetchedRoles = (rolesData || []).map((r) => r.role as AppRole);
      // Some older accounts can exist without a row in user_roles. Treat them
      // as students only, so student pages open without weakening tutor/admin gates.
      setRoles(fetchedRoles.length > 0 ? fetchedRoles : ["student"]);
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Fail safe for older/flaky accounts: keep users moving as students only.
      // Tutor/admin access still requires a successful role fetch via RoleRoute.
      setRoles(["student"]);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchUserData(user.id);
  }, [user?.id, fetchUserData]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const prevId = sessionStorage.getItem("overra_last_user_id");
          if (prevId && prevId !== session.user.id) {
            purgeUserSessionData(prevId);
          }
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          const lastUserId = sessionStorage.getItem("overra_last_user_id");
          purgeUserSessionData(lastUserId);
          setProfile(null);
          setRoles([]);
          // Detect involuntary sign-outs (e.g. refresh-token expired) and
          // route the user back to /auth with a clear reason.
          if (event === "SIGNED_OUT") {
            try {
              const wasSignedIn = sessionStorage.getItem("overra_was_signed_in") === "1";
              const manual = sessionStorage.getItem("overra_manual_signout") === "1";
              sessionStorage.removeItem("overra_manual_signout");
              sessionStorage.removeItem("overra_was_signed_in");
              sessionStorage.removeItem("overra_last_user_id");
              if (wasSignedIn && !manual && typeof window !== "undefined") {
                const path = window.location.pathname;
                if (!path.startsWith("/auth")) {
                  // Best-effort audit log (fires before redirect; failure is swallowed)
                  void logSecurityEvent(lastUserId, "session_expired", {
                    from_path: path,
                    event,
                  });
                  window.location.replace("/auth?reason=expired");
                }
              }
            } catch { /* noop */ }
          }
        }
        if (session?.user) {
          try {
            sessionStorage.setItem("overra_was_signed_in", "1");
            sessionStorage.setItem("overra_last_user_id", session.user.id);
          } catch { /* noop */ }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, referred_by: referralCode || null },
      },
    });
    if (!error) {
      void track("signup", { has_referral: !!referralCode });
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      // (LoginCelebration removed — no fresh-login flag.)
      void track("signin", {});
    }
    return { error };
  };

  const signOut = async () => {
    try { sessionStorage.setItem("overra_manual_signout", "1"); } catch { /* noop */ }
    const prevId = user?.id;
    await supabase.auth.signOut();
    purgeUserSessionData(prevId);
    setProfile(null);
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const primaryRole: AppRole | null = roles.includes("admin")
    ? "admin"
    : roles.includes("school_owner")
    ? "school_owner"
    : roles.includes("school_admin")
    ? "school_admin"
    : roles.includes("teacher")
    ? "teacher"
    : roles.includes("parent")
    ? "parent"
    : roles.includes("tutor")
    ? "tutor"
    : roles.includes("student")
    ? "student"
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        primaryRole,
        isLoading,
        signUp,
        signIn,
        signOut,
        hasRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
