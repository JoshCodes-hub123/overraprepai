import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
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
            <Sparkles className="w-3.5 h-3.5" /> Your AI Study Buddy
          </p>
          <h2 className="font-display text-[24px] sm:text-[30px] md:text-[34px] font-bold leading-[1.15] tracking-tight text-foreground mt-1.5">
            What do you want to study today?
          </h2>
          <p className="text-[13.5px] sm:text-[15px] text-muted-foreground mt-2 leading-snug max-w-[30ch]">
            Drop your notes — get a summary, quiz, flashcards and audio in seconds.
          </p>

          <div className="mt-4 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/study-hub?upload=1")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-[15px] shadow-[0_10px_24px_-8px_rgba(180,140,40,0.65)] hover:shadow-[0_14px_30px_-8px_rgba(180,140,40,0.75)] active:scale-[0.97] transition-all"
            >
              Start studying <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/study-hub?paste=1")}
              className="text-amber-800 font-semibold text-[13px] underline-offset-4 hover:underline px-2 py-2 active:scale-[0.97] transition-all"
            >
              or paste notes
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
            className="w-36 sm:w-52 md:w-64 h-auto object-contain drop-shadow-[0_18px_28px_rgba(180,140,40,0.25)] select-none"
            draggable={false}
          />
        </div>
      </div>
    </motion.section>
  );
};

export default StudyPackHero;
