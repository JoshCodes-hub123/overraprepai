import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { prefetchDashboardNeighbors } from "@/lib/routePrefetch";
import { track } from "@/lib/analytics";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { SEO } from "@/components/seo/SEO";
import { toast } from "@/hooks/use-toast";
import { SkeletonDashboard } from "@/components/ui/premium-skeletons";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import { CompleteProfileCard } from "@/components/student/CompleteProfileCard";
import { StudyPackHero } from "@/components/student/StudyPackHero";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/student/CommandPalette";
import { ContinueLearning } from "@/components/student/ContinueLearning";
import { TopHeader } from "@/components/student/dashboard/TopHeader";
import { QuickActionsGrid } from "@/components/student/dashboard/QuickActionsGrid";
import { OpportunityHubPreview } from "@/components/student/dashboard/OpportunityHubPreview";
import { StudentSpotlight } from "@/components/student/dashboard/StudentSpotlight";

// Warm likely-next route bundles when the dashboard mounts.
if (typeof window !== "undefined") prefetchDashboardNeighbors();

interface Stats {
  totalAttempts: number;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  practiceTime: number;
}

interface TutorProfile {
  id: string;
  full_name: string | null;
  profile_image_url: string | null;
  tutor_code: string | null;
  total_quizzes?: number;
  avg_rating?: number;
  total_ratings?: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  question_count: number;
  is_premium: boolean;
  token_cost: number;
  tutor_id: string | null;
  course: {
    id: string;
    code: string;
    name: string;
  };
  tutor?: TutorProfile | null;
  rating?: {
    average: number;
    count: number;
  } | null;
}

interface Wallet {
  balance: number;
  total_earned: number;
  total_spent: number;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding(user?.id);
  const [, setStats] = useState<Stats>({
    totalAttempts: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    averageScore: 0,
    practiceTime: 0,
  });
  const [, setWallet] = useState<Wallet | null>(null);
  const [, setQuizzes] = useState<Quiz[]>([]);
  const [, setCourses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [purchasedQuizIds, setPurchasedQuizIds] = useState<Set<string>>(new Set());
  const [, setRecentAttempts] = useState<any[]>([]);
  const [, setLastSimulation] = useState<{ quizId: string; title: string; duration: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setPurchaseRequests] = useState<any[]>([]);
  const [, setLastUpdated] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandPaletteHotkey(setPaletteOpen);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch quiz attempts
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("*, quizzes(id, title, course_id, duration_minutes, is_simulation, is_active, courses(code, name))")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false });

        if (attempts) {
          const completed = attempts.filter(a => a.completed_at);
          const totalCorrect = completed.reduce((sum, a) => sum + a.correct_answers, 0);
          const totalQuestions = completed.reduce((sum, a) => sum + a.total_questions, 0);
          const totalTime = completed.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);

          setStats({
            totalAttempts: completed.length,
            totalQuestions,
            correctAnswers: totalCorrect,
            averageScore: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
            practiceTime: Math.round(totalTime / 60),
          });

          setRecentAttempts(attempts.slice(0, 5));

          // Find most recent simulation attempt for "Retake CBT"
          const lastSim = attempts.find(
            (a: any) => (a.mode === "simulation" || a.quizzes?.is_simulation) && a.quizzes?.is_active
          );
          if (lastSim?.quizzes) {
            setLastSimulation({
              quizId: lastSim.quizzes.id ?? lastSim.quiz_id,
              title: lastSim.quizzes.title,
              duration: lastSim.quizzes.duration_minutes,
            });
          }
        }

        // Fetch wallet
        const { data: walletData } = await supabase
          .from("token_wallets")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (walletData) {
          setWallet(walletData);
        } else {
          // Create wallet if it doesn't exist
          const { data: newWallet } = await supabase
            .from("token_wallets")
            .insert({ user_id: user.id, balance: 50 })
            .select()
            .single();
          if (newWallet) setWallet(newWallet);
        }

        // Fetch all courses for filter dropdown
        const { data: coursesData } = await supabase
          .from("courses")
          .select("id, code, name")
          .eq("is_active", true)
          .order("code");

        if (coursesData) {
          setCourses(coursesData);
        }

        // Fetch available quizzes with tutor profiles
        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*, courses(id, code, name)")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (quizzesData) {
          // Fetch tutor profiles for quizzes that have tutors
          const tutorIds = [...new Set(quizzesData.filter(q => q.tutor_id).map(q => q.tutor_id))];
          let tutorProfiles: Record<string, TutorProfile> = {};
          
          if (tutorIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name, profile_image_url, tutor_code")
              .in("id", tutorIds);
            
            // Fetch tutor quiz counts
            const { data: tutorQuizCounts } = await supabase
              .from("quizzes")
              .select("tutor_id")
              .in("tutor_id", tutorIds)
              .eq("is_active", true);

            // Fetch all ratings for tutors' quizzes
            const { data: allTutorQuizzes } = await supabase
              .from("quizzes")
              .select("id, tutor_id")
              .in("tutor_id", tutorIds)
              .eq("is_active", true);

            let tutorRatings: Record<string, { sum: number; count: number }> = {};
            if (allTutorQuizzes && allTutorQuizzes.length > 0) {
              const allQuizIds = allTutorQuizzes.map(q => q.id);
              const { data: tutorQuizRatings } = await supabase
                .from("quiz_ratings")
                .select("quiz_id, rating")
                .in("quiz_id", allQuizIds);

              if (tutorQuizRatings) {
                // Map quiz_id to tutor_id
                const quizToTutor = allTutorQuizzes.reduce((acc, q) => {
                  acc[q.id] = q.tutor_id;
                  return acc;
                }, {} as Record<string, string>);

                // Aggregate ratings by tutor
                for (const r of tutorQuizRatings) {
                  const tutorId = quizToTutor[r.quiz_id];
                  if (tutorId) {
                    if (!tutorRatings[tutorId]) {
                      tutorRatings[tutorId] = { sum: 0, count: 0 };
                    }
                    tutorRatings[tutorId].sum += r.rating;
                    tutorRatings[tutorId].count += 1;
                  }
                }
              }
            }

            // Count quizzes per tutor
            const quizCountByTutor = tutorQuizCounts?.reduce((acc, q) => {
              acc[q.tutor_id] = (acc[q.tutor_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {};
            
            if (profiles) {
              tutorProfiles = profiles.reduce((acc, p) => {
                acc[p.id] = {
                  ...p,
                  total_quizzes: quizCountByTutor[p.id] || 0,
                  avg_rating: tutorRatings[p.id] ? tutorRatings[p.id].sum / tutorRatings[p.id].count : undefined,
                  total_ratings: tutorRatings[p.id]?.count || 0
                };
                return acc;
              }, {} as Record<string, TutorProfile>);
            }
          }

          // Fetch ratings for quizzes
          const quizIds = quizzesData.map(q => q.id);
          let quizRatings: Record<string, { average: number; count: number }> = {};

          if (quizIds.length > 0) {
            const { data: ratingsData } = await supabase
              .from("quiz_ratings")
              .select("quiz_id, rating")
              .in("quiz_id", quizIds);

            if (ratingsData && ratingsData.length > 0) {
              // Group ratings by quiz_id
              const ratingsByQuiz = ratingsData.reduce((acc, r) => {
                if (!acc[r.quiz_id]) {
                  acc[r.quiz_id] = [];
                }
                acc[r.quiz_id].push(r.rating);
                return acc;
              }, {} as Record<string, number[]>);

              // Calculate averages
              for (const [quizId, ratings] of Object.entries(ratingsByQuiz)) {
                const sum = ratings.reduce((a, b) => a + b, 0);
                quizRatings[quizId] = {
                  average: sum / ratings.length,
                  count: ratings.length
                };
              }
            }
          }

          setQuizzes(quizzesData.map(q => ({
            ...q,
            course: q.courses as { id: string; code: string; name: string },
            tutor: q.tutor_id ? tutorProfiles[q.tutor_id] || null : null,
            rating: quizRatings[q.id] || null
          })));
        }

        // Fetch purchased quizzes
        const { data: purchasedData } = await supabase
          .from("student_quiz_purchases")
          .select("quiz_id")
          .eq("student_id", user.id);

        if (purchasedData) {
          setPurchasedQuizIds(new Set(purchasedData.map(p => p.quiz_id)));
        }

        // Fetch pending purchase requests
        const { data: purchaseData } = await supabase
          .from("token_purchase_requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (purchaseData) {
          setPurchaseRequests(purchaseData);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Real-time subscription for new quizzes
  useEffect(() => {
    const channel = supabase
      .channel('quizzes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quizzes',
        },
        async (payload) => {
          try {
            const newQuiz = payload.new as any;
            if (!newQuiz.is_active) return;

            // Fetch course info
            const { data: courseData, error: courseError } = await supabase
              .from('courses')
              .select('id, code, name')
              .eq('id', newQuiz.course_id)
              .maybeSingle();

            if (courseError) {
              console.error('Error fetching course for new quiz:', courseError);
            }

            // Fetch tutor info if exists
            let tutorProfile = null;
            if (newQuiz.tutor_id) {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, profile_image_url, tutor_code')
                .eq('id', newQuiz.tutor_id)
                .maybeSingle();
              
              if (profileError) {
                console.error('Error fetching tutor profile for new quiz:', profileError);
              }
              tutorProfile = profile;
            }

            setQuizzes(prev => [{
              ...newQuiz,
              course: courseData,
              tutor: tutorProfile,
              rating: null
            }, ...prev]);

            // Show toast notification for new quiz
            toast({
              title: "New Quiz Available!",
              description: `"${newQuiz.title}" in ${courseData?.name || 'Unknown Course'} is now available.`,
            });
          } catch (error) {
            console.error('Error processing new quiz:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quizzes',
        },
        async (payload) => {
          try {
            const updatedQuiz = payload.new as any;
            setQuizzes(prev => prev.map(q => 
              q.id === updatedQuiz.id 
                ? { ...q, ...updatedQuiz }
                : q
            ).filter(q => q.is_active));
          } catch (error) {
            console.error('Error processing quiz update:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active for quizzes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Refresh quizzes function
  const refreshQuizzes = async () => {
    if (!user || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const { data: quizzesData, error } = await supabase
        .from("quizzes")
        .select("*, courses(id, code, name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error refreshing quizzes:", error);
        // Surface failure to PullToRefresh so it can show retry UI
        throw error;
      }

      if (quizzesData) {
        const tutorIds = [...new Set(quizzesData.filter(q => q.tutor_id).map(q => q.tutor_id))];
        let tutorProfiles: Record<string, TutorProfile> = {};
        
        if (tutorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, profile_image_url, tutor_code")
            .in("id", tutorIds);
          
          // Fetch tutor quiz counts
          const { data: tutorQuizCounts } = await supabase
            .from("quizzes")
            .select("tutor_id")
            .in("tutor_id", tutorIds)
            .eq("is_active", true);

          // Fetch all ratings for tutors' quizzes
          const { data: allTutorQuizzes } = await supabase
            .from("quizzes")
            .select("id, tutor_id")
            .in("tutor_id", tutorIds)
            .eq("is_active", true);

          let tutorRatings: Record<string, { sum: number; count: number }> = {};
          if (allTutorQuizzes && allTutorQuizzes.length > 0) {
            const allQuizIds = allTutorQuizzes.map(q => q.id);
            const { data: tutorQuizRatings } = await supabase
              .from("quiz_ratings")
              .select("quiz_id, rating")
              .in("quiz_id", allQuizIds);

            if (tutorQuizRatings) {
              const quizToTutor = allTutorQuizzes.reduce((acc, q) => {
                acc[q.id] = q.tutor_id;
                return acc;
              }, {} as Record<string, string>);

              for (const r of tutorQuizRatings) {
                const tutorId = quizToTutor[r.quiz_id];
                if (tutorId) {
                  if (!tutorRatings[tutorId]) {
                    tutorRatings[tutorId] = { sum: 0, count: 0 };
                  }
                  tutorRatings[tutorId].sum += r.rating;
                  tutorRatings[tutorId].count += 1;
                }
              }
            }
          }

          const quizCountByTutor = tutorQuizCounts?.reduce((acc, q) => {
            acc[q.tutor_id] = (acc[q.tutor_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          
          if (profiles) {
            tutorProfiles = profiles.reduce((acc, p) => {
              acc[p.id] = {
                ...p,
                total_quizzes: quizCountByTutor[p.id] || 0,
                avg_rating: tutorRatings[p.id] ? tutorRatings[p.id].sum / tutorRatings[p.id].count : undefined,
                total_ratings: tutorRatings[p.id]?.count || 0
              };
              return acc;
            }, {} as Record<string, TutorProfile>);
          }
        }

        setQuizzes(quizzesData.map(q => ({
          ...q,
          course: q.courses as { id: string; code: string; name: string },
          tutor: q.tutor_id ? tutorProfiles[q.tutor_id] || null : null,
          rating: null
        })));
      }

      // Also refresh wallet + recent attempts so widgets update immediately
      const [walletRes, attemptsRes] = await Promise.all([
        supabase.from("token_wallets").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("quiz_attempts")
          .select("*, quizzes(id, title, course_id, duration_minutes, is_simulation, is_active, courses(code, name))")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(20),
      ]);
      if (walletRes.data) setWallet(walletRes.data);
      if (attemptsRes.data) {
        const completed = attemptsRes.data.filter((a: any) => a.completed_at);
        const totalCorrect = completed.reduce((s: number, a: any) => s + a.correct_answers, 0);
        const totalQuestions = completed.reduce((s: number, a: any) => s + a.total_questions, 0);
        const totalTime = completed.reduce((s: number, a: any) => s + (a.time_spent_seconds || 0), 0);
        setStats({
          totalAttempts: completed.length,
          totalQuestions,
          correctAnswers: totalCorrect,
          averageScore: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
          practiceTime: Math.round(totalTime / 60),
        });
        setRecentAttempts(attemptsRes.data.slice(0, 5));
      }
      setLastUpdated(Date.now());
    } finally {
      setIsRefreshing(false);
    }
  };


  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Student Dashboard"
        description="Your academic home — Study Pack AI, practice, and progress in one calm view."
        noindex={true}
        url="https://overraprep.com/student/dashboard"
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <PullToRefresh onRefresh={refreshQuizzes}>
        <div className="min-h-screen bg-background pb-24 md:pb-12">
          <main className="container mx-auto px-4 pt-5 sm:pt-7 max-w-3xl">
            <DashboardOfflineBanner onReattempt={refreshQuizzes} />

            {/* 1. Greeting + streak + bell + avatar */}
            <TopHeader />

            {/* 2. Hero — Study Pack AI (single intelligent entry point) */}
            <StudyPackHero />

            {/* 3. Quick actions — 5 calm tiles */}
            <QuickActionsGrid />

            {/* 4. Continue learning — recent courses & study packs */}
            <ContinueLearning />

            {/* 5. Profile completion nudge (only when needed) */}
            <CompleteProfileCard profile={profile} />

            {/* 6. Opportunity Hub (preview, scoped per-university) */}
            <OpportunityHubPreview university={(profile as any)?.university || "FUTA"} />

            {/* 7. Student spotlight */}
            <StudentSpotlight university={(profile as any)?.university || "FUTA"} />
          </main>
        </div>

        <OnboardingDialog
          isOpen={showOnboarding}
          onComplete={completeOnboarding}
          userRole="student"
          userName={profile?.full_name || undefined}
        />
      </PullToRefresh>
    </>
  );
};

export default StudentDashboard;
