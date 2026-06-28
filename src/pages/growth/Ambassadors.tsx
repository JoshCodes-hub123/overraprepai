import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card } from "@/components/ui/card";
import { Crown, Star } from "lucide-react";
import bgsFutaAvatar from "@/assets/bgs-futa-ambassador.jpg.asset.json";

export default function Ambassadors() {
  return (
    <>
      <SEO title="Campus Ambassadors" description="Top student leaders on OverraPrep." url="https://overraprep.com/growth/ambassadors" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <PremiumPageHero eyebrow="CAMPUS AMBASSADORS" title="Student leaders" subtitle="The students moving OverraPrep across every campus." icon={Crown} back />

          <Card className="mt-6 overflow-hidden border-amber-300/60 bg-gradient-to-br from-amber-50 via-white to-white">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-5">
              <img
                src={bgsFutaAvatar.url}
                alt="BGS FUTA — Lead Ambassador"
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover border-2 border-amber-300 shadow-md"
              />
              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  <Star className="h-3 w-3 fill-white" /> Lead Ambassador
                </div>
                <h2 className="mt-2 font-display text-xl font-bold text-zinc-900">BGS FUTA</h2>
                <p className="text-sm text-zinc-700">Federal University of Technology, Akure</p>
                <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                  Driving OverraPrep adoption across FUTA — championing study groups, peer mentoring, and exam-readiness culture campus-wide.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 text-center text-sm text-muted-foreground mt-6">
            More ambassadors coming soon. Want to represent your campus?{" "}
            <a href="/growth" className="text-amber-700 font-semibold hover:underline">Apply here</a>.
          </Card>
        </main>
      </div>
    </>
  );
}
