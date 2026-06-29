import { useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Sparkles, Users, ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ArenaSpotlightCard from "@/components/arena/ArenaSpotlightCard";
import { OpportunitySnapshot } from "./OpportunitySnapshot";
import { CommunityMomentCard } from "./CommunityMomentCard";

interface Props { refreshKey?: number }

/**
 * ExploreTabs — collapses Arena, Opportunities and Community into one
 * tabbed card so the dashboard side-rail isn't three stacked sections.
 */
export default function ExploreTabs({ refreshKey = 0 }: Props) {
  const [tab, setTab] = useState("compete");

  const tabs = [
    { id: "compete",   label: "Compete",   icon: Trophy,   to: "/arena" },
    { id: "grow",      label: "Grow",      icon: Sparkles, to: "/opportunities" },
    { id: "community", label: "Community", icon: Users,    to: "/community" },
  ];
  const active = tabs.find((t) => t.id === tab)!;

  return (
    <section
      aria-label="Explore"
      className="rounded-3xl border border-amber-100 bg-white/90 backdrop-blur p-3 sm:p-4 shadow-[0_8px_28px_-18px_rgba(217,119,6,0.25)]"
    >
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex items-center justify-between gap-2 mb-3">
          <TabsList className="bg-amber-50/80 border border-amber-100 rounded-full p-1 h-auto">
            {tabs.map(({ id, label, icon: I }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="rounded-full px-3 py-1.5 text-[11.5px] font-semibold data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm flex items-center gap-1.5"
              >
                <I className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Link
            to={active.to}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"
          >
            Open <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <TabsContent value="compete" className="mt-0">
          <ArenaSpotlightCard key={`arena-${refreshKey}`} />
        </TabsContent>
        <TabsContent value="grow" className="mt-0">
          <OpportunitySnapshot key={`os-${refreshKey}`} />
        </TabsContent>
        <TabsContent value="community" className="mt-0">
          <CommunityMomentCard key={`cm-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
