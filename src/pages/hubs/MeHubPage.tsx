import {
  User, Wallet, Bell, Shield, Smartphone, CreditCard,
  Gift, FolderOpen, LogOut, Settings, BookMarked, FileText,
} from "lucide-react";
import HubPage from "@/components/hub/HubPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { TokenBalanceCard } from "@/components/student/dashboard/TokenBalanceCard";

const MeHubPage = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut?.();
    navigate("/auth", { replace: true });
  };

  return (
    <>
      <div className="container mx-auto max-w-3xl px-4 pt-5">
        <TokenBalanceCard />
      </div>
      <HubPage
        eyebrow="Me"
        title="Your account"
        intro="Profile, wallet, notifications, and settings — all in one place."
        sections={[
          {
            title: "Account",
            tiles: [
              { to: "/profile/edit", label: "Edit Profile", description: "Name, photo, university", icon: User, accent: true },
              { to: "/wallet", label: "Wallet", description: "Tokens & top-ups", icon: Wallet, accent: true },
            ],
          },
          {
            title: "Activity",
            tiles: [
              { to: "/notifications", label: "Notifications", description: "Your inbox", icon: Bell },
              { to: "/library", label: "My Library", description: "Saved resources", icon: FolderOpen },
              { to: "/my-report-card", label: "Report Card", description: "Verified results", icon: FileText },
              { to: "/referrals", label: "Refer & Earn", description: "Invite friends", icon: Gift },
            ],
          },
          {
            title: "Settings",
            tiles: [
              { to: "/settings/notifications", label: "Notification Prefs", description: "Manage alerts", icon: Bell },
              { to: "/settings/privacy", label: "Privacy", description: "Who can see what", icon: Shield },
              { to: "/settings/devices", label: "Devices", description: "Active sessions", icon: Smartphone },
              { to: "/subscription", label: "Subscription", description: "Plan & billing", icon: CreditCard },
            ],
          },
          {
            title: "Help & legal",
            tiles: [
              { to: "/profile/preparation", label: "Study Preferences", description: "Goals & schedule", icon: Settings },
              { to: "/install", label: "Install App", description: "Add to home screen", icon: BookMarked },
            ],
          },
        ]}
      />
      <div className="container mx-auto max-w-3xl px-4 pb-24 -mt-4">
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </>
  );
};

export default MeHubPage;
