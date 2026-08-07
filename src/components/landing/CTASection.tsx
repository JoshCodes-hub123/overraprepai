import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Zap, Clock, Shield, GraduationCap, School } from "lucide-react";
import TutorApplicationDialog from "./TutorApplicationDialog";

const benefits = [
  { icon: Zap, text: "Instant AI explanations" },
  { icon: Clock, text: "Practice anytime, anywhere" },
  { icon: Shield, text: "Verified by expert tutors" },
];

const CTASection = () => {
  const navigate = useNavigate();
  const [showTutorDialog, setShowTutorDialog] = useState(false);

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-blob-delayed" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card rounded-3xl p-8 md:p-12 lg:p-16 text-center relative overflow-hidden">
            {/* Gold border accent */}
            <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-br from-primary/40 via-transparent to-primary/20 -z-10" />
            
            <p className="text-primary font-medium text-sm tracking-[0.15em] uppercase mb-6">Start Your Journey</p>
            
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
              Ready to Ace Your{" "}
              <span className="text-gradient-primary">CBT Exams?</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of FUTA students who are already preparing smarter with AI-powered 
              practice questions and personalized learning paths.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {benefits.map((benefit, i) => (
                <div key={i} className="inline-flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-full px-4 py-2">
                  <benefit.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{benefit.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="hero" 
                size="xl" 
                className="group shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                onClick={() => navigate("/start")}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="hero-outline" 
                size="xl"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              {["No credit card required", "Free forever plan", "Cancel anytime"].map((text, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>{text}</span>
                  {i < 2 && <div className="h-4 w-px bg-border hidden sm:block ml-4" />}
                </div>
              ))}
            </div>
          </div>

          {/* Partner CTAs — Tutor + School */}
          <div className="grid md:grid-cols-2 gap-5 mt-10">
            <button
              onClick={() => setShowTutorDialog(true)}
              className="group text-left p-6 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-lg mb-1">Become a Tutor</h3>
                  <p className="text-sm text-muted-foreground mb-3">Share your expertise, build a following and earn — admin-vetted for quality.</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Apply now <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/school/register")}
              className="group text-left p-6 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 via-card to-card hover:border-accent/50 hover:shadow-xl hover:shadow-accent/10 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <School className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-lg mb-1">Register your School</h3>
                  <p className="text-sm text-muted-foreground mb-3">Manage classes, attendance, results and fees — verified by admin.</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    Get started <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
