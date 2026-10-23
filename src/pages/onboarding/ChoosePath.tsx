import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * Single-track routing: OverraPrep is focused 100% on University degree students.
 * Automatically forwards to University onboarding.
 */
export default function ChoosePath() {
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
