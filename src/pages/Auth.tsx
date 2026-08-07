import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Loader2, Gift, GraduationCap, Phone, MapPin, BookOpen, IdCard, Eye, EyeOff, MailCheck, AlertTriangle, CheckCircle2, KeyRound, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import logo from "@/assets/logo.png";
import authBg from "@/assets/auth-bg.jpg";
import authHero from "@/assets/auth-hero.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { supabase } from "@/integrations/supabase/client";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import { mapAuthError } from "@/lib/authErrors";
import { prefetchStudentDashboard } from "@/lib/routePrefetch";
import AuthPerfOverlay, { isPerfTestMode, isSimulatedLowEnd } from "@/components/auth/AuthPerfOverlay";

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
  fullName: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  university: z.enum(["FUTA", "OAU"], { required_error: "Pick your university" }),
  referralCode: z.string().optional(),
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
  // When sign-up requires email confirmation (or sign-in fails with
  // "email not confirmed") we remember the address so we can show a
  // dedicated banner with a "Resend verification email" button.
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [resending, setResending] = useState(false);
  // OTP verification state — when sign-up requires email confirmation we
  // switch the entire card to a branded "enter the 6-digit code" screen
  // instead of asking the user to click a link.
  const [verifyMode, setVerifyMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [pendingSignUp, setPendingSignUp] = useState<SignUpFormData | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, primaryRole, signIn, signUp } = useAuth();

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
    } else if (reason === "missing") {
      toast({
        variant: "destructive",
        title: "You're not signed in",
        description: "That page needs an account. Sign in below to continue.",
      });
    } else if (reason === "verify_required") {
      toast({
        title: "Verify your email first",
        description: "Confirm your email address before continuing to onboarding.",
      });
    } else if (reason === "verified") {
      toast({
        title: "Email verified",
        description: "Sign in to continue to onboarding.",
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

  /** Environment the visitor picked on "What are you preparing for?" (pre-signup). */
  const pendingEnvironment = (): "jamb" | "university" | null => {
    try {
      const v = sessionStorage.getItem("pending_environment");
      return v === "jamb" || v === "university" ? v : null;
    } catch { return null; }
  };

  /** Dashboard that matches the profile's saved environment. Never crosses over. */
  const environmentHome = () => {
    const env = (profile as any)?.environment_type ?? (profile as any)?.academic_path;
    return env === "jamb" ? "/jamb/dashboard" : "/student/dashboard";
  };

  const postAuthDestination = (justSignedUp = false) => {
    if (redirect) return redirect;
    if (intent === "tutor") return "/apply-tutor";
    if (intent === "school_owner") return "/school/register";
    if (intent === "parent") return "/parent/dashboard";
    // Brand new student: continue the onboarding for the environment they chose.
    if (justSignedUp) {
      const env = pendingEnvironment();
      if (env === "jamb") return "/onboarding/jamb";
      if (env === "university") return "/onboarding/university";
      return "/start";
    }
    if (primaryRole === "admin") return "/admin/dashboard";
    if (primaryRole === "tutor") return "/tutor/dashboard";
    if (primaryRole === "school_owner" || primaryRole === "school_admin" || primaryRole === "teacher") return "/school/dashboard";
    if (primaryRole === "parent") return "/parent/dashboard";

    const home = environmentHome();
    const prefix = home === "/jamb/dashboard" ? "/jamb" : "/student";
    // Resume where the user left off — only inside their own environment.
    try {
      const uid = user?.id;
      if (uid) {
        const saved = localStorage.getItem(`overra_last_route:${uid}`);
        if (saved && saved.startsWith(prefix)) return saved;
      }
    } catch { /* noop */ }
    return home;
  };


  useEffect(() => {
    // Wait for the profile so we can route into the right environment.
    if (user && primaryRole && profile) {
      navigate(postAuthDestination());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, primaryRole, profile, navigate]);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  // Prefill the sign-in email when we just sent a verification mail or the
  // user came back via a "?reason=verified" link.
  useEffect(() => {
    if (pendingEmail) {
      signInForm.setValue("email", pendingEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEmail]);

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      university: "FUTA",
      referralCode: referralCodeFromUrl,
    },
  });

  // Respect prefers-reduced-motion + low-data connections: skip the
  // backdrop video entirely and let the poster image carry the page.
  const prefersReducedMotion = useReducedMotion();
  const [enableBgVideo, setEnableBgVideo] = useState(false);
  const perfMode = isPerfTestMode();
  const simulateLowEnd = isSimulatedLowEnd();
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (simulateLowEnd) return; // ?simulate=2g forces the low-data branch
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /^(slow-2g|2g)$/.test(conn.effectiveType)) return;
    // Defer kicking the video to idle so the form paints instantly on low-end phones.
    const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 600));
    const cancel = (window as any).cancelIdleCallback ?? clearTimeout;
    const id = idle(() => setEnableBgVideo(true));
    return () => cancel(id);
  }, [prefersReducedMotion, simulateLowEnd]);

  const universityValue = signUpForm.watch("university");

  // Warm the dashboard JS chunk while the user is typing credentials,
  // so navigation after sign-in feels instant.
  useEffect(() => { prefetchStudentDashboard(); }, []);

  const handleSignIn = async (data: SignInFormData) => {
    setIsSubmitting(true);
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      const lower = (error.message || "").toLowerCase();
      if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
        setPendingEmail(data.email);
      }
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: mapAuthError(error.message),
      });
    } else {
      setPendingEmail("");
      // Kick off chunk + neighbor prefetch the moment auth succeeds.
      prefetchStudentDashboard();
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      // Let the auth state listener load the user's real role, then redirect
      // straight into the correct dashboard instead of stopping at the role hub.
    }
    setIsSubmitting(false);
  };

  const handleResendVerification = async () => {
    if (!pendingEmail) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth?reason=verified` },
    });
    setResending(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Couldn't resend",
        description: error.message || "Try again in a minute.",
      });
    } else {
      toast({
        title: "Email sent",
        description: `New 6-digit verification code sent to ${pendingEmail}.`,
      });
    }
  };

  // Persist the name + the environment the visitor picked before signing up.
  const persistExtraSignupDetails = async (data: SignUpFormData) => {
    try {
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (!newUser?.id) return;
      const env = pendingEnvironment();
      const envFields =
        env === "jamb"
          ? { environment_type: "jamb", academic_path: "jamb", university: null, faculty: null }
          : { environment_type: "university", academic_path: "university", university: data.university };
      await supabase
        .from("profiles")
        .update({
          ...envFields,
          full_name: data.fullName,
        } as any)
        .eq("id", newUser.id);
    } catch (e) {
      console.warn("Could not persist signup details:", e);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    const { error } = await signUp(data.email, data.password, data.fullName, data.referralCode);

    if (error) {
      let message = error.message;
      if (error.message.includes("already registered")) {
        message = "This email is already registered. Please sign in instead.";
      }
      toast({ variant: "destructive", title: "Sign up failed", description: message });
      setIsSubmitting(false);
      return;
    }

    // Auto-confirm is enabled: try to make sure a session exists, then go.
    let { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      // Fallback: explicitly sign in so the user lands in the app immediately.
      await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      sessionData = (await supabase.auth.getSession()).data;
    }

    await persistExtraSignupDetails(data);
    toast({
      title: `Welcome, ${data.fullName.split(" ")[0]}! 🎉`,
      description: "Your account is ready. Let's start studying.",
    });
    navigate(postAuthDestination(true));
    setIsSubmitting(false);
  };

  const handleVerifyOtp = async () => {
    if (!pendingEmail || otpCode.length !== 6) return;
    setOtpSubmitting(true);
    const { error } = await supabase.auth.verifyOtp({
      type: "signup",
      email: pendingEmail,
      token: otpCode,
    });
    if (error) {
      setOtpSubmitting(false);
      toast({
        variant: "destructive",
        title: "Couldn't verify code",
        description: error.message || "That code is invalid or has expired. Request a new one.",
      });
      return;
    }
    if (pendingSignUp) {
      await persistExtraSignupDetails(pendingSignUp);
    }
    toast({
      title: "You're in! 🎉",
      description: "Welcome to OverraPrep AI. Let's set up your study profile.",
    });
    setVerifyMode(false);
    setOtpSubmitting(false);
    navigate(postAuthDestination(true));
  };

  const handleResendCode = async () => {
    if (!pendingEmail) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail });
    setResending(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't resend", description: error.message || "Try again in a minute." });
    } else {
      toast({ title: "New code sent", description: `Fresh 6-digit code on its way to ${pendingEmail}.` });
    }
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
        className="min-h-screen relative overflow-hidden bg-[#FAF7F2] lg:grid lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.15fr_1fr] flex items-stretch lg:items-center justify-center"
        role="main"
      >
        {/* Premium ambassador / brand showcase (lg+ only) */}
        <AuthBrandPanel />

        {/* Mobile backdrop: poster image always renders (instant + cheap on
            low-end phones); the looped vertical clip lazy-mounts only when
            the user doesn't have reduced-motion / save-data on. */}
        <div className="lg:hidden absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <img
            src={authHero}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          {enableBgVideo && (
            <video
              className="absolute inset-0 w-full h-full object-cover opacity-30 motion-safe:animate-fade-in"
              src="/__l5e/assets-v1/5b198689-3af2-4d21-b7f6-2cf2962ff353/auth-bg.mp4"
              poster={authHero}
              autoPlay muted loop playsInline
              preload="metadata"
              disableRemotePlayback
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(250,247,242,0.55) 0%, rgba(250,247,242,0.88) 45%, rgba(250,247,242,0.98) 100%)",
            }}
          />
        </div>

        <div className="w-full flex items-center justify-center px-4 py-4 sm:p-8 lg:p-10 relative z-10 min-h-screen">
          <article className="w-full max-w-[400px] relative z-10 animate-fade-in">
        {/* Compact inline header (mobile only) — logo + serif wordmark + tagline
            all in a single row group so the form stays above the fold. */}
        <div className="flex items-center justify-center gap-2.5 mb-4 lg:hidden">
          <span className="w-9 h-9 rounded-full bg-white shadow-[0_4px_15px_rgba(197,160,89,0.12)] border border-[#C5A059]/10 flex items-center justify-center">
            <img src={logo} alt="OverraPrep AI" className="h-5 w-auto object-contain" />
          </span>
          <div className="flex flex-col leading-tight">
            <span
              className="text-lg font-semibold tracking-[0.04em] text-[#3D3A35]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              OverraPrep
            </span>
            <span className="text-[9px] uppercase tracking-[0.22em] text-[#A69D8E] font-semibold">
              Study Smart, Not Hard
            </span>
          </div>
        </div>

        {isSignUp && intent && INTENT_LABELS[intent] && (
          <div className="mb-3 flex items-center justify-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">
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

        {/* Auth Card — editorial cream */}
        <div className="relative">
          <div className="relative bg-[#FCFBF8]/95 backdrop-blur-sm rounded-3xl border border-[#C5A059]/10 shadow-[0_10px_40px_-10px_rgba(197,160,89,0.18)] p-4 sm:p-7 md:p-8">
          {verifyMode ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-amber-400 flex items-center justify-center shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]">
                <KeyRound className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-bold tracking-tight">Check your inbox</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  We sent a verification link to <strong className="text-foreground">{pendingEmail}</strong>.
                  Tap it on this device to finish signing up.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-left">
                <p className="text-[12px] font-semibold text-amber-900 leading-snug">
                  📬 <strong>Open the email</strong> we just sent and tap the gold <strong>"Verify my email"</strong> button.
                  You'll be signed in automatically.
                </p>
                <p className="mt-1.5 text-[11px] text-amber-800/80 leading-snug">
                  Can't find it? Check your <strong>Spam</strong> or <strong>Promotions</strong> folder. The link expires in 1 hour.
                </p>
              </div>

              <details className="text-left rounded-xl border border-border bg-muted/30 px-3 py-2">
                <summary className="cursor-pointer text-[12px] font-semibold text-muted-foreground select-none">
                  Link not working? Enter the 6-digit code instead
                </summary>
                <div className="mt-3 space-y-3">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        {[0,1,2,3,4,5].map((i) => (
                          <InputOTPSlot key={i} index={i} className="h-12 w-10 sm:h-14 sm:w-12 text-lg font-bold" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button variant="hero" size="lg" className="w-full" onClick={handleVerifyOtp} disabled={otpSubmitting || otpCode.length !== 6}>
                    {otpSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Sparkles className="w-4 h-4" /> Verify with code</>)}
                  </Button>
                </div>
              </details>

              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={handleResendCode} disabled={resending} className="font-semibold text-primary hover:underline disabled:opacity-50 inline-flex items-center gap-1">
                  {resending && <Loader2 className="w-3 h-3 animate-spin" />}Resend email
                </button>
                <button type="button" onClick={() => { setVerifyMode(false); setIsSignUp(false); }} className="text-muted-foreground hover:text-foreground underline">
                  Use a different email
                </button>
              </div>
            </div>
          ) : (<>
          {/* Sculptural underline tabs */}
          <div className="flex justify-around mb-5 sm:mb-8 border-b border-[#EAE4D9]">
            <button
              onClick={() => setIsSignUp(false)}
              className={`pb-2.5 sm:pb-3 px-4 text-sm font-semibold relative transition-colors ${
                !isSignUp
                  ? "text-[#3D3A35] border-b-2 border-[#C5A059] -mb-px"
                  : "text-[#A69D8E] border-b-2 border-transparent hover:text-[#3D3A35]"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`pb-2.5 sm:pb-3 px-4 text-sm font-semibold relative transition-colors ${
                isSignUp
                  ? "text-[#3D3A35] border-b-2 border-[#C5A059] -mb-px"
                  : "text-[#A69D8E] border-b-2 border-transparent hover:text-[#3D3A35]"
              }`}
            >
              Sign Up
            </button>
          </div>

          {!isSignUp ? (
            /* Sign In Form — compact so it fits mobile without scroll */
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-3 sm:space-y-5">
              {pendingEmail && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs sm:text-sm text-amber-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <MailCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                      We sent a confirmation link to{" "}
                      <strong className="font-semibold">{pendingEmail}</strong>. Click it,
                      then sign in below to continue.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 disabled:opacity-50"
                  >
                    {resending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Resend verification email
                  </button>
                </div>
              )}
              {reason === "verified" && !pendingEmail && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs sm:text-sm text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Email verified. Sign in to continue to your onboarding.</p>
                </div>
              )}
              {(reason === "expired" || reason === "missing") && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs sm:text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    {reason === "expired"
                      ? "Your session expired for security. Sign in again to pick up where you left off."
                      : "You need to be signed in to view that page. Sign in to continue."}
                  </p>
                </div>
              )}
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
                    className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
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
                    className="pl-10 pr-11 h-10 sm:h-12 text-sm sm:text-base"
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

              {/* Sticky bottom CTA on mobile so it sits above the keyboard
                  / above-the-fold without needing to scroll. */}
              <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 pt-3 sm:pt-0 pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:pb-0 bg-gradient-to-t from-[#FCFBF8] via-[#FCFBF8]/95 to-transparent sm:bg-none z-20">
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
              </div>
            </form>
          ) : (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-foreground text-xs sm:text-sm font-medium">
                  Full name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Ada Okeke"
                    className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
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
                    placeholder="you@gmail.com"
                    className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
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
                    className="pl-10 pr-11 h-10 sm:h-12 text-sm sm:text-base"
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
                <Label className="text-foreground text-xs sm:text-sm font-medium">University</Label>
                <Select
                  value={universityValue}
                  onValueChange={(v) => signUpForm.setValue("university", v as "FUTA" | "OAU", { shouldValidate: true })}
                >
                  <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Pick your university" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FUTA">Federal University of Technology, Akure (FUTA)</SelectItem>
                    <SelectItem value="OAU">Obafemi Awolowo University (OAU)</SelectItem>
                  </SelectContent>
                </Select>
                {signUpForm.formState.errors.university && (
                  <p className="text-sm text-destructive">{signUpForm.formState.errors.university.message}</p>
                )}
              </div>

              {referralCodeFromUrl && (
                <input type="hidden" {...signUpForm.register("referralCode")} />
              )}

              <div className="sticky bottom-0 -mx-4 sm:mx-0 px-4 sm:px-0 pt-3 sm:pt-0 pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:pb-0 bg-gradient-to-t from-[#FCFBF8] via-[#FCFBF8]/95 to-transparent sm:bg-none z-20">
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Create Account <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>


              <p className="text-xs text-center text-muted-foreground">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          )}
          </>)}
          </div>

        </div>

        <div className="mt-8 flex justify-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#A69D8E] hover:text-[#3D3A35] transition-colors group"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </a>
        </div>
      </article>
        </div>
    </main>
    {perfMode && <AuthPerfOverlay videoEnabled={enableBgVideo} />}
    </>

  );
};

export default Auth;
