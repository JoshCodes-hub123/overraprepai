import React, { useState, useEffect, useMemo } from "react";
import {
  UNIVERSITIES,
  UNIVERSITY_LIST,
  UniversityCode,
  facultiesOf,
  departmentsOf,
} from "@/config/universities";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Building2, School, GraduationCap, BookOpen, Plus, Loader2, Sparkles, CheckCircle2, Pin, PinOff, History } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export interface CascadeSelection {
  university: UniversityCode;
  universityName: string;
  faculty: string;
  department: string;
  level: string; // "100", "200", "300", "400", "500"
  semester: "1st Semester" | "2nd Semester";
  courseId: string;
  courseCode: string;
  courseName: string;
}

interface CourseItem {
  id: string;
  code: string;
  name: string;
  department: string | null;
  faculty: string | null;
  level: string | null;
  university: string | null;
  university_code: string | null;
}

interface Props {
  selection: CascadeSelection;
  onSelectionChange: (updated: CascadeSelection) => void;
  onCourseLoaded?: (courses: CourseItem[]) => void;
}

const ACADEMIC_LEVELS = [
  { value: "100", label: "100 Level (100L)" },
  { value: "200", label: "200 Level (200L)" },
  { value: "300", label: "300 Level (300L)" },
  { value: "400", label: "400 Level (400L)" },
  { value: "500", label: "500 Level (500L)" },
  { value: "600", label: "600 Level (600L)" },
];

export const InstitutionalCascadeSelector: React.FC<Props> = ({
  selection,
  onSelectionChange,
  onCourseLoaded,
}) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Speed controls: Recent Scopes and Pinned Default Scope
  const [recentScopes, setRecentScopes] = useState<CascadeSelection[]>([]);
  const [pinnedScope, setPinnedScope] = useState<CascadeSelection | null>(null);

  // Check if current selection is pinned
  const isPinned = useMemo(() => {
    if (!pinnedScope) return false;
    return (
      pinnedScope.university === selection.university &&
      pinnedScope.department === selection.department &&
      pinnedScope.level === selection.level
    );
  }, [pinnedScope, selection]);

  // Hydrate pinned & recent scopes on mount
  useEffect(() => {
    try {
      const savedPin = localStorage.getItem("admin_content_pinned_scope");
      if (savedPin) {
        const parsed: CascadeSelection = JSON.parse(savedPin);
        setPinnedScope(parsed);
        const searchParams = new URLSearchParams(window.location.search);
        // If not deep-linked with specific course, apply pinned scope
        if (!searchParams.get("course") && parsed.university) {
          onSelectionChange(parsed);
        }
      }

      const savedRecent = localStorage.getItem("admin_content_recent_scopes");
      if (savedRecent) {
        setRecentScopes(JSON.parse(savedRecent));
      }
    } catch (e) {
      console.warn("Could not load stored scope preferences:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save active scope to recent list
  const recordRecentScope = (scope: CascadeSelection) => {
    if (!scope.department) return;
    try {
      setRecentScopes((prev) => {
        const filtered = prev.filter(
          (s) =>
            !(
              s.university === scope.university &&
              s.department === scope.department &&
              s.level === scope.level
            )
        );
        const updated = [scope, ...filtered].slice(0, 3);
        localStorage.setItem("admin_content_recent_scopes", JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      // ignore
    }
  };

  const togglePinCurrent = () => {
    if (isPinned) {
      setPinnedScope(null);
      localStorage.removeItem("admin_content_pinned_scope");
      toast.info("Unpinned default scope");
    } else {
      setPinnedScope(selection);
      localStorage.setItem("admin_content_pinned_scope", JSON.stringify(selection));
      toast.success(`Pinned ${selection.university} · ${selection.department} as default!`);
    }
  };

  // Available faculties based on university
  const availableFaculties = useMemo(() => {
    return facultiesOf(selection.university);
  }, [selection.university]);

  // Available departments based on faculty
  const availableDepartments = useMemo(() => {
    return departmentsOf(selection.university, selection.faculty);
  }, [selection.university, selection.faculty]);

  // Fetch courses whenever institution, department or level changes
  useEffect(() => {
    let active = true;

    async function loadFilteredCourses() {
      setLoadingCourses(true);
      try {
        let query = supabase
          .from("courses")
          .select("id, code, name, department, faculty, level, university, university_code")
          .order("code");

        // Filter by university
        if (selection.university) {
          query = query.or(`university.eq.${selection.university},university_code.eq.${selection.university}`);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (active) {
          const list: CourseItem[] = (data as any) || [];
          setCourses(list);
          onCourseLoaded?.(list);

          // If current selected course is not in list or empty, pick the first matching or keep selection
          if (list.length > 0) {
            const exactMatch = list.find(
              (c) =>
                c.id === selection.courseId ||
                (c.department === selection.department && c.level === selection.level)
            );
            if (!selection.courseId || !list.some((c) => c.id === selection.courseId)) {
              const target = exactMatch || list[0];
              onSelectionChange({
                ...selection,
                courseId: target.id,
                courseCode: target.code,
                courseName: target.name,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading cascade courses:", err);
      } finally {
        if (active) setLoadingCourses(false);
      }
    }

    loadFilteredCourses();

    return () => {
      active = false;
    };
  }, [selection.university, selection.department, selection.level]);

  // Handle University change
  const handleUniversityChange = (uCode: UniversityCode) => {
    const uniDef = UNIVERSITIES[uCode];
    const newFaculties = facultiesOf(uCode);
    const firstFaculty = newFaculties[0] || "";
    const firstDept = departmentsOf(uCode, firstFaculty)[0] || "";

    onSelectionChange({
      ...selection,
      university: uCode,
      universityName: uniDef?.name || uCode,
      faculty: firstFaculty,
      department: firstDept,
      courseId: "",
      courseCode: "",
      courseName: "",
    });
  };

  // Handle Faculty change
  const handleFacultyChange = (newFac: string) => {
    const depts = departmentsOf(selection.university, newFac);
    const firstDept = depts[0] || "";

    onSelectionChange({
      ...selection,
      faculty: newFac,
      department: firstDept,
      courseId: "",
      courseCode: "",
      courseName: "",
    });
  };

  // Handle Department change
  const handleDepartmentChange = (newDept: string) => {
    const next = {
      ...selection,
      department: newDept,
      courseId: "",
      courseCode: "",
      courseName: "",
    };
    onSelectionChange(next);
    recordRecentScope(next);
  };

  // Handle Level change
  const handleLevelChange = (newLvl: string) => {
    const next = {
      ...selection,
      level: newLvl,
    };
    onSelectionChange(next);
    recordRecentScope(next);
  };

  // Handle Semester change
  const handleSemesterChange = (newSem: "1st Semester" | "2nd Semester") => {
    onSelectionChange({
      ...selection,
      semester: newSem,
    });
  };

  // Handle Course selection
  const handleCourseChange = (courseId: string) => {
    const found = courses.find((c) => c.id === courseId);
    if (found) {
      const next = {
        ...selection,
        courseId: found.id,
        courseCode: found.code,
        courseName: found.name,
      };
      onSelectionChange(next);
      recordRecentScope(next);
    }
  };

  // Quick Create Course
  const handleCreateCourse = async () => {
    if (!newCode.trim() || !newName.trim()) {
      toast.error("Course code and title are required");
      return;
    }

    setCreatingCourse(true);
    try {
      const codeUpper = newCode.toUpperCase().trim();
      const payload = {
        code: codeUpper,
        name: newName.trim(),
        description: newDescription.trim() || `Official course material for ${codeUpper}`,
        department: selection.department || null,
        faculty: selection.faculty || null,
        level: selection.level || "100",
        university: selection.university,
        university_code: selection.university,
        is_active: true,
        environment_type: "university" as const,
        path_type: "university" as const,
        created_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from("courses")
        .insert(payload as any)
        .select()
        .single();

      if (error) throw error;

      toast.success(`Course ${codeUpper} created successfully!`);
      const createdItem: CourseItem = data as any;
      setCourses((prev) => [createdItem, ...prev]);

      onSelectionChange({
        ...selection,
        courseId: createdItem.id,
        courseCode: createdItem.code,
        courseName: createdItem.name,
      });

      setIsCreateOpen(false);
      setNewCode("");
      setNewName("");
      setNewDescription("");
    } catch (err: any) {
      console.error("Failed to create course:", err);
      toast.error(err.message || "Failed to create course record");
    } finally {
      setCreatingCourse(false);
    }
  };

  return (
    <Card className="border border-amber-200/80 bg-gradient-to-r from-amber-500/5 via-white to-amber-500/5 dark:from-neutral-900 dark:via-neutral-900/90 dark:to-neutral-900 p-4 sm:p-5 shadow-sm rounded-2xl">
      {/* Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-amber-100 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-white shadow-xs">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
              Institutional Selection &amp; Scope
              <Badge variant="outline" className="text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 font-mono text-[11px]">
                {selection.university}
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              All outlines, lecture handouts, and CBT questions will be bound to this academic cascade.
            </p>
          </div>
        </div>

        {/* Breadcrumb pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg">
            {selection.university}
          </span>
          <span className="text-muted-foreground">›</span>
          <span className="font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg truncate max-w-[140px]" title={selection.faculty}>
            {selection.faculty || "Faculty"}
          </span>
          <span className="text-muted-foreground">›</span>
          <span className="font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg truncate max-w-[140px]" title={selection.department}>
            {selection.department || "Dept"}
          </span>
          <span className="text-muted-foreground">›</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
            {selection.courseCode || "Select Course"}
          </span>
        </div>
      </div>

      {/* Speed Controls: Recent Scopes & Pinning */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-amber-100/60 dark:border-neutral-800">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
            <History className="w-3.5 h-3.5 text-amber-600" />
            Recent Scopes:
          </span>
          {recentScopes.length === 0 ? (
            <span className="text-[11px] text-muted-foreground italic">None yet — switch departments to populate</span>
          ) : (
            recentScopes.map((scope, idx) => {
              const isActive =
                selection.university === scope.university &&
                selection.department === scope.department &&
                selection.level === scope.level;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectionChange(scope)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border shrink-0 ${
                    isActive
                      ? "bg-amber-100/90 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700 shadow-xs"
                      : "bg-white/90 dark:bg-neutral-800/90 text-slate-700 dark:text-neutral-300 border-border hover:bg-amber-50 hover:border-amber-200"
                  }`}
                  title={`Switch to ${scope.university} ${scope.department} (${scope.level}L)`}
                >
                  <span className="font-bold text-amber-700 dark:text-amber-400">{scope.university}</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="truncate max-w-[110px]">{scope.department || "Dept"}</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span>{scope.level}L</span>
                </button>
              );
            })
          )}
        </div>

        {/* Pin Default Scope Button */}
        <button
          type="button"
          onClick={togglePinCurrent}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border shrink-0 ${
            isPinned
              ? "bg-amber-500 text-white border-amber-600 shadow-xs hover:bg-amber-600"
              : "bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-border hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50"
          }`}
          title={isPinned ? "Click to unpin default scope" : "Pin this scope to load automatically on startup"}
        >
          {isPinned ? (
            <>
              <Pin className="w-3.5 h-3.5 fill-current" />
              <span>Pinned as Default</span>
            </>
          ) : (
            <>
              <PinOff className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Pin as Default</span>
            </>
          )}
        </button>
      </div>

      {/* Cascading Dropdowns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* 1. University */}
        <div className="space-y-1.5 lg:col-span-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
            <School className="w-3.5 h-3.5 text-amber-600" /> Institution
          </Label>
          <Select
            value={selection.university}
            onValueChange={(val) => handleUniversityChange(val as UniversityCode)}
          >
            <SelectTrigger className="h-10 text-xs font-medium bg-white dark:bg-neutral-900 border-amber-200 dark:border-neutral-700">
              <SelectValue placeholder="Select University" />
            </SelectTrigger>
            <SelectContent>
              {UNIVERSITY_LIST.map((u) => (
                <SelectItem key={u.code} value={u.code} className="text-xs">
                  <span className="font-bold">{u.code}</span> — {u.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. Faculty / School */}
        <div className="space-y-1.5 lg:col-span-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-amber-600" /> Faculty / School
          </Label>
          <Select
            value={selection.faculty}
            onValueChange={handleFacultyChange}
          >
            <SelectTrigger className="h-10 text-xs font-medium bg-white dark:bg-neutral-900 border-amber-200 dark:border-neutral-700 truncate">
              <SelectValue placeholder="Select Faculty" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {availableFaculties.map((fac) => (
                <SelectItem key={fac} value={fac} className="text-xs truncate">
                  {fac}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. Department */}
        <div className="space-y-1.5 lg:col-span-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" /> Department
          </Label>
          <Select
            value={selection.department}
            onValueChange={handleDepartmentChange}
          >
            <SelectTrigger className="h-10 text-xs font-medium bg-white dark:bg-neutral-900 border-amber-200 dark:border-neutral-700 truncate">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {availableDepartments.map((dept) => (
                <SelectItem key={dept} value={dept} className="text-xs truncate">
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 4. Level */}
        <div className="space-y-1.5 lg:col-span-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
            Academic Level
          </Label>
          <Select value={selection.level} onValueChange={handleLevelChange}>
            <SelectTrigger className="h-10 text-xs font-medium bg-white dark:bg-neutral-900 border-amber-200 dark:border-neutral-700">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              {ACADEMIC_LEVELS.map((lvl) => (
                <SelectItem key={lvl.value} value={lvl.value} className="text-xs">
                  {lvl.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 5. Semester */}
        <div className="space-y-1.5 lg:col-span-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
            Semester
          </Label>
          <Select
            value={selection.semester}
            onValueChange={(val) => handleSemesterChange(val as any)}
          >
            <SelectTrigger className="h-10 text-xs font-medium bg-white dark:bg-neutral-900 border-amber-200 dark:border-neutral-700">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1st Semester" className="text-xs">
                1st Semester
              </SelectItem>
              <SelectItem value="2nd Semester" className="text-xs">
                2nd Semester
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 6. Course Code & Title */}
        <div className="space-y-1.5 lg:col-span-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
              Course Code
            </Label>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-0.5 hover:underline"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    Create Course Record
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Adds a new verified course directly to {selection.university} ({selection.department}, {selection.level}L).
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Course Code</Label>
                    <Input
                      placeholder="e.g. CSC 201, EEE 201, MAT 201"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="font-mono uppercase text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Course Title / Name</Label>
                    <Input
                      placeholder="e.g. Computer Programming I"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Brief Description</Label>
                    <Input
                      placeholder="e.g. Algorithms, Data structures, C/C++ fundamentals"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-neutral-800/60 p-2.5 text-xs text-slate-600 dark:text-neutral-300 space-y-1">
                    <div className="flex items-center gap-1 text-amber-800 dark:text-amber-300 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Auto-populated Scope:
                    </div>
                    <p className="text-[11px]">
                      {selection.university} · {selection.faculty} · {selection.department} · {selection.level}L
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={creatingCourse}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleCreateCourse}
                    disabled={creatingCourse}
                  >
                    {creatingCourse ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Creating…
                      </>
                    ) : (
                      "Create Course"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Select
            value={selection.courseId}
            onValueChange={handleCourseChange}
            disabled={loadingCourses}
          >
            <SelectTrigger className="h-10 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700">
              {loadingCourses ? (
                <div className="flex items-center gap-2 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                </div>
              ) : (
                <SelectValue placeholder="Select Course" />
              )}
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {courses.length === 0 ? (
                <div className="p-2 text-center text-xs text-muted-foreground">
                  No courses found. Click "+ New" above to add one.
                </div>
              ) : (
                courses.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    <span className="font-mono font-bold">{c.code}</span> — {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};

export default InstitutionalCascadeSelector;
