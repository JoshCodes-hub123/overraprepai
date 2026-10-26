import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  ListOrdered,
  FileText,
  FileSpreadsheet,
  Layers,
  GraduationCap,
  Sparkles,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import {
  InstitutionalCascadeSelector,
  CascadeSelection,
} from "@/components/admin/content/InstitutionalCascadeSelector";
import { CourseOutlineModule } from "@/components/admin/content/CourseOutlineModule";
import { LectureNotesModule } from "@/components/admin/content/LectureNotesModule";
import { CbtIngestionModule } from "@/components/admin/content/CbtIngestionModule";
import { UNIVERSITIES, UniversityCode } from "@/config/universities";
import { AdminPersistentHeader } from "@/components/admin/AdminPersistentHeader";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";

const STORAGE_KEY = "overra_content_admin_cascade";

const DEFAULT_CASCADE: CascadeSelection = {
  university: "FUTA",
  universityName: UNIVERSITIES.FUTA.name,
  faculty: "School of Computing",
  department: "Computer Science",
  level: "200",
  semester: "1st Semester",
  courseId: "",
  courseCode: "",
  courseName: "",
};

export const AdminContentManagement: React.FC = () => {
  const { user, profile, roles, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<"syllabi" | "notes" | "cbt">(() => {
    if (location.pathname.includes("/admin/content/notes")) return "notes";
    if (location.pathname.includes("/admin/content/cbt")) return "cbt";
    return "syllabi";
  });

  // Sync activeTab when URL changes
  useEffect(() => {
    if (location.pathname.includes("/admin/content/notes")) {
      setActiveTab("notes");
    } else if (location.pathname.includes("/admin/content/cbt")) {
      setActiveTab("cbt");
    } else {
      setActiveTab("syllabi");
    }
  }, [location.pathname]);

  // Load cascade selection from sessionStorage or default
  const [cascade, setCascade] = useState<CascadeSelection>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return DEFAULT_CASCADE;
  });

  // Save cascade changes to sessionStorage
  const handleCascadeChange = (updated: CascadeSelection) => {
    setCascade(updated);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  // Handle tab switch and update URL
  const handleTabChange = (val: string) => {
    const tabKey = val as "syllabi" | "notes" | "cbt";
    setActiveTab(tabKey);
    navigate(`/admin/content/${tabKey}`);
  };

  // Determine operator role label
  const isSuperAdmin = hasRole("admin") || roles.includes("admin");
  const roleLabel = isSuperAdmin ? "Administrator" : "Content Creator";

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <>
      <SEO title="Content & Course Management Admin Portal · OverraPrep AI" noindex />

      <AdminCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onSelectTab={(tab) => navigate(`/admin?tab=${tab}`)}
      />

      <div className="min-h-screen bg-slate-50/70 dark:bg-neutral-950 pb-20">
        {/* 1. Header Navigation & Operator Banner */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-neutral-800 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Back button & Title */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="h-8 px-2.5 text-xs text-slate-600 dark:text-neutral-300 hover:text-amber-600"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Admin Dashboard
              </Button>

              <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 hidden sm:block" />

              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500 text-white font-bold text-xs shadow-xs">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 leading-none">
                    Academic Content Portal
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-mono text-[10px] h-5 shadow-2xs">
                      Ingestion Engine
                    </Badge>
                  </h1>
                </div>
              </div>
            </div>

            {/* Center: Command Palette Trigger */}
            <div className="hidden lg:block max-w-xs w-full">
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground transition-all shadow-2xs group"
              >
                <span className="truncate">Search commands &amp; courses…</span>
                <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right: Operator Credentials & Active Session State */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden h-8 w-8 rounded-lg"
                onClick={() => setCommandPaletteOpen(true)}
                title="Search (Cmd+K)"
              >
                <Sparkles className="h-4 w-4 text-amber-600" />
              </Button>

              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-neutral-200 truncate max-w-[200px]">
                  {profile?.full_name || user?.email || "Content Operator"}
                </p>
                <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Session Active</span>
                </div>
              </div>

              <Badge
                variant="outline"
                className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-xs py-1 px-2.5 flex items-center gap-1.5 font-medium shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                {roleLabel}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/courses")}
                className="h-8 text-xs text-slate-700 dark:text-neutral-300 shadow-2xs"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-500" /> Live Catalog
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          <AdminPersistentHeader showNavStrip={true} />

          {/* 2. Institutional Selection & Metadata Cascade */}
          <InstitutionalCascadeSelector
            selection={cascade}
            onSelectionChange={handleCascadeChange}
          />

          {/* 3. Three Core Management Modules (Tabs) */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <div className="border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl p-1.5 shadow-2xs">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-transparent p-0 gap-1.5">
                {/* Tab 1: Syllabi */}
                <TabsTrigger
                  value="syllabi"
                  className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-900 dark:data-[state=active]:text-amber-200 data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-amber-600 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[44px]"
                >
                  <ListOrdered className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Tab 1:</span> Course Outline &amp; Syllabus
                </TabsTrigger>

                {/* Tab 2: Lecture Notes */}
                <TabsTrigger
                  value="notes"
                  className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-900 dark:data-[state=active]:text-amber-200 data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-amber-600 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[44px]"
                >
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Tab 2:</span> Lecture Notes &amp; Materials
                </TabsTrigger>

                {/* Tab 3: CBT Questions */}
                <TabsTrigger
                  value="cbt"
                  className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-900 dark:data-[state=active]:text-amber-200 data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-amber-600 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[44px]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Tab 3:</span> CBT Past Questions Ingestion
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1 Content: Course Outline & Syllabus Structure */}
            <TabsContent value="syllabi" className="mt-0 focus-visible:outline-none">
              <CourseOutlineModule cascade={cascade} />
            </TabsContent>

            {/* Tab 2 Content: Lecture Notes & Materials Upload */}
            <TabsContent value="notes" className="mt-0 focus-visible:outline-none">
              <LectureNotesModule cascade={cascade} />
            </TabsContent>

            {/* Tab 3 Content: CBT Past Questions Batch Ingestion */}
            <TabsContent value="cbt" className="mt-0 focus-visible:outline-none">
              <CbtIngestionModule cascade={cascade} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
};

export default AdminContentManagement;
