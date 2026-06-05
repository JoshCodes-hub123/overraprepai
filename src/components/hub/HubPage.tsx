import { Link } from "react-router-dom";
import { ChevronRight, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";

export interface HubTile {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  accent?: boolean;
}

export interface HubSection {
  title: string;
  subtitle?: string;
  tiles: HubTile[];
}

interface HubPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: HubSection[];
  seoTitle?: string;
  seoDescription?: string;
}

export const HubPage = ({ eyebrow, title, intro, sections, seoTitle, seoDescription }: HubPageProps) => {
  return (
    <>
      <SEO title={seoTitle ?? title} description={seoDescription ?? intro} noindex url={`https://overraprep.com`} />
      <div className="min-h-screen bg-background pb-24 md:pb-12">
        <main className="container mx-auto px-4 pt-6 sm:pt-9 max-w-3xl">
          <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-7"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-amber-700/90 mb-2">
              {eyebrow}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed max-w-xl">
              {intro}
            </p>
          </motion.header>

          <div className="space-y-7">
            {sections.map((section, sIdx) => (
              <motion.section
                key={section.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 + sIdx * 0.05 }}
              >
                <div className="mb-3 px-1">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wider text-foreground/80">
                    {section.title}
                  </h2>
                  {section.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {section.tiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                      <Link
                        key={tile.to + tile.label}
                        to={tile.to}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-all",
                          "hover:border-amber-300/70 hover:shadow-[0_8px_24px_-12px_rgba(180,140,40,0.28)] hover:-translate-y-0.5",
                          tile.accent
                            ? "border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white"
                            : "border-border/70"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            tile.accent
                              ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-foreground/80 group-hover:bg-amber-50 group-hover:text-amber-700"
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[14px] font-semibold text-foreground truncate">
                              {tile.label}
                            </p>
                            {tile.badge && (
                              <span className="text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5">
                                {tile.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-muted-foreground leading-snug truncate">
                            {tile.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-amber-700 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </div>
        </main>
      </div>
    </>
  );
};

export default HubPage;
