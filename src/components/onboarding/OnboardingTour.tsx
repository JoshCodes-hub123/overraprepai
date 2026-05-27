import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Trophy, 
  Users, 
  Brain,
  Sparkles,
  GraduationCap
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "center" | "top" | "bottom";
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to OverraPrep AI! 🎉",
    description: "Your AI-powered exam preparation companion. Let's take a quick tour to help you get started.",
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    position: "center",
  },
  {
    id: "quizzes",
    title: "Practice Quizzes",
    description: "Access hundreds of course-specific quizzes created by verified tutors. Practice in CBT simulation mode for real exam experience.",
    icon: <BookOpen className="h-8 w-8 text-primary" />,
    position: "center",
  },
  {
    id: "ai-explanations",
    title: "AI-Powered Explanations",
    description: "Don't just memorize answers! Get detailed AI explanations for every question to truly understand the concepts.",
    icon: <Brain className="h-8 w-8 text-primary" />,
    position: "center",
  },
  {
    id: "leaderboard",
    title: "Compete & Earn",
    description: "Join the leaderboard, earn achievements, and compete with fellow students. Build study streaks to stay motivated!",
    icon: <Trophy className="h-8 w-8 text-primary" />,
    position: "center",
  },
  {
    id: "community",
    title: "Join Study Communities",
    description: "Connect with tutors and fellow students. Get announcements, share resources, and study together.",
    icon: <Users className="h-8 w-8 text-primary" />,
    position: "center",
  },
  {
    id: "ready",
    title: "You're All Set! 🚀",
    description: "Start exploring quizzes, join a community, and ace your exams. Good luck with your studies!",
    icon: <GraduationCap className="h-8 w-8 text-primary" />,
    position: "center",
  },
];

const TOUR_STORAGE_KEY = "overraprep_tour_completed";

export const OnboardingTour = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if tour was already completed
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!tourCompleted) {
      // Delay showing tour to allow page to load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsVisible(false);
    // After the tour, send the student to the course picker so the
    // "Get Started" CTA actually starts something instead of dismissing.
    try {
      const onPublicPage =
        window.location.pathname === "/" ||
        window.location.pathname.startsWith("/website") ||
        window.location.pathname.startsWith("/auth");
      if (!onPublicPage) navigate("/courses");
    } catch {
      /* no-op */
    }
  };

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleSkip}
        />

        {/* Tour Card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <Card className="p-6 bg-card/95 backdrop-blur-md border-primary/20 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="Skip tour"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Step Content */}
            <div className="text-center space-y-4">
              {/* Icon with animated ring */}
              <div className="relative inline-flex items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full bg-primary/20"
                  style={{ width: 80, height: 80, margin: "auto" }}
                />
                <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  {step.icon}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-foreground">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>

              {/* Progress Dots */}
              <div className="flex items-center justify-center gap-2 py-2">
                {tourSteps.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentStep 
                        ? "w-6 bg-primary" 
                        : index < currentStep 
                        ? "w-2 bg-primary/50" 
                        : "w-2 bg-muted"
                    }`}
                    animate={index === currentStep ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>

                <span className="text-xs text-muted-foreground">
                  {currentStep + 1} of {tourSteps.length}
                </span>

                <Button
                  size="sm"
                  onClick={handleNext}
                  className="gap-1"
                >
                  {isLastStep ? "Get Started" : "Next"}
                  {!isLastStep && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>

              {/* Skip Link */}
              {!isLastStep && (
                <button
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                >
                  Skip tour
                </button>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
