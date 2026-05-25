import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Loader2, Gift, GraduationCap, Phone, MapPin, BookOpen, IdCard, Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import logo from "@/assets/logo.png";
import authBg from "@/assets/auth-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { supabase } from "@/integrations/supabase/client";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import { mapAuthError } from "@/lib/authErrors";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta",
  "Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi",
  "Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name is too long"),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  confirmPassword: z.string(),
  academicPath: z.enum(["secondary", "jamb", "university"], { required_error: "Select your academic path" }),
  level: z.string().trim().min(1, "Level is required").max(40),
  department: z.string().trim().min(2, "Department is required").max(120),
  school: z.string().trim().min(2, "School is required").max(120),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  matricNo: z.string().trim().max(40).optional().or(z.literal("")),
  state: z.string().trim().min(2, "Select state of origin").max(60),
  referralCode: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

const INTENT_LABELS: Record<string, string> = {
  student: "Student",
  tutor: "Tutor",
  parent: "Parent",
  school_owner: "School Owner",
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const referralCodeFromUrl = searchParams.get("ref") || "";
  const modeFromUrl = searchParams.get("mode");
  const intent = searchParams.get("intent") || "";
  const redirect = searchParams.get("redirect") || "";
  const reason = searchParams.get("reason") || "";
  const [isSignUp, setIsSignUp] = useState(modeFromUrl === "signup" || !!referralCodeFromUrl || !!intent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showSignInPwd, setShowSignInPwd] = useState(false);
  const [showSignUpPwd, setShowSignUpPwd] = useState(false);
  const [signUpStep, setSignUpStep] = useState(0);
  const [stepDir, setStepDir] = useState<1 | -1>(1);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, primaryRole, signIn, signUp } = useAuth();

  // Surface reasons that brought the user back to /auth (expired, switching, etc.)
  useEffect(() => {
    if (!reason) return;
    if (reason === "expired") {
      toast({
        variant: "destructive",
        title: "Session expired",
        description: "Your session has timed out for security. Please sign in again.",
      });
    } else if (reason === "switch") {
      toast({
        title: "Switch account",
        description: "Sign in with a different role to continue.",
      });
    } else if (reason === "unauthorized") {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "You don't have permission for that area. Sign in with the correct role.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reason]);

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please select an image." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Profile photo must be under 5MB." });
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(String(ev.target?.result || ""));
    reader.readAsDataURL(file);
  };

  const postAuthDestination = (justSignedUp = false) => {
    if (redirect) return redirect;
    if (intent === "tutor") return "/apply-tutor";
    if (intent === "school_owner") return "/school/register";
    if (intent === "parent") return "/parent/dashboard";
    // New students go through the onboarding wizard before the dashboard
    if (justSignedUp) return "/onboarding/match";
    if (primaryRole === "admin") return "/admin/dashboard";
    if (primaryRole === "tutor") return "/tutor/dashboard";
    if (primaryRole === "school_owner" || primaryRole === "school_admin" || primaryRole === "teacher") return "/school/dashboard";
    if (primaryRole === "parent") return "/parent/dashboard";
    return "/student/dashboard";
  };

  useEffect(() => {
    if (user && primaryRole) {
      navigate(postAuthDestination());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, primaryRole, navigate]);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      academicPath: "university" as const,
      level: "",
      department: "",
      school: "Federal University of Technology, Akure",
      phone: "",
      matricNo: "",
      state: "",
      referralCode: referralCodeFromUrl,
    },
  });

  const academicPath = signUpForm.watch("academicPath");

  const handleSignIn = async (data: SignInFormData) => {
    setIsSubmitting(true);
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: mapAuthError(error.message),
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      // Let the auth state listener load the user's real role, then redirect
      // straight into the correct dashboard instead of stopping at the role hub.
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    const { error } = await signUp(data.email, data.password, data.fullName, data.referralCode);

    if (error) {
      let message = error.message;
      if (error.message.includes("already registered")) {
        message = "This email is already registered. Please sign in instead.";
      }
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: message,
      });
    } else {
      // Persist extra profile details (best-effort; profile row is created by trigger)
      try {
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser?.id) {
          const meta = {
            school: data.school,
          };

          // Upload avatar if user picked one
          let uploadedAvatarUrl: string | null = null;
          if (avatarFile) {
            try {
              const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
              const path = `${newUser.id}/avatar.${ext}`;
              const { error: upErr } = await supabase.storage
                .from("avatars")
                .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
              if (!upErr) {
                const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
                uploadedAvatarUrl = `${pub.publicUrl}?v=${Date.now()}`;
              }
            } catch (upErr) {
              console.warn("Avatar upload failed:", upErr);
            }
          }

          await supabase
            .from("profiles")
            .update({
              academic_path: data.academicPath,
              level: data.level,
              department: data.department,
              phone: data.phone,
              matric_no: data.matricNo,
              state_of_origin: data.state,
              academic_metadata: meta,
              ...(uploadedAvatarUrl
                ? { avatar_url: uploadedAvatarUrl, profile_image_url: uploadedAvatarUrl }
                : {}),
            })
            .eq("id", newUser.id);
        }
      } catch (e) {
        console.warn("Could not persist extra signup details:", e);
      }

      const welcomeMsg = data.referralCode
        ? "Welcome to OverraPrep AI! Complete your first quiz to earn bonus tokens."
        : "Welcome to OverraPrep AI. You can now start practicing.";
      toast({
        title: "Account created!",
        description: welcomeMsg,
      });
      navigate(postAuthDestination(true));
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <SEO
        title={isSignUp ? "Sign Up" : "Sign In"}
        description="Sign in or create an account to access AI-powered CBT exam preparation for FUTA students."
        noindex={true}
        url="https://overraprep.com/auth"
      />
      <main
        className="min-h-screen relative overflow-hidden bg-[#faf6ee] lg:grid lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.15fr_1fr] flex items-center justify-center"
        role="main"
      >
        {/* Static editorial photo backdrop (mobile only — desktop shows AuthBrandPanel instead) */}
        <div className="lg:hidden absolute inset-0 -z-10" aria-hidden>
          <img
            src={authBg}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/85 to-white/95" />
        </div>

        {/* Premium ambassador / brand showcase (lg+ only) */}
        <AuthBrandPanel />

        <div className="w-full flex items-start sm:items-center justify-center px-3 py-5 sm:p-6 lg:p-10 relative z-10">
          <article className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-5 sm:mb-7 lg:hidden">
          <a href="/" className="inline-flex items-center group">
            <img
              src={logo}
              alt="OverraPrep AI"
              className="h-12 sm:h-16 w-auto object-contain drop-shadow-[0_8px_30px_hsl(var(--primary)/0.45)] transition-transform group-hover:scale-105"
            />
          </a>
          <p className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-muted-foreground/80 font-bold">
            Study Smart · Not Hard
          </p>
        </div>

        {isSignUp && intent && INTENT_LABELS[intent] && (
          <div className="mb-4 flex items-center justify-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold">
              Signing up as {INTENT_LABELS[intent]}
            </span>
            <button
              type="button"
              onClick={() => navigate(intent === "school_owner" ? "/school/intro" : "/start/persona")}
              className="text-muted-foreground hover:text-foreground underline"
            >
              change
            </button>
          </div>
        )}

        {/* Auth Card — glassmorphic */}
        <div className="relative">
          {/* outer gold border glow */}
          <div className="absolute -inset-[1.5px] rounded-[28px] bg-gradient-to-br from-primary/60 via-amber-300/30 to-primary/60 opacity-70 blur-[2px]" aria-hidden />
          <div className="relative bg-white/85 supports-[backdrop-filter]:bg-white/65 backdrop-blur-2xl rounded-2xl sm:rounded-[26px] border border-white/60 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.45)] p-4 sm:p-7 md:p-8">
          {/* Tab Switcher */}
          <div className="relative flex mb-5 sm:mb-7 bg-muted/70 rounded-2xl p-1 border border-border/40">
            <span
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-br from-primary to-amber-400 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] transition-all duration-300 ease-out ${
                isSignUp ? "left-[calc(50%+2px)]" : "left-1"
              }`}
              aria-hidden
            />
            <button
              onClick={() => setIsSignUp(false)}
              className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 ${
                !isSignUp ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 ${
                isSignUp ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          {!isSignUp ? (
            /* Sign In Form */
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-foreground text-xs sm:text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
                    {...signInForm.register("email")}
                  />
                </div>
                {signInForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-foreground text-xs sm:text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type={showSignInPwd ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-11 h-11 sm:h-12 text-sm sm:text-base"
                    {...signInForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPwd((v) => !v)}
                    aria-label={showSignInPwd ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSignInPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {signInForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="flex justify-end -mt-2">
                <a href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                  Forgot password?
                </a>
              </div>

              <Button variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4 sm:space-y-5">
              {/* Step indicator */}
              {(() => {
                const STEPS = ["Account", "Academic", "Contact", "Bonus"];
                return (
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {STEPS.map((label, i) => {
                      const active = i === signUpStep;
                      const done = i < signUpStep;
                      return (
                        <div key={label} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={`h-1.5 w-full rounded-full transition-colors ${
                              done || active ? "bg-gradient-to-r from-primary to-amber-400" : "bg-muted"
                            }`}
                          />
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "text-primary" : "text-muted-foreground"}`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="relative overflow-hidden">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={signUpStep}
                    initial={{ opacity: 0, x: stepDir * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: stepDir * -40 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="space-y-5"
                  >
                    {signUpStep === 0 && (
                      <>
              {/* Avatar picker */}
              <div className="flex flex-col items-center gap-2">
                <label
                  htmlFor="signup-avatar"
                  className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all flex items-center justify-center cursor-pointer overflow-hidden group"
                  aria-label="Upload profile picture"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-primary/60 group-hover:text-primary transition-colors" />
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-primary/85 text-[10px] font-semibold text-primary-foreground py-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatarPreview ? "Change" : "Upload"}
                  </span>
                  <input
                    id="signup-avatar"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarPick}
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">Add a profile photo (optional)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-foreground text-xs sm:text-sm font-medium">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
                    {...signUpForm.register("fullName")}
                  />
                </div>
                {signUpForm.formState.errors.fullName && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-foreground text-xs sm:text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
                    {...signUpForm.register("email")}
                  />
                </div>
                {signUpForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-foreground text-xs sm:text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showSignUpPwd ? "text" : "password"}
                    placeholder="At least 6 characters"
                    className="pl-10 pr-11 h-11 sm:h-12 text-sm sm:text-base"
                    {...signUpForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPwd((v) => !v)}
                    aria-label={showSignUpPwd ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSignUpPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {signUpForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm" className="text-foreground text-xs sm:text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
                    {...signUpForm.register("confirmPassword")}
                  />
                </div>
                {signUpForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
                      </>
                    )}

                    {signUpStep === 1 && (
                      <>
              {/* Academic details */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  Academic details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-xs sm:text-sm font-medium">Academic path</Label>
                    <Select
                      value={academicPath}
                      onValueChange={(v) => signUpForm.setValue("academicPath", v as any, { shouldValidate: true })}
                    >
                      <SelectTrigger className="h-10 sm:h-11 text-sm"><SelectValue placeholder="Select path" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="university">University</SelectItem>
                        <SelectItem value="jamb">JAMB / UTME</SelectItem>
                        <SelectItem value="secondary">Secondary School</SelectItem>
                      </SelectContent>
                    </Select>
                    {signUpForm.formState.errors.academicPath && (
                      <p className="text-xs text-destructive">{signUpForm.formState.errors.academicPath.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-level" className="text-foreground text-xs sm:text-sm font-medium">
                      {academicPath === "university" ? "Level (e.g., 100, 200)" : academicPath === "secondary" ? "Class (e.g., SS2)" : "Attempt year"}
                    </Label>
                    <Input
                      id="signup-level"
                      placeholder={academicPath === "university" ? "100" : academicPath === "secondary" ? "SS2" : "2025"}
                      className="h-10 sm:h-11 text-sm"
                      {...signUpForm.register("level")}
                    />
                    {signUpForm.formState.errors.level && (
                      <p className="text-xs text-destructive">{signUpForm.formState.errors.level.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-school" className="text-foreground text-xs sm:text-sm font-medium">School / Institution</Label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-school"
                      placeholder="Federal University of Technology, Akure"
                      className="pl-9 h-10 sm:h-11 text-sm"
                      {...signUpForm.register("school")}
                    />
                  </div>
                  {signUpForm.formState.errors.school && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.school.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-department" className="text-foreground text-xs sm:text-sm font-medium">Department / Course</Label>
                  <Input
                    id="signup-department"
                    placeholder="Computer Science"
                    className="h-10 sm:h-11 text-sm"
                    {...signUpForm.register("department")}
                  />
                  {signUpForm.formState.errors.department && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.department.message}</p>
                  )}
                </div>
              </div>
                      </>
                    )}

                    {signUpStep === 2 && (
                      <>
              {/* Contact details */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <IdCard className="w-3.5 h-3.5 text-primary" />
                  Contact & ID
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-phone" className="text-foreground text-xs sm:text-sm font-medium">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-phone" placeholder="080..." className="pl-9 h-10 sm:h-11 text-sm" {...signUpForm.register("phone")} />
                    </div>
                    {signUpForm.formState.errors.phone && (
                      <p className="text-xs text-destructive">{signUpForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-matric" className="text-foreground text-xs sm:text-sm font-medium">
                      Matric / Reg no. <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input id="signup-matric" placeholder="CSC/20/1234" className="h-10 sm:h-11 text-sm" {...signUpForm.register("matricNo")} />
                    {signUpForm.formState.errors.matricNo && (
                      <p className="text-xs text-destructive">{signUpForm.formState.errors.matricNo.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-foreground text-xs sm:text-sm font-medium">State of origin</Label>
                  <Select
                    value={signUpForm.watch("state")}
                    onValueChange={(v) => signUpForm.setValue("state", v, { shouldValidate: true })}
                  >
                    <SelectTrigger className="h-10 sm:h-11 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder="Select your state" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {NIGERIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {signUpForm.formState.errors.state && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.state.message}</p>
                  )}
                </div>
              </div>
                      </>
                    )}

                    {signUpStep === 3 && (
                      <>
              {/* Referral Code Section - Highlighted */}
              <div className="relative p-3 sm:p-4 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl border border-primary/20">
                <div className="absolute -top-3 left-4 bg-card px-2">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    BONUS TOKENS
                  </span>
                </div>
                <div className="space-y-2 mt-1">
                  <Label htmlFor="signup-referral" className="text-foreground text-xs sm:text-sm font-medium">
                    Got a referral code from a friend?
                  </Label>
                  <Input
                    id="signup-referral"
                    type="text"
                    placeholder="Paste code here (e.g., REF-ABC123)"
                    className="h-11 sm:h-12 text-sm sm:text-base font-mono uppercase bg-card border-primary/30 focus:border-primary"
                    {...signUpForm.register("referralCode")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {referralCodeFromUrl ? (
                      <span className="text-primary font-medium">🎁 Referral code applied! Complete your first quiz to earn bonus tokens.</span>
                    ) : (
                      "Enter a friend's referral code to earn bonus tokens after your first quiz!"
                    )}
                  </p>
                </div>
              </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Step navigation */}
              {(() => {
                const STEP_FIELDS: Array<Array<keyof SignUpFormData>> = [
                  ["fullName", "email", "password", "confirmPassword"],
                  ["academicPath", "level", "school", "department"],
                  ["phone", "matricNo", "state"],
                  ["referralCode"],
                ];
                const isLast = signUpStep === 3;
                const goNext = async () => {
                  const valid = await signUpForm.trigger(STEP_FIELDS[signUpStep]);
                  if (!valid) return;
                  setStepDir(1);
                  setSignUpStep((s) => Math.min(3, s + 1));
                };
                const goBack = () => {
                  setStepDir(-1);
                  setSignUpStep((s) => Math.max(0, s - 1));
                };
                return (
                  <div className="flex items-center gap-3">
                    {signUpStep > 0 && (
                      <Button type="button" variant="outline" size="lg" onClick={goBack} className="flex-1">
                        <ArrowLeft className="w-4 h-4" /> Back
                      </Button>
                    )}
                    {!isLast ? (
                      <Button type="button" variant="hero" size="lg" onClick={goNext} className="flex-1">
                        Continue <ArrowRight className="w-5 h-5" />
                      </Button>
                    ) : (
                      <Button type="submit" variant="hero" size="lg" className="flex-1" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Create Account <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })()}

              <p className="text-xs text-center text-muted-foreground">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          )}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <a href="/" className="hover:text-foreground transition-colors">
            ← Back to Home
          </a>
        </p>
      </article>
        </div>
    </main>
    </>
  );
};

export default Auth;
