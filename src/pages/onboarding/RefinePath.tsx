import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * Forwards directly to University Onboarding.
 */
export default function RefinePath() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/onboarding/university", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}
