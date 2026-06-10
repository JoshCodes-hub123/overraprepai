import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, BookOpen, ArrowRight, GraduationCap } from "lucide-react";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useStudentScope } from "@/hooks/useStudentScope";

function timeAgo(iso: string | null) {
  if (!iso) return "Not opened yet";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function CourseRail() {
  const { data = [], isLoading } = useCourseSnapshots();
  const { level } = useStudentScope();
  const courses = [...data]
    .sort((a, b) => {
      const ta = a.last_opened_at ? new Date(a.last_opened_at).getTime() : 0;
      const tb = b.last_opened_at ? new Date(b.last_opened_at).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 12);
  const atLimit = courses.length >= 12;

  return (
    <section aria-labelledby="my-courses-label">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <h2 id="my-courses-label" className="font-display text-[15px] font-bold tracking-tight">
            My Courses
          </h2>
          {level && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
              <GraduationCap className="w-3 h-3" /> {level}
            </span>
          )}
        </div>
        <Link to="/courses" className="text-[12px] font-bold text-amber-700 hover:text-amber-800">
          Manage
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 w-44 shrink-0 rounded-2xl bg-amber-50/40 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Link
          to="/courses"
          className="block rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-6 text-center hover:bg-amber-50/70 transition"
        >
          <div className="mx-auto h-11 w-11 rounded-full bg-white border border-amber-100 shadow-sm flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-amber-600" />
          </div>
          <p className="font-display text-[14px] font-bold">No courses selected yet</p>
          <p className="text-[12px] text-neutral-500 mt-1">
            Pick up to 12 {level ? `${level} ` : ""}courses to tailor your study.
          </p>
          <span className="inline-flex mt-3 items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 text-white text-[12px] font-bold">
            Select Courses <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      ) : (
        <div className="-mx-4 px-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-3 pb-1">
            {courses.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="snap-start"
              >
                <Link
                  to={`/courses/${c.id}`}
                  className="block w-44 rounded-2xl border border-amber-100 bg-white p-4 hover:border-amber-300 hover:shadow-sm transition relative"
                >
                  {c.unread_updates > 0 && (
                    <span className="absolute top-3 right-3 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                      {c.unread_updates}
                    </span>
                  )}
                  <div className="inline-flex items-center gap-1 mb-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-amber-700">
                      {c.code}
                    </span>
                    {c.level && (
                      <span className="text-[10px] text-neutral-500">{c.level}</span>
                    )}
                  </div>
                  <p className="font-display text-[13px] font-extrabold text-neutral-900 tracking-tight line-clamp-2 leading-tight min-h-[2.4rem]">
                    {c.name}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10.5px] text-neutral-500">{timeAgo(c.last_opened_at)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                </Link>
              </motion.div>
            ))}
            <div className="snap-start">
              {atLimit ? (
                <div
                  aria-disabled
                  className="w-44 min-h-[168px] rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/60 p-4 flex flex-col items-center justify-center text-center opacity-70"
                >
                  <Plus className="w-5 h-5 text-neutral-400 mb-2" />
                  <p className="text-[11.5px] font-bold text-neutral-500 leading-tight">
                    Maximum 12 courses reached
                  </p>
                </div>
              ) : (
                <Link
                  to="/courses"
                  className="w-44 min-h-[168px] rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-4 flex flex-col items-center justify-center text-center hover:bg-amber-50/70 transition"
                >
                  <div className="h-9 w-9 rounded-full bg-white border border-amber-200 flex items-center justify-center mb-2">
                    <Plus className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="font-display text-[12.5px] font-bold text-amber-800">Add Course</p>
                  <p className="text-[10.5px] text-neutral-500 mt-1 leading-tight">
                    Up to 12 {level ? `${level} ` : ""}courses
                  </p>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default CourseRail;
