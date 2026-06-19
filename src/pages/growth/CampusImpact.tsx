import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { useCampusImpact, useDepartmentRankings } from "@/hooks/useGrowth";
import { useState } from "react";

export default function CampusImpact() {
  const { data: list = [] } = useCampusImpact();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: depts = [] } = useDepartmentRankings(selected ?? undefined);

  return (
    <>
      <SEO title="Campus Impact Score" description="Live ranking of universities on OverraPrep." url="https://overraprep.com/growth/impact" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <PremiumPageHero eyebrow="CAMPUS IMPACT SCORE" title="Which campus is winning?" subtitle="Active students, challenge participation, success scores and community activity." icon={BarChart3} back />

          <Card className="divide-y mt-6">
            {list.map((u, i) => (
              <button key={u.university} onClick={() => setSelected(selected === u.university ? null : u.university)} className="w-full text-left p-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <div>
                      <p className="font-semibold text-sm">{u.university}</p>
                      <p className="text-[11px] text-muted-foreground">{u.active_students} students · {u.challenge_participation} arena entries</p>
                    </div>
                  </div>
                  <p className="font-display font-bold text-amber-700 text-lg">{Math.round(u.impact_score)}</p>
                </div>
                {selected === u.university && (
                  <div className="mt-3 pl-11 space-y-1.5">
                    {depts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No department data yet.</p>
                    ) : depts.map((d) => (
                      <div key={d.department} className="flex justify-between text-xs">
                        <span>{d.department}</span>
                        <span className="font-semibold text-amber-700">{Math.round(d.score)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
            {list.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Rankings will appear as students get active.</div>}
          </Card>
        </main>
      </div>
    </>
  );
}
