import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Loader2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: string;
  features: any;
}

interface Props {
  plan: Plan;
  active?: boolean;
  onChoose?: () => void;
  loading?: boolean;
}

export const PlanCard = ({ plan, active, onChoose, loading }: Props) => {
  const features = Array.isArray(plan.features) ? plan.features : [];
  const price = plan.price_cents === 0 ? "Free" : `$${(plan.price_cents / 100).toFixed(2)}`;
  const isFree = plan.id === "free";
  const highlight = plan.id === "monthly";

  return (
    <Card
      className={`relative p-5 transition-all ${
        active
          ? "border-amber-400 ring-2 ring-amber-100 bg-amber-50/40"
          : highlight
          ? "border-amber-200 shadow-md"
          : "border-border"
      }`}
    >
      {highlight && !active && (
        <span className="absolute -top-2 right-4 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2 py-0.5 rounded-full shadow">
          Most Popular
        </span>
      )}
      {active && (
        <span className="absolute -top-2 right-4 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow inline-flex items-center gap-1">
          <Crown className="w-3 h-3" /> Current
        </span>
      )}
      <h3 className="font-display text-lg font-bold">{plan.name}</h3>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold">{price}</span>
        {!isFree && <span className="text-xs text-muted-foreground">/ {plan.interval}</span>}
      </div>
      <ul className="mt-4 space-y-1.5">
        {features.map((f: string) => (
          <li key={f} className="flex items-start gap-1.5 text-sm">
            <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {!isFree && onChoose && (
        <Button
          className={`w-full mt-5 ${
            highlight
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
              : ""
          }`}
          variant={highlight ? "default" : "outline"}
          onClick={onChoose}
          disabled={active}
        >
          {active ? "Active" : "Choose plan"}
        </Button>
      )}
    </Card>
  );
};

export default PlanCard;
