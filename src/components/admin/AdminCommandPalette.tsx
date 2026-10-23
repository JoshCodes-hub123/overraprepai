import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  BarChart3,
  TrendingUp,
  Users,
  GraduationCap,
  Coins,
  Banknote,
  BookOpen,
  FileText,
  Settings,
  Building2,
  Target,
  Shield,
  Activity,
  Megaphone,
  Upload,
  School,
  Search,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UNIVERSITY_LIST, UniversityCode } from "@/config/universities";
import { useAdminEnvironment } from "@/hooks/useAdminEnvironment";
import { Badge } from "@/components/ui/badge";

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTab?: (tabKey: string) => void;
}

interface ProfileSearchResult {
  id: string;
  full_name: string | null;
  email: string | null;
  role?: string | null;
  university?: string | null;
}

interface CourseSearchResult {
  id: string;
  code: string;
  name: string;
  university?: string | null;
  department?: string | null;
}

export const AdminCommandPalette: React.FC<AdminCommandPaletteProps> = ({
  open,
  onOpenChange,
  onSelectTab,
}) => {
  const navigate = useNavigate();
  const adminEnv = useAdminEnvironment();
  const [query, setQuery] = useState("");
  const [profileResults, setProfileResults] = useState<ProfileSearchResult[]>([]);
  const [courseResults, setCourseResults] = useState<CourseSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Global Keyboard Listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Debounced search for profiles and courses when query is typed
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setProfileResults([]);
      setCourseResults([]);
      return;
    }

    let active = true;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const cleanQ = query.trim();

        // 1. Search profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, university")
          .or(`full_name.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%`)
          .limit(5);

        // 2. Search courses
        const { data: courses } = await supabase
          .from("courses")
          .select("id, code, name, university, department")
          .or(`code.ilike.%${cleanQ}%,name.ilike.%${cleanQ}%`)
          .limit(5);

        if (active) {
          setProfileResults((profiles as any) || []);
          setCourseResults((courses as any) || []);
        }
      } catch (err) {
        console.error("Command palette search error:", err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const runAction = (callback: () => void) => {
    onOpenChange(false);
    setQuery("");
    callback();
  };

  const handleTabSwitch = (tab: string) => {
    runAction(() => {
      if (onSelectTab) {
        onSelectTab(tab);
      } else {
        navigate(`/admin?tab=${tab}`);
      }
    });
  };

  const handleScopeSwitch = (uCode: string) => {
    runAction(() => {
      const match = adminEnv.options.find(
        (o) => o.institution === uCode || o.id === uCode || o.label.includes(uCode)
      );
      if (match) {
        adminEnv.select(match.id);
      }
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command, jump to tab, search users or courses (e.g. CSC 201, FUTA)..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[380px] p-2">
        <CommandEmpty>
          {isSearching ? "Searching platform index…" : "No matching admin actions, users, or courses found."}
        </CommandEmpty>

        {/* Dynamic Database Course Matches */}
        {courseResults.length > 0 && (
          <CommandGroup heading="Courses Found">
            {courseResults.map((c) => (
              <CommandItem
                key={c.id}
                onSelect={() =>
                  runAction(() => {
                    navigate(`/admin/content?course=${c.id}`);
                  })
                }
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="font-mono font-bold text-xs">{c.code}</span>
                    <span className="text-xs text-muted-foreground ml-2">{c.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {c.university && <Badge variant="outline" className="text-[10px] py-0">{c.university}</Badge>}
                  <span>Open Syllabus</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Dynamic Database User Matches */}
        {profileResults.length > 0 && (
          <CommandGroup heading="Users & Tutors">
            {profileResults.map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() =>
                  runAction(() => {
                    handleTabSwitch("users");
                  })
                }
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-medium text-xs text-foreground">{p.full_name || "Unnamed User"}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {p.university && <span>{p.university}</span>}
                  <ArrowRight className="w-3 h-3" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* 1. Instant Tab Switching (Grouped) */}
        <CommandGroup heading="📊 Overview & Analytics">
          <CommandItem onSelect={() => handleTabSwitch("overview")} className="cursor-pointer">
            <BarChart3 className="w-4 h-4 mr-2 text-indigo-500" />
            <span>Platform Analytics</span>
            <CommandShortcut>Analytics</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleTabSwitch("insights")} className="cursor-pointer">
            <TrendingUp className="w-4 h-4 mr-2 text-violet-500" />
            <span>Executive Insights & Cohorts</span>
            <CommandShortcut>Insights</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleTabSwitch("audit")} className="cursor-pointer">
            <Shield className="w-4 h-4 mr-2 text-slate-500" />
            <span>Audit & Compliance Logs</span>
            <CommandShortcut>Audit</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleTabSwitch("health")} className="cursor-pointer">
            <Activity className="w-4 h-4 mr-2 text-rose-500" />
            <span>System Health & Performance</span>
            <CommandShortcut>Health</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="👥 Users & Operations">
          <CommandItem onSelect={() => handleTabSwitch("users")} className="cursor-pointer">
            <Users className="w-4 h-4 mr-2 text-blue-500" />
            <span>Student & User Directory</span>
            <CommandShortcut>Users</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleTabSwitch("tutors")} className="cursor-pointer">
            <GraduationCap className="w-4 h-4 mr-2 text-amber-500" />
            <span>Tutor Management & Approvals</span>
            <CommandShortcut>Tutors</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleTabSwitch("schools")} className="cursor-pointer">
            <Building2 className="w-4 h-4 mr-2 text-emerald-500" />
            <span>School Partner Applications</span>
            <CommandShortcut>Schools</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleTabSwitch("announcements")} className="cursor-pointer">
            <Megaphone className="w-4 h-4 mr-2 text-orange-500" />
            <span>Campus Broadcasts & Announcements</span>
            <CommandShortcut>Announce</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="💳 Finance & Monetization">
          <CommandItem onSelect={() => handleTabSwitch("tokens")} className="cursor-pointer">
            <Coins className="w-4 h-4 mr-2 text-amber-600" />
            <span>Token Purchase Approvals</span>
            <CommandShortcut>Tokens</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleTabSwitch("withdrawals")} className="cursor-pointer">
            <Banknote className="w-4 h-4 mr-2 text-emerald-600" />
            <span>Tutor Withdrawals & Payouts</span>
            <CommandShortcut>Payouts</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleTabSwitch("settings")} className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2 text-neutral-600" />
            <span>Platform Financial & Fee Settings</span>
            <CommandShortcut>Settings</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="📚 Academic & Moderation">
          <CommandItem onSelect={() => handleTabSwitch("courses")} className="cursor-pointer">
            <BookOpen className="w-4 h-4 mr-2 text-blue-600" />
            <span>Course Moderation</span>
            <CommandShortcut>Courses</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleTabSwitch("questions")} className="cursor-pointer">
            <FileText className="w-4 h-4 mr-2 text-rose-500" />
            <span>Question Moderation & CBT Flagged QA</span>
            <CommandShortcut>Questions</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleTabSwitch("challenges")} className="cursor-pointer">
            <Target className="w-4 h-4 mr-2 text-purple-600" />
            <span>Contests & Arena Challenges</span>
            <CommandShortcut>Contests</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Dedicated Admin Portals */}
        <CommandGroup heading="🚀 Dedicated Admin Subportals">
          <CommandItem
            onSelect={() => runAction(() => navigate("/admin/content"))}
            className="cursor-pointer"
          >
            <BookOpen className="w-4 h-4 mr-2 text-amber-600" />
            <span>Content & Syllabi Management Portal</span>
            <CommandShortcut>/admin/content</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runAction(() => navigate("/admin/bulk-upload"))}
            className="cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2 text-emerald-600" />
            <span>Bulk Question Bank Importer (CSV / Word)</span>
            <CommandShortcut>/admin/bulk-upload</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runAction(() => navigate("/admin/arena"))}
            className="cursor-pointer"
          >
            <Target className="w-4 h-4 mr-2 text-violet-600" />
            <span>Challenge Arena Creator</span>
            <CommandShortcut>/admin/arena</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runAction(() => navigate("/admin/growth"))}
            className="cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
            <span>Campus Ambassador & Growth Engine</span>
            <CommandShortcut>/admin/growth</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Campus Scope Fast-Switching */}
        <CommandGroup heading="🏫 Switch Institutional Scope">
          {UNIVERSITY_LIST.slice(0, 6).map((uni) => {
            const isCurrent =
              adminEnv.scope?.university === uni.code ||
              adminEnv.current?.institution === uni.code ||
              adminEnv.current?.id === uni.code;
            return (
              <CommandItem
                key={uni.code}
                onSelect={() => handleScopeSwitch(uni.code)}
                className="cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-amber-600" />
                  <span>
                    Switch to <strong className="font-semibold">{uni.code}</strong> — {uni.name}
                  </span>
                </div>
                {isCurrent && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    Active Scope
                  </Badge>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default AdminCommandPalette;
