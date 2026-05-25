import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Upload, ClipboardPaste, Sparkles } from "lucide-react";
import heroImg from "@/assets/study-pack-hero.png";

export const StudyPackHero = () => {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Study Pack AI"
      className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-amber-50/60 to-white shadow-[0_18px_50px_-22px_rgba(180,140,40,0.35)] mb-6"
    >
      <div className="pointer-events-none absolute -top-20 -right-10 w-72 h-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-amber-100/60 blur-3xl" />

      <div className="relative grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-3 sm:gap-4 p-5 sm:p-7 items-center">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold tracking-[0.18em] uppercase text-amber-700">
            <Sparkles className="w-3.5 h-3.5" /> AI Powered
          </p>
          <h2 className="font-display text-[26px] sm:text-3xl md:text-[34px] font-bold leading-tight tracking-tight text-foreground mt-1">
            Study Pack AI <span className="text-amber-500">✨</span>
          </h2>
          <p className="text-sm sm:text-[15px] text-muted-foreground mt-1.5 leading-snug max-w-[28ch]">
            Turn your notes into summaries, quizzes, flashcards and audio instantly.
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/study-hub?upload=1")}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white font-semibold text-sm shadow-[0_8px_22px_-8px_rgba(180,140,40,0.65)] hover:shadow-[0_12px_28px_-8px_rgba(180,140,40,0.75)] active:scale-[0.97] transition-all"
            >
              <Upload className="w-4 h-4" /> Upload Document
            </button>
            <button
              type="button"
              onClick={() => navigate("/study-hub?paste=1")}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border-2 border-amber-300 bg-white text-amber-800 font-semibold text-sm hover:bg-amber-50 active:scale-[0.97] transition-all"
            >
              <ClipboardPaste className="w-4 h-4" /> Paste Notes
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center sm:justify-end">
          <img
            src={heroImg}
            alt="Study Pack AI illustration"
            width={1024}
            height={1024}
            loading="lazy"
            className="w-44 sm:w-56 md:w-64 h-auto object-contain drop-shadow-[0_18px_28px_rgba(180,140,40,0.25)] select-none"
            draggable={false}
          />
        </div>
      </div>
    </motion.section>
  );
};

export default StudyPackHero;
