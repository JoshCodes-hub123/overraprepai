import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SEO } from "@/components/seo/SEO";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PurchaseQuizDialog } from "@/components/student/PurchaseQuizDialog";
import { toast } from "sonner";
import {
  Clock,
  FileText,
  BookOpen,
  Coins,
  Play,
  Lock,
  Share2,
  User,
  Star,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  question_count: number;
  is_premium: boolean;
  token_cost: number;
  is_active: boolean;
  is_simulation: boolean;
  tutor_id: string | null;
  level: string | null;
  course: {
    id: string;
    code: string;
    name: string;
    level?: string | null;
  };
}

interface TutorProfile {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  tutor_code: string | null;
}

interface Rating {
  average: number;
  count: number;
}

const QuizPreview = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const studentLevel = ((profile as any)?.level as string | null | undefined) ?? null;
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (!quizId) return;

      try {
        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select(`
            *,
            course:courses(id, code, name, level)
          `)
          .eq("id", quizId)
          .single();

        if (quizError || !quizData) {
          toast.error("Quiz not found");
          navigate("/");
          return;
        }

        setQuiz(quizData as Quiz);

        // Fetch tutor profile if exists
        if (quizData.tutor_id) {
          const { data: tutorData } = await supabase
            .from("profiles")
            .select("id, full_name, profile_image_url, tutor_code")
            .eq("id", quizData.tutor_id)
            .single();

          if (tutorData) {
            setTutor(tutorData);
          }
        }

        // Fetch ratings
        const { data: ratingsData } = await supabase
          .from("quiz_ratings")
          .select("rating")
          .eq("quiz_id", quizId);

        if (ratingsData && ratingsData.length > 0) {
          const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
          setRating({ average: avg, count: ratingsData.length });
        }

        // Check if user has purchased (if logged in)
        if (user) {
          const { data: purchaseData } = await supabase
            .from("student_quiz_purchases")
            .select("id")
            .eq("quiz_id", quizId)
            .eq("student_id", user.id)
            .maybeSingle();

          setHasPurchased(!!purchaseData);

          // Fetch wallet
          const { data: walletData } = await supabase
            .from("token_wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();

          if (walletData) {
            setWallet(walletData);
          }
        }
      } catch (error) {
        console.error("Error fetching quiz:", error);
        toast.error("Failed to load quiz");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId, user, navigate]);

  const handleStartQuiz = () => {
    if (!quiz) return;

    if (!user) {
      toast.error("Please sign in to take this quiz");
      navigate("/auth", { state: { returnTo: `/quiz/${quizId}` } });
      return;
    }

    const reqLvl = quiz.level || quiz.course?.level || null;
    const locked = !!studentLevel && !!reqLvl && reqLvl !== studentLevel;
    if (locked) {
      const requiredLevel = reqLvl;
      toast.error(`This quiz is for ${requiredLevel} students. Switch your level in your profile to start.`);
      return;
    }

    if (quiz.is_premium && !hasPurchased) {
      setShowPurchaseDialog(true);
      return;
    }

    // Navigate to appropriate quiz mode
    if (quiz.is_simulation) {
      navigate(`/quiz/${quizId}/simulation`);
    } else {
      navigate(`/quiz/${quizId}/practice`);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/quiz/${quizId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: quiz?.title || "Quiz",
          text: `Check out this quiz: ${quiz?.title}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePurchaseSuccess = () => {
    setHasPurchased(true);
    setShowPurchaseDialog(false);
    // Celebratory unlock toast
    toast.success("🎉 You have unlocked this quiz — go on to succeed!", {
      duration: 3200,
      description: "Starting now…",
    });
    // Refresh wallet
    if (user) {
      supabase
        .from("token_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setWallet(data);
        });
    }
    // Auto-launch the quiz
    setTimeout(() => {
      if (!quiz) return;
      if (quiz.is_simulation) navigate(`/quiz/${quiz.id}/simulation`);
      else navigate(`/quiz/${quiz.id}/practice`);
    }, 900);
  };

  if (isLoading || authLoading) {
    return <LoadingSpinner />;
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Quiz not found</h1>
          <p className="text-muted-foreground mb-4">
            This quiz may have been removed or is no longer available.
          </p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const requiredLevel = quiz.level || quiz.course?.level || null;
  const levelLocked = !!studentLevel && !!requiredLevel && requiredLevel !== studentLevel;
  const canStart = (!quiz.is_premium || hasPurchased) && !levelLocked;

  return (
    <>
      <SEO 
        title={`${quiz.title} - OverraPrep AI`}
        description={quiz.description || `Practice ${quiz.course.name} with this ${quiz.question_count}-question quiz`}
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={logo} alt="OverraPrep" className="h-8 w-auto" />
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Share"}
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-2xl">
          {/* Quiz Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {quiz.course.code}
                    </Badge>
                    {quiz.is_simulation && (
                      <Badge variant="outline">
                        <Clock className="w-3 h-3 mr-1" />
                        CBT Simulation
                      </Badge>
                    )}
                    {quiz.is_premium && (
                      <Badge className="bg-accent text-accent-foreground">
                        <Coins className="w-3 h-3 mr-1" />
                        {quiz.token_cost} tokens
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl mb-2">{quiz.title}</CardTitle>
                  {quiz.description && (
                    <CardDescription className="text-base">
                      {quiz.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Quiz Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="font-semibold">{quiz.question_count}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-semibold">{quiz.duration_minutes} min</p>
                  </div>
                </div>
                {rating && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Rating</p>
                      <p className="font-semibold">
                        {rating.average.toFixed(1)} ({rating.count})
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tutor Info */}
              {tutor && (
                <div
                  className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/tutor/${tutor.id}`)}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={tutor.profile_image_url || undefined} />
                    <AvatarFallback>
                      {tutor.full_name?.charAt(0) || <User className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{tutor.full_name || "Anonymous Tutor"}</p>
                    {tutor.tutor_code && (
                      <p className="text-sm text-muted-foreground">{tutor.tutor_code}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Start Button */}
              <div className="pt-2">
                {levelLocked ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                      <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-display font-bold text-amber-900">
                          This quiz is for {requiredLevel} students
                        </p>
                        <p className="text-sm text-amber-800 mt-0.5">
                          You're currently on {studentLevel}. Switch your level in your profile to unlock it.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/profile/edit")}
                    >
                      Switch level in profile
                    </Button>
                  </div>
                ) : quiz.is_premium && !hasPurchased ? (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleStartQuiz}
                  >
                    <Lock className="w-5 h-5 mr-2" />
                    Unlock for {quiz.token_cost} tokens
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="hero"
                    className="w-full"
                    onClick={handleStartQuiz}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {quiz.is_simulation ? "Start CBT Simulation" : "Start Practice"}
                  </Button>
                )}

                {!user && (
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    You'll need to sign in to take this quiz
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Course Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Course Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{quiz.course.code}</p>
                  <p className="text-sm text-muted-foreground">{quiz.course.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Purchase Dialog */}
      {quiz && showPurchaseDialog && wallet && (
        <PurchaseQuizDialog
          open={showPurchaseDialog}
          onOpenChange={setShowPurchaseDialog}
          quiz={{
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            token_cost: quiz.token_cost,
            tutor_id: quiz.tutor_id,
          }}
          walletBalance={wallet.balance}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </>
  );
};

export default QuizPreview;
