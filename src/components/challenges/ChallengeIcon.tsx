import { Flame, Trophy, Zap, Headphones, Clock, Target, Award, type LucideIcon } from "lucide-react";

const map: Record<string, LucideIcon> = {
  flame: Flame,
  trophy: Trophy,
  zap: Zap,
  headphones: Headphones,
  clock: Clock,
  target: Target,
  award: Award,
};

export function ChallengeIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = map[name || "target"] || Target;
  return <Icon className={className} strokeWidth={2} />;
}