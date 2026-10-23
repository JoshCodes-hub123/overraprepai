import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Plus,
  BookOpen,
  Printer,
  Trash2,
  Edit2,
  Download,
  Loader2,
  Sparkles,
  MapPin,
  User,
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

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export interface TimetableSlot {
  id: string;
  class_id: string;
  day: DayOfWeek;
  start_time: string; // e.g. "08:00"
  end_time: string;   // e.g. "08:45"
  period_label: string; // "Period 1", "Break", etc.
  subject: string;
  teacher_name?: string;
  room?: string;
  is_break?: boolean;
}

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const DEFAULT_PERIODS = [
  { label: "Period 1", start: "08:00", end: "08:45", is_break: false },
  { label: "Period 2", start: "08:45", end: "09:30", is_break: false },
  { label: "Assembly / Short Break", start: "09:30", end: "10:00", is_break: true },
  { label: "Period 3", start: "10:00", end: "10:45", is_break: false },
  { label: "Period 4", start: "10:45", end: "11:30", is_break: false },
  { label: "Midday Break", start: "11:30", end: "12:15", is_break: true },
  { label: "Period 5", start: "12:15", end: "13:00", is_break: false },
  { label: "Period 6", start: "13:00", end: "13:45", is_break: false },
  { label: "Period 7", start: "13:45", end: "14:30", is_break: false },
];

export default function SchoolTimetable() {
  const { school, loading: sLoading } = useCurrentSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<DayOfWeek>("Monday");
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [day, setDay] = useState<DayOfWeek>("Monday");
  const [periodLabel, setPeriodLabel] = useState("Period 1");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [subject, setSubject] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [room, setRoom] = useState("");
  const [isBreak, setIsBreak] = useState(false);

  const storageKey = useMemo(() => {
    return school && selectedClassId
      ? `overra_school_timetable_${school.id}_${selectedClassId}`
      : null;
  }, [school, selectedClassId]);

  // Load classes & subjects
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
        if (clsData && clsData.length > 0 && !selectedClassId) {
          setSelectedClassId(clsData[0].id);
        }
        if (subjData && subjData.length > 0) {
          setSchoolSubjects(subjData.map((s: any) => s.name));
        } else {
          setSchoolSubjects([
            "Mathematics",
            "English Language",
            "Physics",
            "Chemistry",
            "Biology",
            "Economics",
            "Civic Education",
            "Agricultural Science",
            "Computer Studies",
          ]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [school]);

  // Load slots for selected class
  useEffect(() => {
    if (!selectedClassId || !storageKey) return;

    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        setSlots(JSON.parse(raw));
        return;
      } catch {
        // fallback to generating initial schedule
      }
    }

    // Generate initial structured starter timetable if none exists
    const starter: TimetableSlot[] = [];
    const sampleSubjects = [
      "Mathematics",
      "English Language",
      "Biology",
      "Chemistry",
      "Physics",
      "Economics",
      "Civic Education",
    ];

    DAYS.forEach((d, dayIdx) => {
      DEFAULT_PERIODS.forEach((p, pIdx) => {
        if (p.is_break) {
          starter.push({
            id: `slot-${d}-${pIdx}`,
            class_id: selectedClassId,
            day: d,
            start_time: p.start,
            end_time: p.end,
            period_label: p.label,
            subject: p.label,
            is_break: true,
          });
        } else {
          const subj = sampleSubjects[(dayIdx * 2 + pIdx) % sampleSubjects.length];
          starter.push({
            id: `slot-${d}-${pIdx}`,
            class_id: selectedClassId,
            day: d,
            start_time: p.start,
            end_time: p.end,
            period_label: p.label,
            subject: subj,
            teacher_name: "Staff",
            room: "Main Hall / Lab",
            is_break: false,
          });
        }
      });
    });

    setSlots(starter);
    localStorage.setItem(storageKey, JSON.stringify(starter));
  }, [selectedClassId, storageKey]);

  const persistSlots = (next: TimetableSlot[]) => {
    setSlots(next);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(next));
    }
  };

  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  const slotsForActiveDay = useMemo(() => {
    return slots
      .filter((s) => s.day === activeDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [slots, activeDay]);

  const handleOpenAdd = () => {
    setEditingSlot(null);
    setDay(activeDay);
    setPeriodLabel(`Period ${slotsForActiveDay.filter((s) => !s.is_break).length + 1}`);
    setStartTime("08:00");
    setEndTime("08:45");
    setSubject(schoolSubjects[0] || "Mathematics");
    setTeacherName("");
    setRoom("");
    setIsBreak(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (s: TimetableSlot) => {
    setEditingSlot(s);
    setDay(s.day);
    setPeriodLabel(s.period_label);
    setStartTime(s.start_time);
    setEndTime(s.end_time);
    setSubject(s.subject);
    setTeacherName(s.teacher_name || "");
    setRoom(s.room || "");
    setIsBreak(!!s.is_break);
    setModalOpen(true);
  };

  const handleSaveSlot = () => {
    if (!selectedClassId) return;
    if (!subject.trim()) {
      return toast.error("Please enter a subject name or label");
    }

    if (editingSlot) {
      const updated: TimetableSlot = {
        ...editingSlot,
        day,
        start_time: startTime,
        end_time: endTime,
        period_label: periodLabel,
        subject: subject.trim(),
        teacher_name: teacherName.trim() || undefined,
        room: room.trim() || undefined,
        is_break: isBreak,
      };
      const next = slots.map((s) => (s.id === editingSlot.id ? updated : s));
      persistSlots(next);
      toast.success("Timetable slot updated");
    } else {
      const newSlot: TimetableSlot = {
        id: "slot-" + Math.random().toString(36).substring(2, 9),
        class_id: selectedClassId,
        day,
        start_time: startTime,
        end_time: endTime,
        period_label: periodLabel,
        subject: subject.trim(),
        teacher_name: teacherName.trim() || undefined,
        room: room.trim() || undefined,
        is_break: isBreak,
      };
      const next = [...slots, newSlot];
      persistSlots(next);
      toast.success("Period added to schedule");
    }

    setModalOpen(false);
  };

  const handleDeleteSlot = (id: string) => {
    if (confirm("Delete this period from schedule?")) {
      const next = slots.filter((s) => s.id !== id);
      persistSlots(next);
      toast.success("Period deleted");
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
      title="Class Timetable"
      subtitle={`${school?.name ?? "School Portal"} · Weekly Schedule`}
      back
      right={
        <div className="flex items-center gap-1.5 print:hidden">
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
            onClick={handlePrint}
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print / PDF</span>
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs bg-primary text-primary-foreground shadow-sm"
            onClick={handleOpenAdd}
          >
            <Plus className="w-4 h-4" />
            <span>Add Period</span>
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Class Selector Bar */}
        <div className="flex items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-3 shadow-xs print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground shrink-0">
              Active Class:
            </span>
            {classes.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">
                No classes registered
              </span>
            ) : (
              <select
                value={selectedClassId || ""}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.level} {c.arm}
                  </option>
                ))}
              </select>
            )}
          </div>
          {currentClass && (
            <Badge variant="outline" className="text-[11px] font-semibold bg-primary/5 text-primary">
              {currentClass.level} {currentClass.arm}
            </Badge>
          )}
        </div>

        {/* Days of Week Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 print:hidden">
          {DAYS.map((d) => {
            const isActive = activeDay === d;
            const count = slots.filter((s) => s.day === d).length;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setActiveDay(d)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-card text-muted-foreground hover:bg-muted border border-border/60"
                }`}
              >
                <span>{d}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Printable Header - Visible when printing */}
        <div className="hidden print:block text-center pb-4 border-b border-black">
          <h1 className="text-2xl font-bold">{school?.name}</h1>
          <p className="text-sm italic">{school?.motto || "Excellence in Education"}</p>
          <p className="text-base font-semibold mt-2">
            Weekly Class Timetable — {currentClass ? `${currentClass.level} ${currentClass.arm}` : "All Classes"}
          </p>
        </div>

        {/* Schedule List / Timeline */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : slotsForActiveDay.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center bg-card/50">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="font-display font-semibold text-base mb-1">
              No periods scheduled for {activeDay}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Add periods to set up subjects, teaching staff, and classroom allocations.
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Period
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
              {slotsForActiveDay.map((slot) => {
                if (slot.is_break) {
                  return (
                    <motion.div
                      key={slot.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl border border-dashed border-amber-300/80 bg-amber-500/5 p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                          <span className="font-bold text-amber-700 dark:text-amber-300">
                            {slot.period_label}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            {slot.start_time} – {slot.end_time}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 print:hidden">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(slot)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteSlot(slot.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={slot.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-2xl border border-border bg-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      {/* Time pill */}
                      <div className="px-2.5 py-1.5 rounded-xl bg-muted/60 text-foreground font-mono text-[11px] font-semibold shrink-0 text-center border border-border/50">
                        <div>{slot.start_time}</div>
                        <div className="text-[9px] text-muted-foreground">to {slot.end_time}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                            {slot.period_label}
                          </span>
                          {slot.room && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground/70" />
                              {slot.room}
                            </span>
                          )}
                        </div>
                        <h4 className="font-display font-bold text-sm text-foreground truncate mt-0.5">
                          {slot.subject}
                        </h4>
                        {slot.teacher_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-muted-foreground/70" />
                            {slot.teacher_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-center print:hidden">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(slot)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add / Edit Period Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? "Edit Period" : "Add Period to Schedule"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Day of Week</label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value as DayOfWeek)}
                  className="w-full h-9 px-2.5 rounded-md border border-input bg-background"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Period Name</label>
                <Input
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="e.g. Period 1"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Start Time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">End Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
              <input
                type="checkbox"
                id="isBreakCheck"
                checked={isBreak}
                onChange={(e) => {
                  setIsBreak(e.target.checked);
                  if (e.target.checked && !subject) {
                    setSubject("Break");
                  }
                }}
                className="rounded border-input text-primary"
              />
              <label htmlFor="isBreakCheck" className="text-xs font-medium cursor-pointer">
                This is a Break / Assembly period (no subject taught)
              </label>
            </div>

            {!isBreak && (
              <>
                <div>
                  <label className="font-semibold block mb-1">Subject *</label>
                  <div className="flex gap-2">
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Mathematics"
                      className="h-9 flex-1"
                    />
                    {schoolSubjects.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) setSubject(e.target.value);
                        }}
                        className="h-9 px-2 rounded-md border border-input bg-background text-xs max-w-[120px]"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select...
                        </option>
                        {schoolSubjects.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">Teacher</label>
                    <Input
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="e.g. Mr. Alabi"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Classroom / Lab</label>
                    <Input
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="e.g. Room 4B"
                      className="h-9"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveSlot}>
              {editingSlot ? "Save Changes" : "Add to Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppScreen>
  );
}
