import {
  BookOpen, Layers, Sparkles, Library, LifeBuoy, Headphones,
  MessageSquare, FileText, History, Compass, FolderOpen, Brain,
} from "lucide-react";
import HubPage from "@/components/hub/HubPage";

const StudyHubPage = () => (
  <HubPage
    eyebrow="Study"
    title="Everything to learn"
    intro="Your courses, materials, AI tutor, and audio lessons — all in one calm place."
    sections={[
      {
        title: "Start here",
        tiles: [
          { to: "/learn", label: "Study Pack AI", description: "Turn any material into a smart pack", icon: Sparkles, accent: true },
          { to: "/courses", label: "My Courses", description: "Continue where you left off", icon: BookOpen, accent: true },
        ],
      },
      {
        title: "Materials & resources",
        tiles: [
          { to: "/study-hub", label: "Study Hub", description: "Past questions & summaries", icon: Library },
          { to: "/library", label: "My Library", description: "Your uploads & resources", icon: FolderOpen },
          { to: "/theory", label: "Theory Prep", description: "Long-answer practice", icon: FileText },
          { to: "/survival-kits", label: "Survival Kits", description: "Course rescue packs", icon: LifeBuoy },
        ],
      },
      {
        title: "AI helpers",
        tiles: [
          { to: "/ai-tutor", label: "AI Tutor", description: "Ask anything, anytime", icon: MessageSquare },
          { to: "/audio-learning", label: "Audio Learning", description: "Listen to your notes", icon: Headphones },
          { to: "/flashcards", label: "Flashcards", description: "Quick spaced repetition", icon: Sparkles },
          { to: "/review", label: "Smart Review", description: "What to revise today", icon: Brain },
        ],
      },
      {
        title: "Plan & track",
        tiles: [
          { to: "/strategy", label: "Study Strategy", description: "Build your study plan", icon: Compass },
          { to: "/ai-history", label: "AI History", description: "Past AI conversations", icon: History },
          { to: "/subjects", label: "Subjects", description: "Browse by subject", icon: Layers },
        ],
      },
    ]}
  />
);

export default StudyHubPage;
