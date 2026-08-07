import { Brain, Clock, BarChart3, Sparkles, BookOpen, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  { icon: Brain, title: "AI-Powered Explanations", description: "Get instant, detailed explanations for every question. Our AI breaks down complex concepts into easy-to-understand steps." },
  { icon: Clock, title: "CBT Simulation Mode", description: "Practice under real exam conditions with timed tests that mirror the actual CBT environment you'll face." },
  { icon: BarChart3, title: "Performance Analytics", description: "Track your progress with detailed analytics. Identify weak areas and focus your study time effectively." },
  { icon: BookOpen, title: "Extensive Question Bank", description: "Access thousands of past questions and probable questions across all FUTA courses and departments." },
  { icon: Sparkles, title: "Smart Recommendations", description: "Our AI learns your strengths and weaknesses to recommend the most effective practice questions for you." },
  { icon: Shield, title: "Verified Content", description: "All questions are curated and verified by expert tutors to ensure accuracy and relevance to your exams." },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const FeaturesSection = () => {
  const navigate = useNavigate();

  return (
    <section id="features" className="py-20 lg:py-28 relative overflow-hidden scroll-mt-20" aria-labelledby="features-heading">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-primary font-medium text-sm tracking-[0.15em] uppercase mb-4">Powerful Features</p>
          <h2 id="features-heading" className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
            Everything You Need to{" "}
            <span className="text-gradient-primary">Excel</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Our platform combines cutting-edge AI technology with comprehensive study materials 
            to give you the best exam preparation experience.
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                className="group glass-card glass-card-hover rounded-2xl p-6 lg:p-8"
                variants={cardVariants}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-14 h-14 mb-6 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div 
          className="mt-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            variant="hero" 
            size="lg" 
            className="group"
            onClick={() => navigate("/start")}
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
