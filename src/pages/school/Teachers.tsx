import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Plus,
  Search,
  Mail,
  Phone,
  BookOpen,
  Trash2,
  Edit2,
  Users,
  ShieldCheck,
  CheckCircle2,
  Download,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentSchool } from "@/hooks/useCurrentSchool";
import AppScreen from "@/components/app-shell/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/exportCsv";

export interface SchoolTeacherRecord {
  id: string;
  school_id: string;
  full_name: string;
  email: string;
  phone?: string;
  designation: string; // "Subject Teacher" | "Form Master" | "HOD Sciences" | "HOD Arts" | "Vice Principal"
  assigned_subjects: string[];
  assigned_classes: string[];
  status: "active" | "on_leave";
  joined_date: string;
}

const DESIGNATIONS = [
  "Subject Teacher",
  "Form Master / Mistress",
  "Head of Department (Sciences)",
  "Head of Department (Arts & Humanities)",
  "Head of Department (Commercial)",
  "Vice Principal (Academics)",
  "Vice Principal (Administration)",
  "Guidance Counselor",
];

const DEFAULT_SUBJECTS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Further Mathematics",
  "Agricultural Science",
  "Economics",
  "Government",
  "Literature in English",
  "Civic Education",
  "Commerce",
  "Computer Studies / ICT",
  "CRS / IRS",
];

export default function SchoolTeachers() {
  const { school, loading: sLoading } = useCurrentSchool();
  const [teachers, setTeachers] = useState<SchoolTeacherRecord[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [search, setSearch] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("all");
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<SchoolTeacherRecord | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState(DESIGNATIONS[0]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "on_leave">("active");

  const storageKey = useMemo(() => {
    return school ? `overra_school_teachers_${school.id}` : null;
  }, [school]);

  // Load classes & school subjects
  useEffect(() => {
    if (!school) return;

    (async () => {
      setLoading(true);
      try {
        const [{ data: clsData }, { data: subjData }] = await Promise.all([
          supabase.from("school_classes").select("*").eq("school_id", school.id).order("level"),
          supabase.from("school_subjects").select("name").eq("school_id", school.id).order("name"),
        ]);
        setClasses(clsData || []);
        if (subjData && subjData.length > 0) {
          const names = Array.from(new Set([...subjData.map((s: any) => s.name), ...DEFAULT_SUBJECTS]));
          setSchoolSubjects(names);
        }

        // Load stored teachers from cache / local storage or school_members
        let savedList: SchoolTeacherRecord[] = [];
        if (storageKey) {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            try {
              savedList = JSON.parse(raw);
            } catch {
              savedList = [];
            }
          }
        }

        // If no teachers in store yet, pre-populate default starter staff if available
        if (savedList.length === 0 && school.name) {
          savedList = [
            {
              id: "t-default-1",
              school_id: school.id,
              full_name: `${school.name} Dean of Academics`,
              email: `academics@${school.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.edu.ng`,
              phone: "08012345678",
              designation: "Vice Principal (Academics)",
              assigned_subjects: ["Mathematics", "Further Mathematics"],
              assigned_classes: (clsData || []).slice(0, 2).map((c: any) => `${c.level} ${c.arm}`),
              status: "active",
              joined_date: new Date().toISOString().slice(0, 10),
            },
          ];
          if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(savedList));
          }
        }
        setTeachers(savedList);
      } catch (e) {
        console.error("Error loading teachers:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [school, storageKey]);

  // Persist helper
  const persistTeachers = (next: SchoolTeacherRecord[]) => {
    setTeachers(next);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(next));
    }
  };

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setDesignation(DESIGNATIONS[0]);
    setSelectedSubjects([]);
    setSelectedClasses([]);
    setStatus("active");
    setModalOpen(true);
  };

  const handleOpenEdit = (t: SchoolTeacherRecord) => {
    setEditingTeacher(t);
    setFullName(t.full_name);
    setEmail(t.email);
    setPhone(t.phone || "");
    setDesignation(t.designation);
    setSelectedSubjects(t.assigned_subjects || []);
    setSelectedClasses(t.assigned_classes || []);
    setStatus(t.status);
    setModalOpen(true);
  };

  const handleSaveTeacher = async () => {
    if (!school) return;
    if (!fullName.trim()) {
      return toast.error("Please enter the teacher's full name");
    }

    if (editingTeacher) {
      const updated: SchoolTeacherRecord = {
        ...editingTeacher,
        full_name: fullName.trim(),
        email: email.trim() || editingTeacher.email,
        phone: phone.trim(),
        designation,
        assigned_subjects: selectedSubjects,
        assigned_classes: selectedClasses,
        status,
      };
      const next = teachers.map((t) => (t.id === editingTeacher.id ? updated : t));
      persistTeachers(next);
      toast.success("Teacher record updated");
    } else {
      const newTeacher: SchoolTeacherRecord = {
        id: "teach-" + Math.random().toString(36).substring(2, 9),
        school_id: school.id,
        full_name: fullName.trim(),
        email: email.trim() || `${fullName.trim().toLowerCase().replace(/\s+/g, ".")}@school.edu.ng`,
        phone: phone.trim(),
        designation,
        assigned_subjects: selectedSubjects,
        assigned_classes: selectedClasses,
        status,
        joined_date: new Date().toISOString().slice(0, 10),
      };
      const next = [newTeacher, ...teachers];
      persistTeachers(next);
      toast.success(`${fullName.trim()} registered to staff roster`);
    }

    setModalOpen(false);
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (confirm(`Remove "${name}" from staff roster?`)) {
      const next = teachers.filter((t) => t.id !== id);
      persistTeachers(next);
      toast.success("Teacher removed from roster");
    }
  };

  const handleExportCsv = () => {
    if (teachers.length === 0) {
      return toast.info("No teacher records to export");
    }
    const rows = teachers.map((t) => ({
      "Full Name": t.full_name,
      Designation: t.designation,
      Email: t.email,
      Phone: t.phone || "—",
      Subjects: t.assigned_subjects.join("; "),
      Classes: t.assigned_classes.join("; "),
      Status: t.status,
      "Date Joined": t.joined_date,
    }));
    exportToCsv(`${school?.name || "School"}_Staff_Directory`, rows);
    toast.success("Staff directory exported to CSV");
  };

  const toggleSubject = (s: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const toggleClass = (c: string) => {
    setSelectedClasses((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    );
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchSearch =
        !search ||
        t.full_name.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        t.designation.toLowerCase().includes(search.toLowerCase()) ||
        t.assigned_subjects.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
        t.assigned_classes.some((c) => c.toLowerCase().includes(search.toLowerCase()));

      const matchDesignation =
        filterDesignation === "all" || t.designation === filterDesignation;

      return matchSearch && matchDesignation;
    });
  }, [teachers, search, filterDesignation]);

  if (sLoading) {
    return (
      <AppScreen>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title="Teachers & Staff"
      subtitle={`${teachers.length} total staff · ${school?.name ?? "School Portal"}`}
      back
      right={
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
            onClick={handleExportCsv}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground shadow-sm"
            onClick={handleOpenAdd}
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff</span>
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, subject, designation or class…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-card border-border/70"
            />
          </div>
          <select
            value={filterDesignation}
            onChange={(e) => setFilterDesignation(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-card text-xs font-medium"
          >
            <option value="all">All Roles ({teachers.length})</option>
            {DESIGNATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Staff cards roster */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center bg-card/50">
            <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="font-display font-semibold text-base mb-1">No teachers found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              {search || filterDesignation !== "all"
                ? "Try clearing your search query or role filter."
                : "Add your school's teachers to track subjects, form master duties, and timetable schedules."}
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Teacher
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence>
              {filteredTeachers.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col justify-between shadow-xs hover:border-primary/40 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-display font-bold flex items-center justify-center shrink-0 border border-amber-500/20">
                          {t.full_name
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-display font-semibold text-sm truncate text-foreground">
                            {t.full_name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {t.designation}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={t.status === "active" ? "default" : "secondary"}
                        className={`text-[10px] uppercase font-bold shrink-0 ${
                          t.status === "active"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t.status === "active" ? "Active" : "On leave"}
                      </Badge>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                      {t.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80" />
                          <span className="truncate">{t.email}</span>
                        </div>
                      )}
                      {t.phone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80" />
                          <span>{t.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Subjects tag cloud */}
                    <div className="mb-2">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                        Subjects Taught
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {t.assigned_subjects.length > 0 ? (
                          t.assigned_subjects.map((subj) => (
                            <span
                              key={subj}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/20"
                            >
                              {subj}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            No subjects assigned yet
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Classes assigned */}
                    <div className="mb-3">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                        Assigned Classes
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {t.assigned_classes.length > 0 ? (
                          t.assigned_classes.map((cls) => (
                            <span
                              key={cls}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium"
                            >
                              {cls}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            General staff
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-muted-foreground">
                      Since {t.joined_date}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(t)}
                        title="Edit Teacher"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteTeacher(t.id, t.full_name)}
                        title="Delete Teacher"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTeacher ? "Edit Teacher Record" : "Add Teacher to Staff Roster"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Full Name *
              </label>
              <Input
                placeholder="e.g. Dr. Emmanuel Okafor"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="e.g. e.okafor@school.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Phone Number
                </label>
                <Input
                  placeholder="e.g. 08031234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Designation / Role
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs"
                >
                  {DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Employment Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs"
                >
                  <option value="active">Active Duty</option>
                  <option value="on_leave">On Sabbatical / Leave</option>
                </select>
              </div>
            </div>

            {/* Subject Selector */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                <span>Assigned Subjects</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {selectedSubjects.length} selected
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg border border-border bg-muted/20">
                {schoolSubjects.map((s) => {
                  const isChecked = selectedSubjects.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSubject(s)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        isChecked
                          ? "bg-amber-500 text-white border-amber-500 font-semibold shadow-xs"
                          : "bg-card text-muted-foreground border-border hover:border-amber-400"
                      }`}
                    >
                      {isChecked ? "✓ " : "+ "}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Class Selector */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                <span>Assigned Classes</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {selectedClasses.length} selected
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-muted/20">
                {classes.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    No classes set up yet. Create classes under School &gt; Classes first.
                  </span>
                ) : (
                  classes.map((c) => {
                    const tag = `${c.level} ${c.arm}`;
                    const isChecked = selectedClasses.includes(tag);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleClass(tag)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                          isChecked
                            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                            : "bg-card text-muted-foreground border-border hover:border-primary/40"
                        }`}
                      >
                        {isChecked ? "✓ " : "+ "}
                        {tag}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeacher}>
              {editingTeacher ? "Save Changes" : "Register Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppScreen>
  );
}
