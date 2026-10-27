import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  BookOpen,
  Target,
  Sparkles,
  ArrowRight,
  X,
  Loader2,
  Clock,
  Flame,
  ChevronRight,
  FileText,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import { OverraLoader } from "@/components/ui/OverraLoader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { cn } from "@/lib/utils";

interface SearchCourseResult {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
  university?: string | null;
}

const EMPTY_COURSES: SearchCourseResult[] = [];

interface DashboardSearchProps {
  onOpen?: () => void;
  className?: string;
  placeholder?: string;
}

export function DashboardSearch({
  onOpen,
  className = "",
  placeholder = "Search courses, topics, past questions (e.g. CSC 201, MTH 201)...",
}: DashboardSearchProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: rawEnrolled } = useCourseSnapshots();
  const enrolledCourses = useMemo(() => rawEnrolled ?? EMPTY_COURSES, [rawEnrolled]);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [courses, setCourses] = useState<SearchCourseResult[]>(EMPTY_COURSES);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  // Close results panel on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut listener: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
        onOpenRef.current?.();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Instant local filtering of enrolled courses
  const localMatches = useMemo(() => {
    const trimmed = query.toLowerCase().trim();
    if (trimmed.length < 2) return EMPTY_COURSES;
    return enrolledCourses
      .filter(
        (c) =>
          c.code.toLowerCase().includes(trimmed) ||
          c.name.toLowerCase().includes(trimmed) ||
          (c.department && c.department.toLowerCase().includes(trimmed))
      )
      .slice(0, 4);
  }, [query, enrolledCourses]);

  const localMatchesRef = useRef(localMatches);
  useEffect(() => {
    localMatchesRef.current = localMatches;
  }, [localMatches]);

  const userUni = (profile as any)?.university || "FUTA";

  // Debounced remote catalog search
  useEffect(() => {
    const cleanQ = query.trim();
    if (cleanQ.length < 2) {
      setCourses((prev) => (prev.length === 0 ? prev : EMPTY_COURSES));
      setIsSearching((prev) => (prev ? false : prev));
      return;
    }

    let active = true;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        let q = supabase
          .from("courses")
          .select("id, code, name, department, level, university")
          .eq("is_active", true)
          .or(`code.ilike.%${cleanQ}%,name.ilike.%${cleanQ}%,department.ilike.%${cleanQ}%`)
          .limit(8);

        if (userUni) {
          q = q.eq("university", userUni);
        }

        const { data, error } = await q;
        if (error) throw error;

        if (active) {
          // Merge unique courses, prioritizing enrolled ones first
          const fetched = (data as SearchCourseResult[]) || [];
          const seen = new Set<string>();
          const combined: SearchCourseResult[] = [];

          for (const item of localMatchesRef.current) {
            seen.add(item.id);
            combined.push(item);
          }
          for (const item of fetched) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              combined.push(item);
            }
          }

          setCourses(combined);
        }
      } catch (err) {
        console.warn("Course search query error:", err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, userUni]);

  const handleSelectCourse = (courseId: string) => {
    setIsOpen(false);
    navigate(`/courses/${courseId}`);
  };

  const handlePracticeCourse = (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setIsOpen(false);
    navigate(`/practice?course=${courseId}`);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Search Input Bar */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 sm:py-3 transition-all duration-200",
          isOpen
            ? "border-amber-500 bg-background shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/20"
            : "border-border/80 bg-card hover:border-amber-400 hover:bg-muted/30 shadow-xs"
        )}
      >
        <Search
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isOpen ? "text-amber-600" : "text-muted-foreground"
          )}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            onOpen?.();
          }}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
        />

        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCourses([]);
              inputRef.current?.focus();
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground shadow-2xs shrink-0">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Backdrop scrim on mobile for immersive search focus */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-xs md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Responsive Live Results Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[80vh] sm:max-h-[460px] overflow-y-auto rounded-2xl border border-border bg-card/98 backdrop-blur-xl p-3 shadow-2xl space-y-3 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Active Search Spinner */}
          {isSearching && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
              <OverraLoader size="xs" variant="inline" label="Searching university course catalog…" />
            </div>
          )}

          {/* Matching Courses List */}
          {courses.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  Matching Courses
                </span>
                <span className="text-[10px] text-muted-foreground/80">
                  {courses.length} found
                </span>
              </div>

              <div className="space-y-1">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCourse(c.id)}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border border-transparent hover:border-amber-200/80 hover:bg-amber-500/5 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-900 dark:text-amber-200 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {c.code.slice(0, 3)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs sm:text-sm text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400">
                            {c.code}
                          </span>
                          {c.level && (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.2 rounded-md">
                              {c.level}L
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.name}
                        </p>
                      </div>
                    </div>

                    {/* Dual Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => handlePracticeCourse(e, c.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                        title="Start CBT Mock"
                      >
                        <Target className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span>CBT Mock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectCourse(c.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1 transition-colors"
                      >
                        <span>Outline</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results message */}
          {!isSearching && query.trim().length >= 2 && courses.length === 0 && (
            <div className="py-6 text-center space-y-1.5">
              <p className="text-xs font-semibold text-foreground">
                No courses found matching &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Try searching by course code (e.g. &ldquo;CSC 201&rdquo;), course title, or department.
              </p>
            </div>
          )}

          {/* Initial State / Suggested Shortcuts */}
          {(!query.trim() || query.length < 2) && (
            <div className="space-y-3">
              {enrolledCourses.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Your Enrolled Courses
                    </span>
                    <span className="text-[10px] text-muted-foreground">Quick Jump</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {enrolledCourses.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCourse(c.id)}
                        className="flex items-center justify-between p-2 rounded-xl border border-border/70 hover:border-amber-300 hover:bg-amber-500/5 cursor-pointer transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-mono font-bold text-xs text-foreground block">
                            {c.code}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate block">
                            {c.name}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Study Mode Speed Launchers */}
              <div className="pt-2 border-t border-border/70 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 block">
                  Quick Study Launchers
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/practice");
                    }}
                    className="flex flex-col items-start gap-1 p-2.5 rounded-xl border border-border/80 hover:border-amber-300 hover:bg-amber-500/5 text-left transition-colors"
                  >
                    <Target className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-xs text-foreground">Practice CBT</span>
                    <span className="text-[10px] text-muted-foreground">Simulate exam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/courses");
                    }}
                    className="flex flex-col items-start gap-1 p-2.5 rounded-xl border border-border/80 hover:border-amber-300 hover:bg-amber-500/5 text-left transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs text-foreground">All Courses</span>
                    <span className="text-[10px] text-muted-foreground">Syllabi & notes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/student/mastery");
                    }}
                    className="flex flex-col items-start gap-1 p-2.5 rounded-xl border border-border/80 hover:border-amber-300 hover:bg-amber-500/5 text-left transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-foreground">Weak Areas</span>
                    <span className="text-[10px] text-muted-foreground">Target missed Qs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/leaderboard");
                    }}
                    className="flex flex-col items-start gap-1 p-2.5 rounded-xl border border-border/80 hover:border-amber-300 hover:bg-amber-500/5 text-left transition-colors"
                  >
                    <Flame className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-xs text-foreground">Arena Battle</span>
                    <span className="text-[10px] text-muted-foreground">Campus ranking</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardSearch;
