import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lock, Plus, Check, ArrowRight, Sparkles } from "lucide-react";
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

/** Map department keywords → soft accent gradient (still white + gold base). */
function deptAccent(dept: string | null | undefined) {
  const d = (dept || "").toLowerCase();
  if (/eng|tech|mech|elec|civil|comp/.test(d)) return "from-amber-100 via-amber-50 to-white";
  if (/sci|phys|chem|bio|math/.test(d)) return "from-emerald-100/70 via-amber-50 to-white";
  if (/art|lang|hist|lit/.test(d)) return "from-rose-100/70 via-amber-50 to-white";
  if (/med|health|nurs|pharm/.test(d)) return "from-sky-100/70 via-amber-50 to-white";
  if (/econ|mgmt|bus|account|finance/.test(d)) return "from-indigo-100/70 via-amber-50 to-white";
  return "from-amber-100 via-amber-50 to-white";
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

  const body = (
    <Card
      className={`group relative overflow-hidden rounded-2xl border bg-white transition-all ${
        locked
          ? "border-neutral-200 opacity-80"
          : "border-amber-100 hover:border-amber-300 hover:shadow-[0_10px_30px_-12px_rgba(217,119,6,0.25)]"
      }`}
    >
      {/* Accent strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge
            variant="outline"
            className="font-display text-[11px] font-bold border-amber-300 bg-amber-50 text-amber-800"
          >
            {course.code}
          </Badge>
          <div className="flex items-center gap-1">
            {course.level && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  locked
                    ? "bg-neutral-100 text-neutral-500"
                    : "bg-white border border-amber-100 text-amber-700"
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

        <h3 className="font-display font-bold text-[14.5px] leading-snug line-clamp-2 min-h-[2.6rem] text-neutral-900">
          {course.name}
        </h3>
        {course.department && (
          <p className="text-[11.5px] text-neutral-500 mt-1 line-clamp-1">{course.department}</p>
        )}

        <div className="mt-3">
          {enrolled && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="w-full h-9 border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-amber-800"
            >
              <Link to={`/courses/${course.id}`}>
                <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Open
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </Link>
            </Button>
          )}

          {state === "available" && (
            <Button
              size="sm"
              disabled={busy}
              onClick={onAdd}
              className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {busy ? (
                "Adding…"
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add to my courses
                </>
              )}
            </Button>
          )}

          {locked && (
            <Button
              size="sm"
              variant="outline"
              onClick={onLockedTap}
              className="w-full h-9 border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              {studentLevel ? `Switch from ${studentLevel} to enroll` : "Set your level"}
            </Button>
          )}
        </div>
      </div>

      {enrolled && (
        <span className="absolute top-3 right-3 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shadow">
          <Check className="w-3 h-3" />
        </span>
      )}
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {body}
    </motion.div>
  );
}

export default CourseCardV2;
