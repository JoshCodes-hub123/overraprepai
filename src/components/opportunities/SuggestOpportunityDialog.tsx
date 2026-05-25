import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Lightbulb } from "lucide-react";

interface Props {
  trigger?: ReactNode;
}

/**
 * Entry point that routes users into the rich Post Composer pre-set to Opportunity.
 * Admins & tutors publish immediately; students submit for admin review.
 */
export function SuggestOpportunityDialog({ trigger }: Props) {
  const { hasRole } = useAuth();
  const canPublishDirectly = hasRole("admin") || hasRole("tutor");

  if (trigger) {
    return <Link to="/posts/new?type=opportunity">{trigger}</Link>;
  }
  return (
    <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
      <Link to="/posts/new?type=opportunity">
        <Lightbulb className="h-4 w-4 mr-1.5" />
        {canPublishDirectly ? "Post opportunity" : "Suggest opportunity"}
      </Link>
    </Button>
  );
}

export default SuggestOpportunityDialog;