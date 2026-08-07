import { useNavigate, useLocation } from "react-router-dom";
import { Shield, GraduationCap, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logSecurityEvent } from "@/lib/securityAudit";

const HIDDEN_PREFIXES = ["/auth", "/forgot-password", "/reset-password", "/onboarding"];

/**
 * Floating badge showing the currently signed-in role + a quick "Switch" link
 * that signs the user out and returns them to /auth so they can log in
 * as a different role.
 */
export const RoleBadge = () => {
  const { user, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || !primaryRole) return null;
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;
  // Students never get a floating environment/account switcher on their home
  // screen — switching lives in Profile → Academic Settings.
  if (primaryRole !== "admin" && primaryRole !== "tutor") return null;


  const isAdmin = primaryRole === "admin";
  const isTutor = primaryRole === "tutor";

  const Icon = isAdmin ? Shield : isTutor ? GraduationCap : UserIcon;
  const label = isAdmin ? "Admin" : isTutor ? "Tutor" : primaryRole.replace("_", " ");

  const handleSwitch = async () => {
    await logSecurityEvent(user.id, "role_switch", {
      from_role: primaryRole,
      reason: "user_initiated",
    });
    await signOut();
    navigate("/auth?reason=switch", { replace: true });
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 right-3 z-40 pointer-events-auto">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/95 backdrop-blur border border-border shadow-md">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold capitalize text-foreground">{label}</span>
        <button
          onClick={handleSwitch}
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1 pl-2 border-l border-border"
          aria-label="Switch account"
        >
          <LogOut className="w-3 h-3" />
          Switch
        </button>
      </div>
    </div>
  );
};

export default RoleBadge;