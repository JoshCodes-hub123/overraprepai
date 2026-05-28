import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  GraduationCap,
  Loader2,
  ChevronDown,
  ChevronUp,
  Phone,
  Building,
  BookMarked,
  FileText,
  ExternalLink,
  ListChecks,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { sendNotification } from "@/hooks/useSendNotification";
import { useAuditLog } from "@/hooks/useAuditLog";
import { getSignedApplicationUrl } from "@/lib/applicationUploads";

interface TutorQuiz {
  id: string;
  title: string;
  question_count: number | null;
  is_active: boolean | null;
  created_at: string;
}

function TutorQuizzesDialog({
  open,
  onOpenChange,
  tutorId,
  tutorName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tutorId: string | null;
  tutorName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<TutorQuiz[]>([]);
  useEffect(() => {
    if (!open || !tutorId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, question_count, is_active, created_at")
        .eq("tutor_id", tutorId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) {
        setQuizzes((data ?? []) as TutorQuiz[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, tutorId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Uploaded quizzes</DialogTitle>
          <DialogDescription>
            Content published by {tutorName}.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No quizzes uploaded yet.</p>
        ) : (
          <ul className="space-y-2 mt-2">
            {quizzes.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-card">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{q.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.question_count ?? 0} questions · {q.is_active ? "active" : "draft"} ·{" "}
                    {new Date(q.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to={`/quiz/preview/${q.id}`}
                  className="shrink-0 text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Open <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

const openSignedDoc = async (pathOrUrl: string) => {
  const url = await getSignedApplicationUrl(pathOrUrl);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
};

interface TutorApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  qualifications: string;
  experience: string;
  courses_to_teach: string;
  bio: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  profile_image_url: string | null;
  // New detailed fields
  phone?: string | null;
  gov_id_url?: string | null;
  highest_qualification?: string | null;
  institution?: string | null;
  certificate_url?: string | null;
  subjects_taught?: string[] | null;
  years_experience?: number | null;
  current_position?: string | null;
  why_join?: string | null;
  sample_question_1?: string | null;
  sample_question_2?: string | null;
  sample_question_3?: string | null;
  sample_explanation?: string | null;
  sample_video_url?: string | null;
  specialization?: string | null;
}

const TutorApplications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { logAction } = useAuditLog();
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && !hasRole("admin")) {
      navigate("/dashboard");
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this page.",
      });
    }
  }, [user, authLoading, hasRole, navigate, toast]);

  useEffect(() => {
    const fetchApplications = async () => {
      const { data, error } = await supabase
        .from("tutor_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching applications:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load applications.",
        });
      } else {
        setApplications(data as TutorApplication[]);
      }
      setIsLoading(false);
    };

    if (user && hasRole("admin")) {
      fetchApplications();
    }
  }, [user, hasRole, toast]);

  const handleApprove = async (application: TutorApplication) => {
    setProcessingId(application.id);

    // Update application status
    const { error: updateError } = await supabase
      .from("tutor_applications")
      .update({
        status: "approved",
        admin_notes: adminNotes[application.id] || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (updateError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve application.",
      });
      setProcessingId(null);
      return;
    }

    // Add tutor role to user
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: application.user_id,
        role: "tutor",
      });

    if (roleError && !roleError.message.includes("duplicate")) {
      console.error("Error adding role:", roleError);
    }

    // Update profile with tutor image if provided
    if (application.profile_image_url) {
      await supabase
        .from("profiles")
        .update({ profile_image_url: application.profile_image_url })
        .eq("id", application.user_id);
    }

    // Get tutor code for the email
    const { data: profile } = await supabase
      .from("profiles")
      .select("tutor_code")
      .eq("id", application.user_id)
      .single();

    // Log audit action
    await logAction({
      action: "approve",
      tableName: "tutor_applications",
      recordId: application.id,
      oldData: { status: "pending" },
      newData: { status: "approved", admin_notes: adminNotes[application.id] || null },
    });

    // Send approval email notification
    await sendNotification({
      type: "application_approved",
      to: application.email,
      userId: application.user_id,
      data: {
        name: application.full_name,
        tutorCode: profile?.tutor_code,
        dashboardUrl: `${window.location.origin}/dashboard`,
      },
    });

    // Update local state
    setApplications(apps =>
      apps.map(app =>
        app.id === application.id
          ? { ...app, status: "approved" as const, admin_notes: adminNotes[application.id] || null }
          : app
      )
    );

    toast({
      title: "Application Approved",
      description: `${application.full_name} is now a tutor. Email notification sent.`,
    });
    
    setProcessingId(null);
  };

  const handleReject = async (application: TutorApplication) => {
    if (!adminNotes[application.id]) {
      toast({
        variant: "destructive",
        title: "Notes Required",
        description: "Please provide a reason for rejection.",
      });
      return;
    }

    setProcessingId(application.id);

    const { error } = await supabase
      .from("tutor_applications")
      .update({
        status: "rejected",
        admin_notes: adminNotes[application.id],
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject application.",
      });
    } else {
      // Log audit action
      await logAction({
        action: "reject",
        tableName: "tutor_applications",
        recordId: application.id,
        oldData: { status: "pending" },
        newData: { status: "rejected", admin_notes: adminNotes[application.id] },
      });

      // Send rejection email notification
      await sendNotification({
        type: "application_rejected",
        to: application.email,
        userId: application.user_id,
        data: {
          name: application.full_name,
          adminNotes: adminNotes[application.id],
        },
      });

      setApplications(apps =>
        apps.map(app =>
          app.id === application.id
            ? { ...app, status: "rejected" as const, admin_notes: adminNotes[application.id] }
            : app
        )
      );
      toast({
        title: "Application Rejected",
        description: "Email notification sent to the applicant.",
      });
    }
    
    setProcessingId(null);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingApplications = applications.filter(a => a.status === "pending");
  const reviewedApplications = applications.filter(a => a.status !== "pending");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>

            <a href="/" className="flex items-center group">
              <img 
                src={logo} 
                alt="OverraPrep AI FUTA" 
                className="h-10 w-auto object-contain"
              />
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Tutor Applications
          </h1>
          <p className="text-muted-foreground">
            Review and manage tutor applications
          </p>
        </div>

        {/* Pending Applications */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Pending Applications ({pendingApplications.length})
          </h2>
          
          {pendingApplications.length === 0 ? (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No pending applications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApplications.map((application) => (
                <div
                  key={application.id}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  {/* Header */}
                  <button
                    onClick={() => setExpandedId(expandedId === application.id ? null : application.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14 border-2 border-primary/20">
                        <AvatarImage src={application.profile_image_url || undefined} alt={application.full_name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(application.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground">{application.full_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {application.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(application.created_at).toLocaleDateString()}
                      </span>
                      {expandedId === application.id ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedId === application.id && (
                    <div className="border-t border-border p-6 space-y-5">
                      {/* Profile Image Large View */}
                      {application.profile_image_url && (
                        <div className="flex justify-center mb-4">
                          <img 
                            src={application.profile_image_url} 
                            alt={application.full_name}
                            className="w-32 h-32 rounded-full object-cover border-4 border-primary/20 shadow-lg"
                          />
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                            <GraduationCap className="w-4 h-4" />
                            Qualifications
                          </div>
                          <p className="text-foreground text-sm whitespace-pre-wrap">{application.qualifications}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                            <FileText className="w-4 h-4" />
                            Experience
                          </div>
                          <p className="text-foreground text-sm whitespace-pre-wrap">{application.experience}</p>
                        </div>
                      </div>
                      
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                          <BookMarked className="w-4 h-4" />
                          Courses to Teach
                        </div>
                        <p className="text-foreground text-sm">{application.courses_to_teach}</p>
                      </div>

                      {application.bio && (
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                            <User className="w-4 h-4" />
                            Bio
                          </div>
                          <p className="text-foreground text-sm">{application.bio}</p>
                        </div>
                      )}

                      {/* Detailed verification fields */}
                      <div className="grid md:grid-cols-2 gap-3 text-xs">
                        {application.phone && <Info label="Phone" value={application.phone} />}
                        {application.specialization && <Info label="Specialization" value={application.specialization} />}
                        {application.highest_qualification && <Info label="Qualification" value={application.highest_qualification} />}
                        {application.institution && <Info label="Institution" value={application.institution} />}
                        {application.years_experience != null && <Info label="Years Experience" value={String(application.years_experience)} />}
                        {application.current_position && <Info label="Current Role" value={application.current_position} />}
                      </div>

                      {application.subjects_taught && application.subjects_taught.length > 0 && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Subjects taught</p>
                          <p className="text-sm">{application.subjects_taught.join(", ")}</p>
                        </div>
                      )}

                      {/* Document links */}
                      {(application.gov_id_url || application.certificate_url) && (
                        <div className="flex flex-wrap gap-2">
                          {application.gov_id_url && (
                            <button type="button" onClick={() => openSignedDoc(application.gov_id_url!)} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              📄 View Government ID
                            </button>
                          )}
                          {application.certificate_url && (
                            <button type="button" onClick={() => openSignedDoc(application.certificate_url!)} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              🎓 View Certificate
                            </button>
                          )}
                          {application.sample_video_url && (
                            <a href={application.sample_video_url} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
                              ▶ Sample video
                            </a>
                          )}
                        </div>
                      )}

                      {application.why_join && (
                        <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Why they want to join</p>
                          <p className="text-sm whitespace-pre-wrap">{application.why_join}</p>
                        </div>
                      )}

                      {(application.sample_question_1 || application.sample_explanation) && (
                        <details className="bg-muted/30 rounded-lg p-3 group">
                          <summary className="text-xs font-medium text-muted-foreground cursor-pointer">
                            View sample work (3 questions + explanation)
                          </summary>
                          <div className="mt-3 space-y-2 text-sm">
                            {application.sample_question_1 && <p><strong>Q1:</strong> {application.sample_question_1}</p>}
                            {application.sample_question_2 && <p><strong>Q2:</strong> {application.sample_question_2}</p>}
                            {application.sample_question_3 && <p><strong>Q3:</strong> {application.sample_question_3}</p>}
                            {application.sample_explanation && (
                              <div className="pt-2 border-t border-border">
                                <p className="font-medium mb-1">Sample Explanation:</p>
                                <p className="whitespace-pre-wrap">{application.sample_explanation}</p>
                              </div>
                            )}
                          </div>
                        </details>
                      )}

                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Admin Notes</h4>
                        <Textarea
                          placeholder="Add notes (required for rejection, optional for approval)"
                          value={adminNotes[application.id] || ""}
                          onChange={(e) => setAdminNotes({
                            ...adminNotes,
                            [application.id]: e.target.value
                          })}
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="default"
                          onClick={() => handleApprove(application)}
                          disabled={processingId === application.id}
                          className="flex-1"
                        >
                          {processingId === application.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(application)}
                          disabled={processingId === application.id}
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reviewed Applications */}
        <section>
          <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Reviewed Applications ({reviewedApplications.length})
          </h2>

          {reviewedApplications.length === 0 ? (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No reviewed applications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewedApplications.map((application) => (
                <div
                  key={application.id}
                  className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={application.profile_image_url || undefined} alt={application.full_name} />
                      <AvatarFallback className="bg-muted">
                        {getInitials(application.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-foreground">{application.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{application.email}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                    application.status === "approved" 
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {application.status === "approved" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {application.status === "approved" ? "Approved" : "Rejected"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-muted/30 rounded-lg p-2">
    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
    <div className="text-sm text-foreground truncate">{value}</div>
  </div>
);

export default TutorApplications;