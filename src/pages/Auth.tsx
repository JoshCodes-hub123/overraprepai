import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Gift,
  GraduationCap,
  Eye,
  EyeOff,
  MailCheck,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { supabase } from "@/integrations/supabase/client";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import { mapAuthError } from "@/lib/authErrors";
import { prefetchStudentDashboard } from "@/lib/routePrefetch";
import AuthPerfOverlay, { isPerfTestMode } from "@/components/auth/AuthPerfOverlay";
import { INSTITUTION_LIST, type InstitutionCode, type EnvironmentType } from "@/config/environments";
import { isPathInEnvironment, getValidResumeRoute } from "@/lib/environmentScope";
import { OverraLoader } from "@/components/ui/OverraLoader";

const MOBILE_HERO_IMAGE = "/assets/aistudio/image_6c6bd5ed.png";

const signInSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  university: z.enum(["FUTA", "OAU", "UI", "FUTESIYIN"]).optional(),
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

const Auth: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const referralCodeFromUrl = searchParams.get("ref") || "";
  const modeFromUrl = searchParams.get("mode");
  const intent = searchParams.get("intent") || "";
  const redirect = searchParams.get("redirect") || "";
  const reason = searchParams.get("reason") || "";

  const [isSignUp, setIsSignUp] = useState(
    modeFromUrl === "signup" || !!referralCodeFromUrl || !!intent
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignInPwd, setShowSignInPwd] = useState(false);
  const [showSignUpPwd, setShowSignUpPwd] = useState(false);

  // Email verification & OTP state
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [pendingSignUp, setPendingSignUp] = useState<SignUpFormData | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, primaryRole, signIn, signUp } = useAuth();
  const perfMode = isPerfTestMode();

  // Surface auth messages (expired session, verified email, etc.)
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
  }, [reason, toast]);

  const postAuthDestination = (justSignedUp = false) => {
    if (intent === "tutor") return "/apply-tutor";
    if (justSignedUp) return "/onboarding/university";
    if (primaryRole === "admin") return "/admin/dashboard";
    if (primaryRole === "tutor") return "/tutor/dashboard";
    const env: EnvironmentType = "university";

    let target = redirect || (location.state as any)?.returnTo || "";
    if (!target) {
      try {
        target = sessionStorage.getItem("overra_intended_deep_link") || "";
      } catch {
        /* noop */
      }
    }

    if (target) {
      try {
        sessionStorage.removeItem("overra_intended_deep_link");
      } catch {
        /* noop */
      }
      if (isPathInEnvironment(target, env)) {
        return target;
      }
    }

    return getValidResumeRoute(user?.id, env);
  };

  useEffect(() => {
    if (user && primaryRole && profile) {
      navigate(postAuthDestination());
    }
  }, [user, primaryRole, profile, navigate]);

  // Warm dashboard chunk for fast transition
  useEffect(() => {
    prefetchStudentDashboard();
  }, []);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (pendingEmail) {
      signInForm.setValue("email", pendingEmail);
    }
  }, [pendingEmail, signInForm]);

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      university: undefined,
      referralCode: referralCodeFromUrl,
    },
  });

  const universityValue = signUpForm.watch("university");

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
      prefetchStudentDashboard();
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
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
        description: `New verification link sent to ${pendingEmail}.`,
      });
    }
  };

  const persistExtraSignupDetails = async (data: SignUpFormData): Promise<boolean> => {
    try {
      const {
        data: { user: newUser },
      } = await supabase.auth.getUser();
      if (!newUser?.id) return false;
      const envFields = {
        environment_type: "university",
        academic_path: "university",
        university: data.university ?? null,
      };
      const { error } = await supabase
        .from("profiles")
        .update({
          ...envFields,
          full_name: data.fullName,
        } as any)
        .eq("id", newUser.id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Could not persist signup details:", e);
      return false;
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

    let { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      sessionData = (await supabase.auth.getSession()).data;
    }

    if (!(await persistExtraSignupDetails(data))) {
      toast({
        variant: "destructive",
        title: "Couldn't save your study scope",
        description: "Sign in and finish setting up your university before studying.",
      });
      setIsSubmitting(false);
      return;
    }

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
      if (!(await persistExtraSignupDetails(pendingSignUp))) {
        toast({
          variant: "destructive",
          title: "Couldn't save your study scope",
          description: "Sign in and finish setting up your university before studying.",
        });
        setOtpSubmitting(false);
        return;
      }
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
      toast({
        variant: "destructive",
        title: "Couldn't resend",
        description: error.message || "Try again in a minute.",
      });
    } else {
      toast({
        title: "New code sent",
        description: `Fresh 6-digit code on its way to ${pendingEmail}.`,
      });
    }
  };

  return (
    <>
      <SEO
        title={isSignUp ? "Sign Up | OverraPrep AI" : "Sign In | OverraPrep AI"}
        description="Sign in or create an account to access AI-powered CBT examination preparation for Nigerian university students."
        noindex={true}
        url="https://overraprep.com/auth"
      />

      <main
        className="min-h-screen w-full bg-[#FAF8F5] text-[#18181B] lg:grid lg:grid-cols-[1.1fr_1fr] flex flex-col items-stretch"
        role="main"
      >
        {/* DESKTOP SHOWCASE (lg+): Editorial Split Hero with Real Ambassadors */}
        <AuthBrandPanel />

        {/* RIGHT / MAIN AUTH CONTAINER (Mobile + Desktop Form Column) */}
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 lg:p-12 xl:p-16 overflow-y-auto">
          {/* Top Brand Nav (Desktop & Tablet) */}
          <header className="hidden lg:flex items-center justify-between mb-8">
            <a
              href="/"
              className="inline-flex items-center gap-2.5 group transition-transform active:scale-95"
              aria-label="Back to home"
            >
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-[#E8E2D6] p-1.5 flex items-center justify-center">
                <img src={logo} alt="OverraPrep AI" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-[#18181B] flex items-center gap-1.5">
                  OverraPrep
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#8B6B10] uppercase">
                    AI
                  </span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#8C8273] font-semibold">
                  Rise Beyond Limits
                </span>
              </div>
            </a>

            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C8273] hover:text-[#18181B] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </a>
          </header>

          {/* Form Wrapper */}
          <div className="w-full max-w-[440px] mx-auto my-auto py-2 sm:py-6">
            {/* MOBILE ONLY: Authentic Editorial Photographic Banner */}
            <div className="lg:hidden mb-6">
              <div className="relative rounded-2xl overflow-hidden shadow-md border border-[#E8E2D6] bg-[#1A1713] aspect-[21/9] sm:aspect-[24/9]">
                <img
                  src={MOBILE_HERO_IMAGE}
                  alt="OverraPrep University Student Ambassadors"
                  className="w-full h-full object-cover object-top"
                  loading="eager"
                />
                {/* Contrast gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

                {/* Banner Content */}
                <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/95 p-1 flex items-center justify-center shadow-sm">
                        <img src={logo} alt="" className="h-full w-full object-contain" />
                      </div>
                      <span className="text-xs font-bold tracking-wider uppercase text-white/95">
                        OverraPrep <span className="text-[#F5D77F]">AI</span>
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#D4AF37]/30 border border-[#F5D77F]/40 text-[#F5D77F] backdrop-blur-xs">
                      12,000+ Scholars
                    </span>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-white/95 leading-tight">
                      Master your CBT exams with confidence
                    </p>
                    <p className="text-[10px] text-white/75 mt-0.5 font-normal">
                      Past questions & AI guidance for Nigerian universities
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Persona Notice if arriving with special intent */}
            {isSignUp && intent && INTENT_LABELS[intent] && (
              <div className="mb-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F5D77F]/15 border border-[#D4AF37]/30 text-xs text-[#6B520E]">
                <span className="font-semibold">Signing up as {INTENT_LABELS[intent]}</span>
                <button
                  type="button"
                  onClick={() =>
                    navigate(intent === "school_owner" ? "/school/intro" : "/start/persona")
                  }
                  className="underline hover:text-black font-medium"
                >
                  Change
                </button>
              </div>
            )}

            {/* Referral Banner if present */}
            {referralCodeFromUrl && (
              <div className="mb-4 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Referral perk unlocked: <strong>{referralCodeFromUrl}</strong>
                </span>
              </div>
            )}

            {/* The Main Authentication Card */}
            <div className="bg-white rounded-3xl border border-[#E8E2D6] shadow-[0_20px_50px_-15px_rgba(28,25,23,0.06),0_1px_3px_rgba(28,25,23,0.04)] p-6 sm:p-8">
              {verifyMode ? (
                /* OTP Verification View */
                <div className="space-y-6 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                    <KeyRound className="w-7 h-7 text-[#997314]" />
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B]">
                      Check your inbox
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-[#71717A]">
                      We sent a verification link to{" "}
                      <strong className="text-[#18181B] font-semibold">{pendingEmail}</strong>.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-left text-xs text-amber-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5 text-amber-950">
                      <MailCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      Tap the link in your email to sign in
                    </p>
                    <p className="text-[11px] text-amber-800/90 pl-5.5">
                      Check your Spam or Promotions folder if not in your primary inbox.
                    </p>
                  </div>

                  <details className="text-left rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] p-3 text-xs">
                    <summary className="cursor-pointer font-semibold text-[#52525B] select-none">
                      Link not opening? Enter the 6-digit code
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot
                                key={i}
                                index={i}
                                className="h-11 w-10 sm:h-12 sm:w-11 text-base font-bold border-[#E4DCD0]"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpSubmitting || otpCode.length !== 6}
                        className="w-full h-11 bg-gradient-to-r from-[#D4AF37] via-[#DFBE57] to-[#C5A059] text-[#18181B] font-semibold rounded-xl hover:opacity-95"
                      >
                        {otpSubmitting ? (
                          <OverraLoader size="xs" variant="inline" className="mr-2" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-1.5" />
                            Verify Code
                          </>
                        )}
                      </Button>
                    </div>
                  </details>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resending}
                      className="font-semibold text-[#997314] hover:underline disabled:opacity-50"
                    >
                      {resending ? "Resending..." : "Resend email"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyMode(false);
                        setIsSignUp(false);
                      }}
                      className="text-[#71717A] hover:text-[#18181B] underline"
                    >
                      Use another email
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Segmented Auth Tabs */}
                  <div className="flex border-b border-[#EAE4D9] mb-6">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className={`flex-1 pb-3 text-sm font-semibold tracking-wide transition-all relative ${
                        !isSignUp
                          ? "text-[#18181B] border-b-2 border-[#D4AF37] -mb-px font-bold"
                          : "text-[#8C8273] border-b-2 border-transparent hover:text-[#18181B]"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className={`flex-1 pb-3 text-sm font-semibold tracking-wide transition-all relative ${
                        isSignUp
                          ? "text-[#18181B] border-b-2 border-[#D4AF37] -mb-px font-bold"
                          : "text-[#8C8273] border-b-2 border-transparent hover:text-[#18181B]"
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {/* Contextual Feedback Banners */}
                  {pendingEmail && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 mb-4 text-xs text-amber-900 space-y-2">
                      <div className="flex items-start gap-2">
                        <MailCheck className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                        <p>
                          Confirmation link sent to <strong>{pendingEmail}</strong>. Click it, then sign
                          in.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="inline-flex items-center gap-1 font-semibold underline text-amber-800 disabled:opacity-50"
                      >
                        {resending ? "Sending..." : "Resend verification email"}
                      </button>
                    </div>
                  )}

                  {reason === "verified" && !pendingEmail && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 mb-4 text-xs text-emerald-900 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                      <p>Email verified successfully. Sign in below to continue.</p>
                    </div>
                  )}

                  {(reason === "expired" || reason === "missing") && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-4 text-xs text-red-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                      <p>
                        {reason === "expired"
                          ? "Your session has expired. Please sign in again."
                          : "Please sign in to access your course materials."}
                      </p>
                    </div>
                  )}

                  {/* SIGN IN FORM */}
                  {!isSignUp ? (
                    <form
                      onSubmit={signInForm.handleSubmit(handleSignIn)}
                      className="space-y-4"
                      noValidate
                    >
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signin-email"
                          className="text-xs font-semibold text-[#27272A] uppercase tracking-wider"
                        >
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8273]" />
                          <Input
                            id="signin-email"
                            type="email"
                            autoComplete="email"
                            placeholder="student@university.edu.ng"
                            className="pl-10 h-[50px] text-sm bg-[#FDFCFB] border-[#E4DCD0] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 rounded-xl transition-all"
                            {...signInForm.register("email")}
                          />
                        </div>
                        {signInForm.formState.errors.email && (
                          <p className="text-xs text-red-600 font-medium">
                            {signInForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="signin-password"
                            className="text-xs font-semibold text-[#27272A] uppercase tracking-wider"
                          >
                            Password
                          </Label>
                          <a
                            href="/forgot-password"
                            className="text-xs font-semibold text-[#8B6B10] hover:text-[#5E4708] hover:underline"
                          >
                            Forgot password?
                          </a>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8273]" />
                          <Input
                            id="signin-password"
                            type={showSignInPwd ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="pl-10 pr-11 h-[50px] text-sm bg-[#FDFCFB] border-[#E4DCD0] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 rounded-xl transition-all"
                            {...signInForm.register("password")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignInPwd((v) => !v)}
                            aria-label={showSignInPwd ? "Hide password" : "Show password"}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8273] hover:text-[#18181B] transition-colors p-1"
                          >
                            {showSignInPwd ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {signInForm.formState.errors.password && (
                          <p className="text-xs text-red-600 font-medium">
                            {signInForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full h-[52px] bg-gradient-to-r from-[#D4AF37] via-[#DFBE57] to-[#C5A059] hover:from-[#C5A059] hover:to-[#B8860B] text-[#18181B] font-bold text-sm tracking-wide rounded-xl shadow-[0_8px_20px_-4px_rgba(212,175,55,0.35)] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <>
                              <OverraLoader size="xs" variant="inline" className="mr-2" />
                              <span>Signing in...</span>
                            </>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-2">
                              Sign In to Dashboard
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    /* SIGN UP FORM */
                    <form
                      onSubmit={signUpForm.handleSubmit(handleSignUp)}
                      className="space-y-4"
                      noValidate
                    >
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-name"
                          className="text-xs font-semibold text-[#27272A] uppercase tracking-wider"
                        >
                          Full Name
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8273]" />
                          <Input
                            id="signup-name"
                            type="text"
                            autoComplete="name"
                            placeholder="e.g. Ada Okeke"
                            className="pl-10 h-[50px] text-sm bg-[#FDFCFB] border-[#E4DCD0] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 rounded-xl transition-all"
                            {...signUpForm.register("fullName")}
                          />
                        </div>
                        {signUpForm.formState.errors.fullName && (
                          <p className="text-xs text-red-600 font-medium">
                            {signUpForm.formState.errors.fullName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-email"
                          className="text-xs font-semibold text-[#27272A] uppercase tracking-wider"
                        >
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8273]" />
                          <Input
                            id="signup-email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@gmail.com"
                            className="pl-10 h-[50px] text-sm bg-[#FDFCFB] border-[#E4DCD0] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 rounded-xl transition-all"
                            {...signUpForm.register("email")}
                          />
                        </div>
                        {signUpForm.formState.errors.email && (
                          <p className="text-xs text-red-600 font-medium">
                            {signUpForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="signup-password"
                          className="text-xs font-semibold text-[#27272A] uppercase tracking-wider"
                        >
                          Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8273]" />
                          <Input
                            id="signup-password"
                            type={showSignUpPwd ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="At least 6 characters"
                            className="pl-10 pr-11 h-[50px] text-sm bg-[#FDFCFB] border-[#E4DCD0] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 rounded-xl transition-all"
                            {...signUpForm.register("password")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignUpPwd((v) => !v)}
                            aria-label={showSignUpPwd ? "Hide password" : "Show password"}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8273] hover:text-[#18181B] transition-colors p-1"
                          >
                            {showSignUpPwd ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {signUpForm.formState.errors.password && (
                          <p className="text-xs text-red-600 font-medium">
                            {signUpForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-[#27272A] uppercase tracking-wider">
                          University Campus
                        </Label>
                        <Select
                          value={universityValue ?? ""}
                          onValueChange={(v) =>
                            signUpForm.setValue("university", v as InstitutionCode, {
                              shouldValidate: true,
                            })
                          }
                        >
                          <SelectTrigger className="h-[50px] text-sm bg-[#FDFCFB] border-[#E4DCD0] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15 rounded-xl">
                            <div className="flex items-center gap-2 text-left">
                              <GraduationCap className="w-4 h-4 text-[#8C8273]" />
                              <SelectValue placeholder="Select your university" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#E8E2D6] rounded-xl shadow-lg">
                            {INSTITUTION_LIST.map((institution) => (
                              <SelectItem key={institution.code} value={institution.code}>
                                {institution.name} ({institution.short})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {signUpForm.formState.errors.university && (
                          <p className="text-xs text-red-600 font-medium">
                            {signUpForm.formState.errors.university.message}
                          </p>
                        )}
                      </div>

                      {referralCodeFromUrl && (
                        <input type="hidden" {...signUpForm.register("referralCode")} />
                      )}

                      <div className="pt-2">
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full h-[52px] bg-gradient-to-r from-[#D4AF37] via-[#DFBE57] to-[#C5A059] hover:from-[#C5A059] hover:to-[#B8860B] text-[#18181B] font-bold text-sm tracking-wide rounded-xl shadow-[0_8px_20px_-4px_rgba(212,175,55,0.35)] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <>
                              <OverraLoader size="xs" variant="inline" className="mr-2" />
                              <span>Creating your account...</span>
                            </>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-2">
                              Create Free Account
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                        </Button>
                      </div>

                      <p className="text-[11px] text-center text-[#8C8273] leading-snug pt-1">
                        By continuing, you agree to OverraPrep's{" "}
                        <a href="/terms" className="underline hover:text-[#18181B]">
                          Terms
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="underline hover:text-[#18181B]">
                          Privacy Policy
                        </a>
                        .
                      </p>
                    </form>
                  )}
                </>
              )}
            </div>

            {/* Trust Badges below Card */}
            <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-[#8C8273]">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                256-bit Encrypted
              </span>
              <span>•</span>
              <span>Curated Past Questions</span>
              <span>•</span>
              <span>Instant AI Tutor</span>
            </div>

            {/* Mobile Back to Home Link */}
            <div className="mt-6 flex justify-center lg:hidden">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C8273] hover:text-[#18181B] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Home
              </a>
            </div>
          </div>

          {/* Bottom Copyright footer */}
          <footer className="text-center text-[11px] text-[#A69D8E] pt-4">
            © {new Date().getFullYear()} OverraPrep AI. All rights reserved.
          </footer>
        </div>
      </main>

      {perfMode && <AuthPerfOverlay videoEnabled={false} />}
    </>
  );
};

export default Auth;
