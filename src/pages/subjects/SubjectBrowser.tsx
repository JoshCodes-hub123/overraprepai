import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * OverraPrep is focused 100% on university degree courses.
 * Automatically forwards legacy subject requests to the course directory.
 */
export default function SubjectBrowser() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/courses", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}
