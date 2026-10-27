import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import studentFemale from "@/assets/student-female.jpg";
import studentMale from "@/assets/student-male.jpg";

const testimonials = [
  { name: "Adebayo Olamide", department: "Computer Science", level: "400 Level", rating: 5, review: "OverraPrep AI transformed my exam preparation. The CBT simulation mode helped me get comfortable with the actual exam format, and I scored much higher than expected!", image: studentMale },
  { name: "Chidinma Eze", department: "Mechanical Engineering", level: "300 Level", rating: 5, review: "The AI explanations are incredibly helpful. Whenever I get a question wrong, I actually understand why. It's like having a personal tutor available 24/7.", image: studentFemale },
  { name: "Tunde Bakare", department: "Electrical Engineering", level: "200 Level", rating: 5, review: "I love how the platform tracks my weak areas. The personalized recommendations helped me focus on topics I was struggling with. Highly recommend!" },
  { name: "Funke Adeyemi", department: "Civil Engineering", level: "500 Level", rating: 5, review: "The tutor-created quizzes are top-notch quality. Worth every token! My grades have improved significantly since I started using OverraPrep." },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } };
const cardVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } } };

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 lg:py-28 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-gradient-mesh opacity-20" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center mb-12 lg:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-primary font-medium text-sm tracking-[0.15em] uppercase mb-4">Testimonials</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            What Our Students <span className="text-gradient-primary">Say</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of FUTA students who have improved their exam performance
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div 
              key={index} 
              className="group glass-card glass-card-hover rounded-2xl p-6 lg:p-8 relative overflow-hidden"
              variants={cardVariants}
              whileHover={{ y: -4 }}
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/10 group-hover:text-primary/20 transition-colors" />
              
              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < testimonial.rating ? "fill-primary text-primary" : "text-muted"}`} />
                ))}
              </div>

              <p className="text-foreground mb-6 leading-relaxed italic">"{testimonial.review}"</p>

              <div className="flex items-center gap-3">
                <Avatar className="w-11 h-11 ring-2 ring-primary/20">
                  {testimonial.image && <AvatarImage src={testimonial.image} alt={testimonial.name} className="object-cover" />}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {testimonial.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-display font-bold text-foreground text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.department} • {testimonial.level}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="mt-14 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="inline-flex items-center gap-4 px-6 py-3 glass-card rounded-full">
            <div className="flex -space-x-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
            </div>
            <span className="font-bold text-foreground text-sm">4.9/5</span>
            <span className="text-muted-foreground text-sm">from 1,000+ reviews</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
