import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, GraduationCap, Loader2, CheckCircle2, Clock, XCircle,
  Upload, User, Camera, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DocumentUploadField from "@/components/applications/DocumentUploadField";
import { uploadApplicationFile, validateFile, MAX_IMAGE_BYTES } from "@/lib/applicationUploads";
import { motion, AnimatePresence } from "framer-motion";

type ApplicationStatus = "pending" | "approved" | "rejected" | null;

const STEPS = ["Identity", "Academic", "Experience", "Sample Work"] as const;

interface FormState {
  // Step 1 - Identity
  fullName: string;
  email: string;
  phone: string;
  department: string;
  level: string;
  specialization: "university" | "";
  // Step 2 - Academic
  highestQualification: string;
  institution: string;
  subjectsTaught: string;       // comma-separated
  coursesToTeach: string;
  // Step 3 - Experience
  yearsExperience: string;
  currentPosition: string;
  experience: string;
  whyJoin: string;
  bio: string;
  // Step 4 - Sample work
  sampleQ1: string;
  sampleQ2: string;
  sampleQ3: string;
  sampleExplanation: string;
  sampleVideoUrl: string;
}

const initialState: FormState = {
  fullName: "", email: "", phone: "", department: "", level: "", specialization: "",
  highestQualification: "", institution: "", subjectsTaught: "", coursesToTeach: "",
  yearsExperience: "", currentPosition: "", experience: "", whyJoin: "", bio: "",
  sampleQ1: "", sampleQ2: "", sampleQ3: "", sampleExplanation: "", sampleVideoUrl: "",
};

const ApplyTutor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading: authLoading, hasRole } = useAuth();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [govIdUrl, setGovIdUrl] = useState<string | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [existingApplication, setExistingApplication] = useState<{ status: ApplicationStatus; admin_notes: string | null } | null>(null);
  const [isLoadingApplication, setIsLoadingApplication] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirects
  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => { if (hasRole("tutor")) navigate("/dashboard"); }, [hasRole, navigate]);

  // Prefill from profile
  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || profile.full_name || "",
        email: f.email || profile.email || "",
        department: f.department || profile.department || "",
      }));
    }
  }, [profile]);

  // Existing application
  useEffect(() => {
    const fetchExisting = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("tutor_applications")
        .select("status, admin_notes, profile_image_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setExistingApplication({ status: data.status as ApplicationStatus, admin_notes: data.admin_notes });
        if (data.profile_image_url) setProfileImagePreview(data.profile_image_url);
      }
      setIsLoadingApplication(false);
    };
    if (user) fetchExisting();
  }, [user]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, { accept: "image", maxBytes: MAX_IMAGE_BYTES });
    if (err) return toast({ variant: "destructive", title: "Invalid image", description: err });
    setProfileImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setProfileImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Validation per step
  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.fullName.trim()) return "Full name is required";
      if (!form.email.includes("@")) return "Valid email required";
      if (form.phone.trim().length < 10) return "Valid phone required";
      if (!form.department.trim()) return "Department required";
      if (!form.level.trim()) return "Level required";
      if (!form.specialization) return "Pick a specialization";
      if (!govIdUrl) return "Upload your government ID";
      if (!profileImage && !profileImagePreview) return "Add a profile photo";
    }
    if (step === 1) {
      if (!form.highestQualification.trim()) return "Highest qualification required";
      if (!form.institution.trim()) return "Institution required";
      if (!certificateUrl) return "Upload certificate";
      if (!form.subjectsTaught.trim()) return "List subjects you can teach";
      if (!form.coursesToTeach.trim()) return "List courses to teach";
    }
    if (step === 2) {
      if (!form.yearsExperience || Number(form.yearsExperience) < 0) return "Years of experience required";
      if (!form.currentPosition.trim()) return "Current role/position required";
      if (form.experience.trim().length < 20) return "Describe your experience (≥ 20 chars)";
      if (form.whyJoin.trim().length < 20) return "Tell us why you want to join (≥ 20 chars)";
    }
    if (step === 3) {
      if (form.sampleQ1.trim().length < 10) return "Sample question 1 required";
      if (form.sampleQ2.trim().length < 10) return "Sample question 2 required";
      if (form.sampleQ3.trim().length < 10) return "Sample question 3 required";
      if (form.sampleExplanation.trim().length < 30) return "Sample explanation required (≥ 30 chars)";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) return toast({ variant: "destructive", title: "Almost there", description: err });
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!user) return;
    const err = validateStep();
    if (err) return toast({ variant: "destructive", title: "Almost there", description: err });

    setIsSubmitting(true);

    let profileImageUrl: string | null = profileImagePreview && profileImagePreview.startsWith("http") ? profileImagePreview : null;
    if (profileImage) {
      const ext = profileImage.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("tutor-profiles").upload(fileName, profileImage);
      if (!upErr) {
        profileImageUrl = supabase.storage.from("tutor-profiles").getPublicUrl(fileName).data.publicUrl;
      }
    }

    const subjects = form.subjectsTaught.split(",").map((s) => s.trim()).filter(Boolean);

    const { error } = await supabase.from("tutor_applications").insert({
      user_id: user.id,
      full_name: form.fullName,
      email: form.email,
      phone: form.phone,
      gov_id_url: govIdUrl,
      profile_image_url: profileImageUrl,
      specialization: form.specialization || null,
      highest_qualification: form.highestQualification,
      institution: form.institution,
      certificate_url: certificateUrl,
      subjects_taught: subjects,
      courses_to_teach: form.coursesToTeach,
      years_experience: Number(form.yearsExperience),
      current_position: form.currentPosition,
      qualifications: `${form.highestQualification} — ${form.institution}`,
      experience: form.experience,
      why_join: form.whyJoin,
      bio: form.bio || null,
      sample_question_1: form.sampleQ1,
      sample_question_2: form.sampleQ2,
      sample_question_3: form.sampleQ3,
      sample_explanation: form.sampleExplanation,
      sample_video_url: form.sampleVideoUrl || null,
    });

    setIsSubmitting(false);

    if (error) {
      toast({ variant: "destructive", title: "Application failed", description: error.message });
    } else {
      toast({ title: "Application submitted!", description: "We'll review it and get back to you shortly." });
      setExistingApplication({ status: "pending", admin_notes: null });
    }
  };

  if (authLoading || isLoadingApplication) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (existingApplication) {
    const cfg = {
      pending: { Icon: Clock, color: "text-accent", bg: "bg-accent/10", title: "Application Pending", desc: "Your application is being reviewed. We'll notify you once a decision is made." },
      approved: { Icon: CheckCircle2, color: "text-success", bg: "bg-success/10", title: "Application Approved!", desc: "Welcome aboard. Open your dashboard to start creating content." },
      rejected: { Icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", title: "Application Not Approved", desc: existingApplication.admin_notes || "Unfortunately, your application wasn't approved this time." },
    } as const;
    const c = cfg[existingApplication.status as keyof typeof cfg];
    if (!c) return null;
    return (
      <div className="min-h-screen bg-gradient-hero py-8 flex items-center">
        <div className="container mx-auto px-4 max-w-lg">
          <div className={`${c.bg} rounded-3xl p-10 text-center border border-border shadow-xl`}>
            <div className={`w-20 h-20 mx-auto mb-5 rounded-full ${c.bg} flex items-center justify-center`}>
              <c.Icon className={`w-10 h-10 ${c.color}`} />
            </div>
            <h2 className="font-display text-3xl font-bold mb-3">{c.title}</h2>
            <p className="text-muted-foreground mb-6">{c.desc}</p>
            <Button size="lg" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <a href="/" className="flex items-center"><img src={logo} alt="OverraPrep AI" className="h-9" /></a>
        </div>

        {/* Stepper */}
        <div className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-6 border-b border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold">Become a Tutor</h1>
                <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {step === 0 && user && (
                  <>
                    <div className="flex flex-col items-center mb-2">
                      <Label className="mb-3">Profile Photo *</Label>
                      <div
                        className="relative w-28 h-28 rounded-full overflow-hidden bg-muted border-2 border-dashed border-border hover:border-primary cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {profileImagePreview ? (
                          <img src={profileImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                            <User className="w-10 h-10 mb-1" />
                            <span className="text-xs">Add Photo</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      <p className="text-xs text-muted-foreground mt-2">Max 5MB · JPG/PNG</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone Number *</Label>
                        <Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="08012345678" />
                      </div>
                      <div className="space-y-2">
                        <Label>Department *</Label>
                        <Input value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="e.g. Computer Science" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Level / Year *</Label>
                      <Input value={form.level} onChange={(e) => update("level", e.target.value)} placeholder="e.g. 400 Level, Graduate" />
                    </div>

                    <div className="space-y-2">
                      <Label>Tutoring Level Focus *</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {([
                          { v: "university", label: "Foundational", sub: "100L – 200L Courses" },
                          { v: "university", label: "Departmental", sub: "300L – 500L Cores" },
                          { v: "university", label: "General & Faculty", sub: "GST, Math & Sciences" },
                        ] as const).map((opt, i) => {
                          const active = form.specialization === opt.v;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => update("specialization", "university")}
                              className={`rounded-xl border p-3 text-left transition-all ${active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                            >
                              <div className="font-medium text-sm">{opt.label}</div>
                              <div className="text-[11px] text-muted-foreground">{opt.sub}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <DocumentUploadField
                      userId={user.id}
                      kind="gov-id"
                      label="Government ID"
                      description="National ID, Driver's License, Passport or Voter's Card (PDF or image)"
                      required
                      value={govIdUrl}
                      onChange={setGovIdUrl}
                    />
                  </>
                )}

                {step === 1 && user && (
                  <>
                    <div className="space-y-2">
                      <Label>Highest Qualification *</Label>
                      <Input value={form.highestQualification} onChange={(e) => update("highestQualification", e.target.value)} placeholder="e.g. B.Sc. Mathematics, M.Sc. Education" />
                    </div>
                    <div className="space-y-2">
                      <Label>Institution *</Label>
                      <Input value={form.institution} onChange={(e) => update("institution", e.target.value)} placeholder="e.g. University of Lagos" />
                    </div>
                    <DocumentUploadField
                      userId={user.id}
                      kind="certificate"
                      label="Certificate / Transcript"
                      description="Upload your highest certificate or transcript (PDF or image)"
                      required
                      value={certificateUrl}
                      onChange={setCertificateUrl}
                    />
                    <div className="space-y-2">
                      <Label>Subjects You Can Teach *</Label>
                      <Input value={form.subjectsTaught} onChange={(e) => update("subjectsTaught", e.target.value)} placeholder="Math, Physics, Chemistry (comma separated)" />
                    </div>
                    <div className="space-y-2">
                      <Label>Specific Courses to Teach *</Label>
                      <Textarea rows={2} value={form.coursesToTeach} onChange={(e) => update("coursesToTeach", e.target.value)} placeholder="e.g. PHY 101, MTH 201, CSC 301" />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Years of Experience *</Label>
                        <Input type="number" min={0} value={form.yearsExperience} onChange={(e) => update("yearsExperience", e.target.value)} placeholder="3" />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Role *</Label>
                        <Input value={form.currentPosition} onChange={(e) => update("currentPosition", e.target.value)} placeholder="e.g. Math Teacher at XYZ" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Teaching Experience *</Label>
                      <Textarea rows={3} value={form.experience} onChange={(e) => update("experience", e.target.value)} placeholder="Describe your tutoring/teaching experience, classes you've led, etc." />
                    </div>
                    <div className="space-y-2">
                      <Label>Why do you want to join OverraPrep? *</Label>
                      <Textarea rows={3} value={form.whyJoin} onChange={(e) => update("whyJoin", e.target.value)} placeholder="Tell us your motivation and what you'll bring to students." />
                    </div>
                    <div className="space-y-2">
                      <Label>Short Bio (Optional)</Label>
                      <Textarea rows={2} value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="One-paragraph intro for your tutor profile." />
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="rounded-xl bg-accent/5 border border-accent/20 p-4 flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                      <div className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Show us how you teach.</strong> Submit 3 sample exam questions and a brief sample explanation. This helps admins gauge your teaching quality before approval.
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Sample Question 1 *</Label>
                      <Textarea rows={2} value={form.sampleQ1} onChange={(e) => update("sampleQ1", e.target.value)} placeholder="Write a sample exam question (with answer if possible)" />
                    </div>
                    <div className="space-y-2">
                      <Label>Sample Question 2 *</Label>
                      <Textarea rows={2} value={form.sampleQ2} onChange={(e) => update("sampleQ2", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Sample Question 3 *</Label>
                      <Textarea rows={2} value={form.sampleQ3} onChange={(e) => update("sampleQ3", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Sample Explanation *</Label>
                      <Textarea rows={4} value={form.sampleExplanation} onChange={(e) => update("sampleExplanation", e.target.value)} placeholder="Explain a concept the way you would to a student." />
                    </div>
                    <div className="space-y-2">
                      <Label>Sample Video URL (Optional)</Label>
                      <Input type="url" value={form.sampleVideoUrl} onChange={(e) => update("sampleVideoUrl", e.target.value)} placeholder="YouTube/Loom link of you teaching" />
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav */}
            <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t border-border">
              <Button variant="outline" onClick={back} disabled={step === 0}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={next}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={isSubmitting} variant="default">
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Submit Application</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyTutor;
