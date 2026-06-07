import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Brain,
  GraduationCap,
  Coins,
  Trophy,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingDialogProps {
  isOpen: boolean;
  onComplete: () => void;
  userRole: "student" | "tutor" | "admin";
  userName?: string;
}

const studentSteps = [
  {
    icon: Sparkles,
    title: "Welcome to OverraPrep AI!",
    description:
      "Your AI exam prep companion. Practice quizzes, get instant explanations, and track your progress — all in one place.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Brain,
    title: "How it works",
    description:
      "You get 3 free AI actions every day. Use them for smart explanations, summaries, and AI tutor chats. Need more? Top up your wallet anytime.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

const tutorSteps = [
  {
    icon: Sparkles,
    title: "Welcome, Tutor!",
    description:
      "Congratulations on becoming a verified tutor! You can now create and monetize quiz content. Here's how it works.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: BookOpen,
    title: "Create Courses & Topics",
    description:
      "Organize your content by creating courses and topics. This helps students find exactly what they need to study.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Brain,
    title: "Upload Questions",
    description:
      "Add quiz questions with multiple choice options, correct answers, and detailed explanations to help students learn.",
    color: "text-secondary-foreground",
    bgColor: "bg-secondary",
  },
  {
    icon: Coins,
    title: "Earn Tokens",
    description:
      "Set prices for your quizzes. When students purchase your content, you earn tokens that can be withdrawn as real money.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Trophy,
    title: "Track Performance",
    description:
      "Monitor your earnings, see how many students use your quizzes, and improve your content based on ratings.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

const adminSteps = [
  {
    icon: Sparkles,
    title: "Admin Dashboard",
    description:
      "Welcome to the admin panel! You have full control over the platform. Let's walk through your capabilities.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: GraduationCap,
    title: "Tutor Applications",
    description:
      "Review and approve tutor applications. Only verified tutors can create and sell quiz content.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: BookOpen,
    title: "Content Moderation",
    description:
      "Review courses, topics, and questions. Ensure quality and appropriateness of all educational content.",
    color: "text-secondary-foreground",
    bgColor: "bg-secondary",
  },
  {
    icon: Coins,
    title: "Token Management",
    description:
      "Process token purchase requests and tutor withdrawal requests. Manage the platform's economy.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

export const OnboardingDialog = ({
  isOpen,
  onComplete,
  userRole,
  userName,
}: OnboardingDialogProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps =
    userRole === "admin"
      ? adminSteps
      : userRole === "tutor"
      ? tutorSteps
      : studentSteps;

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader className="sr-only">
          <DialogTitle>Onboarding</DialogTitle>
        </DialogHeader>
        
        {/* Progress */}
        <div className="space-y-2 mb-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Content */}
        <div className="py-6 text-center">
          <div
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300",
              currentStepData.bgColor
            )}
          >
            <Icon className={cn("w-10 h-10", currentStepData.color)} />
          </div>

          {currentStep === 0 && userName && (
            <p className="text-muted-foreground text-sm mb-2">
              Hi, {userName}!
            </p>
          )}

          <h2 className="font-display text-xl font-bold text-foreground mb-3">
            {currentStepData.title}
          </h2>

          <p className="text-muted-foreground leading-relaxed">
            {currentStepData.description}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentStep
                  ? "w-6 bg-primary"
                  : index < currentStep
                  ? "bg-primary/50"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1">
            {isLastStep ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
