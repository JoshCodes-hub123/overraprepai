import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import {
  MessageSquare, Plus, Send, ArrowLeft,
  Loader2, MessageCircle, Calendar, User
} from "lucide-react";
import logo from "@/assets/logo.png";
import { SkeletonListItem } from "@/components/ui/premium-skeletons";
import { formatDistanceToNow } from "date-fns";

interface Discussion {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  content: string;
  created_at: string;
  author?: {
    full_name: string;
    profile_image_url: string | null;
  };
  course?: {
    code: string;
    name: string;
  };
  reply_count?: number;
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author?: {
    full_name: string;
    profile_image_url: string | null;
  };
}

const Community = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, hasRole } = useAuth();
  const canStartDiscussion = hasRole("tutor") || hasRole("admin");
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCourseId, setNewCourseId] = useState<string>("general");
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedDiscussion) {
      fetchReplies(selectedDiscussion.id);
    }
  }, [selectedDiscussion]);

  // Real-time subscription for new discussions and replies
  useEffect(() => {
    const discussionChannel = supabase
      .channel("discussions-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "discussions" },
        () => fetchDiscussions()
      )
      .subscribe();

    const replyChannel = supabase
      .channel("replies-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "discussion_replies" },
        (payload) => {
          if (selectedDiscussion && payload.new.discussion_id === selectedDiscussion.id) {
            fetchReplies(selectedDiscussion.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(discussionChannel);
      supabase.removeChannel(replyChannel);
    };
  }, [selectedDiscussion]);

  const fetchData = async () => {
    await Promise.all([fetchDiscussions(), fetchCourses()]);
    setIsLoading(false);
  };

  const fetchCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code");
    if (data) setCourses(data);
  };

  const fetchDiscussions = async () => {
    const { data } = await supabase
      .from("discussions")
      .select("*, courses(code, name)")
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch authors and reply counts
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_image_url")
        .in("id", userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);

      // Fetch reply counts
      const discussionIds = data.map(d => d.id);
      const { data: replyCounts } = await supabase
        .from("discussion_replies")
        .select("discussion_id")
        .in("discussion_id", discussionIds);

      const replyCountMap: Record<string, number> = {};
      (replyCounts || []).forEach(r => {
        replyCountMap[r.discussion_id] = (replyCountMap[r.discussion_id] || 0) + 1;
      });

      setDiscussions(data.map(d => ({
        ...d,
        course: d.courses,
        author: profileMap[d.user_id],
        reply_count: replyCountMap[d.id] || 0
      })));
    }
  };

  const fetchReplies = async (discussionId: string) => {
    const { data } = await supabase
      .from("discussion_replies")
      .select("*")
      .eq("discussion_id", discussionId)
      .order("created_at", { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_image_url")
        .in("id", userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);

      setReplies(data.map(r => ({
        ...r,
        author: profileMap[r.user_id]
      })));
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from("discussions").insert({
        user_id: user!.id,
        title: newTitle.trim(),
        content: newContent.trim(),
        course_id: newCourseId === "general" ? null : newCourseId
      });

      if (error) throw error;

      toast.success("Discussion created!");
      setShowNewDialog(false);
      setNewTitle("");
      setNewContent("");
      setNewCourseId("general");
      fetchDiscussions();
    } catch (error) {
      toast.error("Failed to create discussion");
    } finally {
      setIsCreating(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedDiscussion) return;

    setIsReplying(true);
    try {
      const { error } = await supabase.from("discussion_replies").insert({
        discussion_id: selectedDiscussion.id,
        user_id: user!.id,
        content: replyContent.trim()
      });

      if (error) throw error;

      setReplyContent("");
      fetchReplies(selectedDiscussion.id);
    } catch (error) {
      toast.error("Failed to post reply");
    } finally {
      setIsReplying(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-3 max-w-3xl mx-auto">
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Community - OverraPrep AI"
        description="Connect with fellow students, ask questions, and share knowledge."
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/student/dashboard" className="flex items-center gap-2 group">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                <img 
                  src={logo} 
                  alt="OverraPrep AI FUTA" 
                  className="h-10 w-auto object-contain"
                />
                <span className="font-display font-bold text-lg text-foreground">
                  Community
                </span>
              </Link>

              {canStartDiscussion && (
              <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Discussion
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start a Discussion</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <Select value={newCourseId} onValueChange={setNewCourseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        {courses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Discussion title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="What would you like to discuss?"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={4}
                    />
                    <Button onClick={handleCreateDiscussion} disabled={isCreating} className="w-full">
                      {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Post Discussion
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Discussion List */}
            <div className={`lg:col-span-1 space-y-3 ${selectedDiscussion ? "hidden lg:block" : ""}`}>
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                Recent Discussions
              </h2>
              {discussions.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No discussions yet</p>
                  <p className="text-sm text-muted-foreground">Be the first to start one!</p>
                </div>
              ) : (
                discussions.map(d => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDiscussion(d)}
                    className={`p-4 bg-card rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                      selectedDiscussion?.id === d.id ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={d.author?.profile_image_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {d.author?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{d.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{d.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {d.author?.full_name || "Anonymous"}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {d.reply_count}
                          </span>
                          {d.course && (
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {d.course.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discussion Detail */}
            <div className={`lg:col-span-2 ${!selectedDiscussion ? "hidden lg:flex lg:items-center lg:justify-center" : ""}`}>
              {selectedDiscussion ? (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setSelectedDiscussion(null)}
                    className="lg:hidden w-full p-3 border-b border-border flex items-center gap-2 text-muted-foreground"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to discussions
                  </button>

                  {/* Discussion header */}
                  <div className="p-6 border-b border-border">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={selectedDiscussion.author?.profile_image_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {selectedDiscussion.author?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h2 className="font-display text-xl font-bold text-foreground">
                          {selectedDiscussion.title}
                        </h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{selectedDiscussion.author?.full_name || "Anonymous"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(selectedDiscussion.created_at), { addSuffix: true })}
                          </span>
                          {selectedDiscussion.course && (
                            <>
                              <span>•</span>
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                                {selectedDiscussion.course.code}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="mt-4 text-foreground whitespace-pre-wrap">
                          {selectedDiscussion.content}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                    <h3 className="font-semibold text-foreground">
                      {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
                    </h3>
                    {replies.map(reply => (
                      <div key={reply.id} className="flex gap-3 p-4 bg-muted/30 rounded-lg">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={reply.author?.profile_image_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {reply.author?.full_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground text-sm">
                              {reply.author?.full_name || "Anonymous"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-1">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply input */}
                  <div className="p-4 border-t border-border flex gap-2">
                    <Input
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                    />
                    <Button onClick={handleReply} disabled={isReplying || !replyContent.trim()}>
                      {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a discussion to view</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Community;
