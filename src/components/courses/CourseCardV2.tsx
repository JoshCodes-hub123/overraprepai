import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lock, Plus, Check, ArrowRight, Sparkles, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";

export type CourseCardState = "enrolled" | "available" | "locked";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
}

interface Props {
  course: Course;
  state: CourseCardState;
  recommended?: boolean;
  busy?: boolean;
  studentLevel?: string | null;
  onAdd?: () => void;
  onLockedTap?: () => void;
}

/** Map department keywords → soft accent gradient */
function deptAccent(dept: string | null | undefined) {
  const d = (dept || "").toLowerCase();
  if (/eng|tech|mech|elec|civil|comp/.test(d)) return "from-amber-400 via-amber-300 to-amber-200";
  if (/sci|phys|chem|bio|math/.test(d)) return "from-emerald-400 via-emerald-300 to-teal-200";
  if (/art|lang|hist|lit/.test(d)) return "from-rose-400 via-rose-300 to-orange-200";
  if (/med|health|nurs|pharm/.test(d)) return "from-sky-400 via-cyan-300 to-blue-200";
  if (/econ|mgmt|bus|account|finance/.test(d)) return "from-indigo-400 via-indigo-300 to-violet-200";
  return "from-amber-400 via-amber-300 to-amber-200";
}

export function CourseCardV2({
  course,
  state,
  recommended,
  busy,
  studentLevel,
  onAdd,
  onLockedTap,
}: Props) {
  const locked = state === "locked";
  const enrolled = state === "enrolled";
  const accent = deptAccent(course.department);

  const units = /101|102|201|202|301|302/i.test(course.code) ? "3 Units" : "2 Units";

  const body = (
    <Card
      className={`group relative overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${
        locked
          ? "border-neutral-200 opacity-80"
          : "border-amber-200/70 hover:border-amber-400 hover:shadow-[0_8px_25px_-8px_rgba(217,119,6,0.2)]"
      }`}
    >
      {/* Accent top stripe */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />

      <div className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
        <div>
          {/* Header row: Course Code badge + Level + Units */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className="font-display text-[11px] font-bold border-amber-300 bg-amber-50 text-amber-900 tracking-wider"
              >
                {course.code}
              </Badge>
              <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                {units}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {course.level && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    locked
                      ? "bg-neutral-100 text-neutral-500"
                      : "bg-white border border-amber-200 text-amber-800"
                  }`}
                >
                  {course.level}
                </span>
              )}
              {recommended && !locked && !enrolled && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white">
                  <Sparkles className="w-2.5 h-2.5" /> For you
                </span>
              )}
              {locked && <Lock className="w-3.5 h-3.5 text-neutral-400" />}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-display font-bold text-[14.5px] leading-snug line-clamp-2 min-h-[2.5rem] text-neutral-900 group-hover:text-amber-700 transition-colors">
            {course.name}
          </h3>

          {course.department && (
            <p className="text-[11.5px] text-neutral-500 mt-1 line-clamp-1">
              {course.department}
            </p>
          )}
        </div>

        {/* Action Row */}
        <div className="mt-4 pt-3 border-t border-neutral-100">
          {enrolled && (
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                className="flex-1 h-9 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                <Link to={`/courses/${course.id}`}>
                  <BookOpen className="w-3.5 h-3.5 mr-1" />
                  Syllabus
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-9 px-3 border-amber-300 text-amber-900 hover:bg-amber-50 rounded-xl font-bold text-xs"
                title="CBT Exam Simulation"
              >
                <Link to={`/practice?course=${course.id}`}>
                  <ClipboardList className="w-3.5 h-3.5 mr-1" />
                  CBT
                </Link>
              </Button>
            </div>
          )}

          {state === "available" && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={onAdd}
                className="flex-1 h-9 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                {busy ? (
                  "Enrolling…"
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Course
                  </>
                )}
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-9 px-2.5 text-xs text-neutral-600 border-neutral-200 hover:bg-neutral-50 rounded-xl"
              >
                <Link to={`/courses/${course.id}`}>View</Link>
              </Button>
            </div>
          )}

          {locked && (
            <Button
              size="sm"
              variant="outline"
              onClick={onLockedTap}
              className="w-full h-9 border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-semibold rounded-xl"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
              {studentLevel ? `Switch from ${studentLevel} to add` : "Set your level"}
            </Button>
          )}
        </div>
      </div>

      {enrolled && (
        <span className="absolute top-2.5 right-2.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shadow-xs">
          <Check className="w-3 h-3 stroke-[3]" />
        </span>
      )}
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {body}
    </motion.div>
  );
}
