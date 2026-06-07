import {
  Target, ClipboardCheck, Zap, BarChart3, Download,
  Sparkles, Calculator,
} from "lucide-react";
import HubPage from "@/components/hub/HubPage";

const PracticeHubPage = () => (
  <HubPage
    eyebrow="Practice"
    title="Get exam-ready"
    intro="Drill weak areas, simulate the real exam, and watch your readiness score rise."
    sections={[
      {
        title: "Today's focus",
        tiles: [
          { to: "/student/readiness", label: "Exam Readiness", description: "Your daily readiness score", icon: Target, accent: true },
          { to: "/student/mastery", label: "Weak Area Drill", description: "Fix what's slipping", icon: BarChart3, accent: true },
        ],
      },
      {
        title: "Take an exam",
        tiles: [
          { to: "/exams", label: "Mock Exams", description: "Full CBT simulation", icon: ClipboardCheck },
          { to: "/student/offline", label: "Offline CBT", description: "Practice without data", icon: Download },
          { to: "/challenges", label: "Daily Challenge", description: "Today's hand-picked drill", icon: Zap },
          { to: "/cgpa", label: "CGPA Calculator", description: "Track your grade goals", icon: Calculator },
        ],
      },
      {
        title: "Results & growth",
        tiles: [
          { to: "/student/smart-summary", label: "Smart Summary", description: "AI study insights", icon: Sparkles },
        ],
      },
    ]}
  />
);

export default PracticeHubPage;
