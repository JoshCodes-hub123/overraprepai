import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, BookOpen } from "lucide-react";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";

const RING_COLORS = ["#d97706", "#10b981", "#6366f1", "#f43f5e", "#0ea5e9", "#a855f7"];

function ProgressRing({ value, color }: { value: number; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <g transform="rotate(-90 32 32)">
        <circle cx="32" cy="32" r={r} stroke="#f1f5f9" strokeWidth="5" fill="none" />
        <circle
          cx="32" cy="32" r={r}
          stroke={color} strokeWidth="5" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </g>
      <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">
        {Math.round(value)}%
      </text>
    </svg>
  );
}

export function CourseRail() {
  const { data = [], isLoading } = useCourseSnapshots();
  const courses = data.slice(0, 12);
  const atLimit = courses.length >= 12;

  return (
    <section aria-labelledby="my-courses-label">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 id="my-courses-label" className="font-display text-[15px] font-bold tracking-tight">
          My Courses
        </h2>
        <Link to="/courses" className="text-[12px] font-bold text-amber-700 hover:text-amber-800">
          View All
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 w-40 shrink-0 rounded-2xl bg-amber-50/40 animate-pulse" />
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
          <p className="text-[12px] text-neutral-500 mt-1">Pick up to 12 courses to tailor your study.</p>
          <span className="inline-flex mt-3 items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 text-white text-[12px] font-bold">
            Select Courses
          </span>
        </Link>
      ) : (
        <div className="-mx-4 px-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex gap-3 pb-1">
            {courses.map((c, i) => {
              const color = RING_COLORS[i % RING_COLORS.length];
              const progress = Math.min(100, Math.round(((c.unread_updates || 0) > 0 ? 40 : 70) + (i % 3) * 10));
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="snap-start"
                >
                  <Link
                    to={`/courses/${c.id}`}
                    className="block w-40 rounded-2xl border border-amber-100 bg-white p-4 hover:border-amber-300 hover:shadow-sm transition"
                  >
                    <div className="flex justify-center mb-3">
                      <ProgressRing value={progress} color={color} />
                    </div>
                    <p className="font-display text-[13px] font-extrabold text-center text-neutral-900 tracking-tight truncate">
                      {c.code}
                    </p>
                    <p className="text-[11.5px] text-neutral-500 text-center mt-0.5 line-clamp-2 leading-tight">
                      {c.name}
                    </p>
                  </Link>
                </motion.div>
              );
            })}
            <div className="snap-start">
              {atLimit ? (
                <div
                  aria-disabled
                  title="Maximum course limit reached."
                  className="w-40 min-h-[176px] rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/60 p-4 flex flex-col items-center justify-center text-center opacity-70"
                >
                  <Plus className="w-5 h-5 text-neutral-400 mb-2" />
                  <p className="text-[11.5px] font-bold text-neutral-500 leading-tight">
                    Maximum 12 courses reached
                  </p>
                </div>
              ) : (
                <Link
                  to="/courses"
                  className="w-40 min-h-[176px] rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-4 flex flex-col items-center justify-center text-center hover:bg-amber-50/70 transition"
                >
                  <div className="h-9 w-9 rounded-full bg-white border border-amber-200 flex items-center justify-center mb-2">
                    <Plus className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="font-display text-[12.5px] font-bold text-amber-800">Add Course</p>
                  <p className="text-[10.5px] text-neutral-500 mt-1 leading-tight">Select up to 12 courses</p>
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
