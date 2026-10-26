import {
  Users, GraduationCap, Trophy, MessageCircle, Video,
  HelpCircle, Newspaper, Star, Megaphone, Sparkles, Heart,
} from "lucide-react";
import HubPage from "@/components/hub/HubPage";

const PeopleHubPage = () => (
  <HubPage
    eyebrow="People"
    title="Learn with others"
    intro="Tutors, classmates, and the wider OverraPrep community — all in one tap."
    sections={[
      {
        title: "Connect",
        tiles: [
          { to: "/community", label: "Community", description: "Groups & class chats", icon: Users, accent: true },
          { to: "/tutors", label: "Find a Tutor", description: "Verified tutors near you", icon: GraduationCap, accent: true },
        ],
      },
      {
        title: "Talk & share",
        tiles: [
          { to: "/chat", label: "Messages", description: "Direct chats", icon: MessageCircle },
          { to: "/feed", label: "Feed", description: "Posts from students", icon: Newspaper },
          { to: "/qa", label: "Q&A Board", description: "Ask anything", icon: HelpCircle },
          { to: "/sessions", label: "Live Sessions", description: "Join a class", icon: Video },
        ],
      },
      {
        title: "Discover",
        tiles: [
          { to: "/leaderboard", label: "Global Rankings", description: "Compare streaks & quiz progress", icon: Trophy, accent: true },
          { to: "/spotlight", label: "Student Spotlight", description: "Stories worth sharing", icon: Star },
          { to: "/announcements", label: "Announcements", description: "Platform news", icon: Megaphone },
          { to: "/opportunities", label: "Opportunities", description: "Scholarships & internships", icon: Sparkles },
        ],
      },
      {
        title: "More",
        tiles: [
          { to: "/activity", label: "Activity Feed", description: "What friends are doing", icon: Heart },
        ],
      },
    ]}
  />
);

export default PeopleHubPage;
