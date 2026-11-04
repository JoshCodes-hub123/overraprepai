import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageSquare, X, ArrowRight, BookOpen, Brain, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const StudyPulseOrb: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-16 right-0 w-80 sm:w-96 rounded-3xl bg-card border border-primary/30 p-5 shadow-2xl shadow-primary/20 backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-foreground">Overra AI Study Pulse</h4>
                  <p className="text-[11px] text-muted-foreground">Your 24/7 Academic Partner</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-full hover:bg-muted/50 text-muted-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/student/coach");
                }}
                className="w-full text-left p-3 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border/60 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Ask AI Study Coach</div>
                    <div className="text-[11px] text-muted-foreground">Get instant explanations & weak area drills</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/student/study-mode");
                }}
                className="w-full text-left p-3 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border/60 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Launch CBT Drill</div>
                    <div className="text-[11px] text-muted-foreground">Simulate timed university exam questions</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition" />
              </button>
            </div>

            <div className="pt-2 border-t border-border/50 text-center">
              <span className="text-[10px] text-muted-foreground">
                Powered by Overra AI Engine • Syllabus Aligned
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="relative group flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-primary to-amber-500 text-primary-foreground font-display font-bold shadow-xl shadow-primary/30 border border-primary/40 hover:shadow-2xl transition"
        aria-label="Study Pulse AI"
      >
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
        <Sparkles className="w-5 h-5 text-primary-foreground animate-spin-slow" />
        <span className="hidden sm:inline text-xs tracking-wide">Study AI</span>
      </motion.button>
    </div>
  );
};
