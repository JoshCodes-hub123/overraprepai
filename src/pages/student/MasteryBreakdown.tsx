import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppScreen } from "@/components/app-shell/AppScreen";
import { SEO } from "@/components/seo/SEO";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMasteryBreakdown,
  type CourseMastery,
  type WeakTopic,
  type MissedQuestion,
} from "@/hooks/useMasteryBreakdown";
import { TargetedDrillModal } from "@/components/progress/TargetedDrillModal";
import { CircularProgressGauge } from "@/components/progress/CircularProgressGauge";
import { StudyAnalyticsDashboard } from "@/components/student/analytics/StudyAnalyticsDashboard";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  GraduationCap,
  HelpCircle,
  Layers,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function MasteryBreakdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courseMasteries, weakTopics, summary, loading, refetch } = useMasteryBreakdown(user?.id);

  // Drill Modal State
  const [drillOpen, setDrillOpen] = useState(false);
  const [selectedTopicForDrill, setSelectedTopicForDrill] = useState<WeakTopic | null>(null);

  // Missed Questions Expander per Topic
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(new Set());

  // Individual AI explanation state
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const toggleExpandTopic = (topicId: string) => {
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const handleLaunchAllWeakDrill = () => {
    setSelectedTopicForDrill(null);
    setDrillOpen(true);
  };

  const handleLaunchSingleTopicDrill = (topic: WeakTopic) => {
    setSelectedTopicForDrill(topic);
    setDrillOpen(true);
  };

  const handleExplainWithAI = async (q: MissedQuestion) => {
    if (aiExplanations[q.id] || aiLoading[q.id]) return;
    setAiLoading((prev) => ({ ...prev, [q.id]: true }));

    try {
      const { data, error } = await supabase.functions.invoke("ai-explanation", {
        body: {
          question: q.question_text,
          options: {
            A: q.option_a,
            B: q.option_b,
            C: q.option_c,
            D: q.option_d,
          },
          correctOption: q.correct_option,
          userAnswer: q.selected_option,
          topic: q.topic_name,
        },
      });

      if (error) throw error;
      setAiExplanations((prev) => ({
        ...prev,
        [q.id]: data?.explanation || "Review the theoretical principle for this syllabus question.",
      }));
    } catch {
      setAiExplanations((prev) => ({
        ...prev,
        [q.id]: `Correct Answer: Option ${q.correct_option}. ${q.explanation || "Focus on reviewing this core concept in your lecture notes."}`,
      }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  const isColdStart = !loading && summary.totalAttempts === 0;

  return (
    <>
      <SEO
        title="Academic Progress & Diagnostics — OverraPrep AI"
        description="Data-driven university course mastery tracking and targeted weak-area remediation."
      />

      <AppScreen
        back
        title="Study Analytics & Academic Progress"
        subtitle="Performance progress over time, quiz accuracy trends, daily streaks & weak-area diagnostics"
        right={
          !isColdStart ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refetch()}
              className="text-neutral-600 hover:text-neutral-900 h-8 px-2 text-xs font-semibold"
              title="Refresh diagnostics"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>Refresh</span>
            </Button>
          ) : undefined
        }
      >
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
          {/* Interactive Recharts Study Analytics Dashboard */}
          <StudyAnalyticsDashboard />
          {/* ==================== ZERO-CLS SHIMMER LOADING STATE ==================== */}
          {loading && (
            <div className="space-y-6">
              {/* Hero Mastery Gauge Shimmer */}
              <div className="p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs flex flex-col sm:flex-row items-center gap-6">
                <Skeleton className="w-24 h-24 rounded-full shrink-0" />
                <div className="space-y-2 flex-1 w-full">
                  <Skeleton className="h-6 w-48 rounded-lg" />
                  <Skeleton className="h-4 w-72 rounded-md" />
                  <Skeleton className="h-3 w-40 rounded-md" />
                </div>
              </div>

              {/* 4 Metric Cards Shimmer */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>

              {/* Remediation Engine Box Shimmer */}
              <Skeleton className="h-36 rounded-3xl" />

              {/* Course Cards Grid Shimmer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
              </div>
            </div>
          )}

          {/* ==================== 1. COLD-START STATE ==================== */}
          {isColdStart && (
            <div className="space-y-6">
              {/* Primary Cold-Start Onboarding Card */}
              <Card className="p-6 sm:p-8 rounded-3xl border border-amber-200/90 bg-gradient-to-b from-amber-50/60 to-white text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center mx-auto mb-4 border border-amber-300/60">
                  <Target className="w-7 h-7" />
                </div>

                <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
                  Diagnostic Ready
                </Badge>

                <h2 className="font-display font-bold text-xl sm:text-2xl text-neutral-950 max-w-lg mx-auto">
                  Take your first CBT practice test to unlock your weak-topic diagnostic
                </h2>

                <p className="text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto mt-2 leading-relaxed">
                  OverraPrep AI tracks question attempt logs across your university courses (e.g., CSC 201, MAT 201, GST 101). Once you complete your first CBT practice test, your per-topic accuracy and AI gap diagnostics will calculate here automatically.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                  <Button
                    onClick={() => navigate("/practice")}
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs sm:text-sm h-11 px-6 rounded-xl shadow-xs flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Start CBT Practice</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate("/courses")}
                    className="w-full sm:w-auto border-neutral-300 font-semibold text-xs sm:text-sm h-11 px-5 rounded-xl hover:bg-neutral-100 text-neutral-800"
                  >
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    <span>Browse Enrolled Courses</span>
                  </Button>
                </div>
              </Card>

              {/* 3 Value Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                    <GraduationCap className="w-4 h-4 text-amber-700" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-neutral-900">
                    Real Course Mastery
                  </h3>
                  <p className="text-xs text-neutral-500 leading-normal">
                    Aggregates every attempt log across course codes so you know your true standing before exam day.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-neutral-900">
                    Automated Weak-Area Discovery
                  </h3>
                  <p className="text-xs text-neutral-500 leading-normal">
                    Any syllabus topic scoring below 60% is isolated into your targeted remediation feed.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-neutral-900">
                    1-Tap Targeted Remediation
                  </h3>
                  <p className="text-xs text-neutral-500 leading-normal">
                    Generate an adaptive 10-question drill session focused strictly on your misconceptions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. ACTIVE PROGRESS STATE ==================== */}
          {!loading && !isColdStart && (
            <div className="space-y-6">
              {/* ==================== HERO ACADEMIC MASTERY GAUGE ==================== */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <CircularProgressGauge
                    percentage={summary.overallAccuracy}
                    size={104}
                    strokeWidth={9}
                    sublabel="Mastery"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h2 className="font-display font-extrabold text-xl sm:text-2xl text-neutral-950">
                        Academic Standing
                      </h2>
                      <Badge
                        className={`text-[11px] px-2.5 py-0.5 font-bold ${
                          summary.overallAccuracy >= 75
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : summary.overallAccuracy >= 50
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-rose-100 text-rose-800 border-rose-300"
                        }`}
                      >
                        {summary.overallAccuracy >= 75
                          ? "First Class Standing"
                          : summary.overallAccuracy >= 50
                          ? "On Track / Proficient"
                          : "Intensive Revision Needed"}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-500 max-w-md leading-relaxed">
                      {summary.totalQuestionsCorrect} out of {summary.totalQuestionsAttempted} verified university examination questions answered correctly across {summary.coursesCount} course{summary.coursesCount === 1 ? "" : "s"}.
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto">
                  <Button
                    onClick={() => navigate("/practice")}
                    className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm min-h-[48px] h-12 px-6 rounded-2xl shadow-xs flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Practice CBT Questions</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Top Overview Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Overall Accuracy
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-950">
                      {summary.overallAccuracy}%
                    </span>
                    <Badge className={`text-[10px] px-1.5 py-0 font-bold ${
                      summary.overallAccuracy >= 75
                        ? "bg-emerald-100 text-emerald-800"
                        : summary.overallAccuracy >= 50
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {summary.overallAccuracy >= 75 ? "High" : summary.overallAccuracy >= 50 ? "Satisfactory" : "Low"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {summary.totalQuestionsCorrect} of {summary.totalQuestionsAttempted} correct
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Questions Practiced
                  </span>
                  <span className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-950 mt-1 block">
                    {summary.totalQuestionsAttempted}
                  </span>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    across {summary.totalAttempts} CBT test{summary.totalAttempts === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Courses Analyzed
                  </span>
                  <span className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-950 mt-1 block">
                    {summary.coursesCount}
                  </span>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    with verified test logs
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Weak Areas (&lt;60%)
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`font-display font-extrabold text-2xl sm:text-3xl ${
                      summary.weakTopicsCount > 0 ? "text-amber-700" : "text-emerald-700"
                    }`}>
                      {summary.weakTopicsCount}
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-500">
                      topic{summary.weakTopicsCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {summary.weakTopicsCount > 0 ? "needs targeted drill" : "all topics ≥ 60%"}
                  </p>
                </div>
              </div>

              {/* ==================== 3. TARGETED REMEDIATION ENGINE ==================== */}
              <div className="rounded-3xl border border-amber-300/80 bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-white p-5 sm:p-7 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center font-bold">
                        <Zap className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Targeted Remediation Engine
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-lg sm:text-xl text-neutral-950 pt-1">
                      {weakTopics.length > 0
                        ? `${weakTopics.length} Weak Topic${weakTopics.length === 1 ? "" : "s"} Flagged for Remediation`
                        : "All Course Topics at or Above 60%"}
                    </h3>

                    <p className="text-xs text-neutral-600 max-w-xl leading-relaxed">
                      {weakTopics.length > 0
                        ? "OverraPrep AI has identified syllabus concepts where your accuracy dropped below 60%. Launch a focused 10-question drill session to master these misconceptions."
                        : "Excellent preparation! None of your tested topics currently fall below 60% accuracy. Continue practicing standard CBT examinations to keep knowledge fresh."}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {weakTopics.length > 0 ? (
                      <Button
                        onClick={handleLaunchAllWeakDrill}
                        className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs sm:text-sm min-h-[48px] h-12 px-6 rounded-2xl shadow-xs flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Drill Weak Areas (10 Questions)</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigate("/practice")}
                        className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm min-h-[48px] h-12 px-6 rounded-2xl flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <span>Simulate Full CBT</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* ==================== 4. WEAK AREAS FEED (<60%) ==================== */}
              {weakTopics.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-base text-neutral-950">
                        Weak Areas Feed (&lt; 60% Accuracy)
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        These syllabus topics directly cost you marks on recent practice attempts.
                      </p>
                    </div>

                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[11px]">
                      {weakTopics.length} Flagged
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {weakTopics.map((topic) => {
                      const isExpanded = expandedTopicIds.has(topic.topicId);

                      return (
                        <Card
                          key={`${topic.courseId}-${topic.topicId}`}
                          className="p-4 sm:p-5 rounded-2xl border border-neutral-200/90 hover:border-amber-400/80 transition-colors shadow-2xs space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-display font-bold text-sm sm:text-base text-neutral-950">
                                  {topic.topicName}
                                </span>
                                <Badge variant="outline" className="text-[11px] font-bold border-neutral-300 bg-neutral-50 text-neutral-800">
                                  {topic.courseCode}
                                </Badge>
                                <Badge className={topic.severity === "critical"
                                  ? "bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold"
                                  : "bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold"
                                }>
                                  {topic.severity === "critical" ? "Critical Gap (<40%)" : "Needs Revision (40-59%)"}
                                </Badge>
                              </div>

                              <p className="text-xs text-neutral-500">
                                {topic.courseName} · {topic.missed} question{topic.missed === 1 ? "" : "s"} missed out of {topic.attempted} tested
                              </p>
                            </div>

                            {/* Accuracy and Actions */}
                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                              <div className="text-right">
                                <span className="font-display font-extrabold text-xl sm:text-2xl text-neutral-950 block leading-tight">
                                  {topic.accuracy}%
                                </span>
                                <span className="text-[10px] uppercase font-bold text-neutral-400">
                                  Accuracy
                                </span>
                              </div>

                              <Button
                                size="sm"
                                onClick={() => handleLaunchSingleTopicDrill(topic)}
                                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs min-h-[44px] h-11 px-4 rounded-xl shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Drill Topic</span>
                              </Button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <Progress
                              value={topic.accuracy}
                              className={`h-1.5 ${topic.severity === "critical" ? "[&>div]:bg-rose-500" : "[&>div]:bg-amber-500"}`}
                            />
                          </div>

                          {/* Expand Missed Questions Toggle */}
                          {topic.missedQuestions.length > 0 && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => toggleExpandTopic(topic.topicId)}
                                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 transition"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                <span>
                                  {isExpanded
                                    ? "Hide Missed Questions"
                                    : `Review ${topic.missedQuestions.length} Missed Question${topic.missedQuestions.length === 1 ? "" : "s"} & AI Explanations`}
                                </span>
                              </button>

                              {/* Expanded Missed Questions List */}
                              {isExpanded && (
                                <div className="mt-3 space-y-3 pt-3 border-t border-neutral-100">
                                  {topic.missedQuestions.map((q, qIdx) => {
                                    const aiExplanation = aiExplanations[q.id];
                                    const isAiLoading = aiLoading[q.id];

                                    return (
                                      <div
                                        key={q.id}
                                        className="p-3.5 rounded-xl bg-neutral-50/70 border border-neutral-200/80 text-xs space-y-2.5"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="font-semibold text-neutral-950 flex-1">
                                            <span className="font-bold text-amber-800 mr-1.5">Q{qIdx + 1}.</span>
                                            {q.question_text}
                                          </p>
                                          <Badge className="bg-rose-100 text-rose-800 shrink-0 text-[10px]">
                                            {q.selected_option ? `Chose ${q.selected_option}` : "Missed"}
                                          </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                          {(["A", "B", "C", "D"] as const).map((letter) => {
                                            const text = letter === "A" ? q.option_a
                                              : letter === "B" ? q.option_b
                                              : letter === "C" ? q.option_c
                                              : q.option_d;
                                            if (!text) return null;
                                            const isCorrectOption = letter.toUpperCase() === q.correct_option?.toUpperCase();
                                            const isStudentSelection = letter.toUpperCase() === q.selected_option?.toUpperCase();

                                            return (
                                              <div
                                                key={letter}
                                                className={`p-2 rounded-lg border flex items-start gap-1.5 ${
                                                  isCorrectOption
                                                    ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold"
                                                    : isStudentSelection
                                                    ? "bg-rose-50 border-rose-300 text-rose-950"
                                                    : "bg-white border-neutral-200 text-neutral-700"
                                                }`}
                                              >
                                                <span className="font-bold">{letter}.</span>
                                                <span className="flex-1">{text}</span>
                                                {isCorrectOption && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                                {isStudentSelection && !isCorrectOption && <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {q.explanation && (
                                          <p className="text-[11px] text-neutral-600 bg-white p-2 rounded-lg border border-neutral-200">
                                            <span className="font-bold text-neutral-900">Syllabus Note: </span>
                                            {q.explanation}
                                          </p>
                                        )}

                                        {/* AI Solution */}
                                        {aiExplanation ? (
                                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-neutral-800 space-y-1">
                                            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                                              <Sparkles className="w-3 h-3 text-amber-600" />
                                              <span>AI Tutor Solution</span>
                                            </div>
                                            <p className="leading-relaxed whitespace-pre-wrap">{aiExplanation}</p>
                                          </div>
                                        ) : (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isAiLoading}
                                            onClick={() => handleExplainWithAI(q)}
                                            className="h-7 text-[11px] font-semibold border-amber-300 text-amber-900 hover:bg-amber-50 rounded-lg flex items-center gap-1"
                                          >
                                            {isAiLoading ? (
                                              <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                <span>Explaining concept…</span>
                                              </>
                                            ) : (
                                              <>
                                                <Brain className="w-3 h-3 text-amber-600" />
                                                <span>Explain Concept with AI</span>
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ==================== 5. COURSE-LEVEL MASTERY BREAKDOWN ==================== */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-base text-neutral-950">
                      Enrolled Courses Mastery Breakdown
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Performance tracked by official university course code (e.g., CSC 201, MAT 201).
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-neutral-500">
                    {courseMasteries.length} Course{courseMasteries.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {courseMasteries.map((course) => (
                    <Card
                      key={course.courseId}
                      className="p-4 sm:p-5 rounded-2xl border border-neutral-200/90 hover:border-neutral-300 transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-neutral-950 truncate">
                              {course.courseCode}
                            </span>
                            <Badge className={
                              course.status === "mastered"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold"
                                : course.status === "proficient"
                                ? "bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold"
                                : "bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold"
                            }>
                              {course.status === "mastered" ? "Mastered" : course.status === "proficient" ? "Proficient" : "Needs Work"}
                            </Badge>
                          </div>
                          <p className="text-xs text-neutral-500 truncate mt-0.5">
                            {course.courseName}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center justify-center">
                          <CircularProgressGauge
                            percentage={course.accuracy}
                            size={48}
                            strokeWidth={5}
                            showText={true}
                          />
                        </div>
                      </div>

                      <Progress
                        value={course.accuracy}
                        className={`h-1.5 ${
                          course.status === "mastered"
                            ? "[&>div]:bg-emerald-500"
                            : course.status === "proficient"
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-rose-500"
                        }`}
                      />

                      <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                        <span>{course.attempted} questions tested</span>
                        <span>{course.avgTimeSec}s avg speed</span>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/courses/${course.courseId}`)}
                          className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 min-h-[40px] h-10 px-3 flex items-center gap-1 active:scale-95"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Course Outline</span>
                          <ArrowRight className="w-3 h-3 ml-0.5" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Find weak topics for this course or drill all topics
                            const courseWeak = weakTopics.filter((w) => w.courseId === course.courseId);
                            if (courseWeak.length > 0) {
                              setSelectedTopicForDrill(courseWeak[0]);
                              setDrillOpen(true);
                            } else {
                              navigate(`/courses/${course.courseId}`);
                            }
                          }}
                          className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-50 min-h-[40px] h-10 px-4 rounded-xl active:scale-95 transition-all"
                        >
                          <Zap className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          <span>Drill Course</span>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </AppScreen>

      {/* 1-Tap Targeted Remediation Drill Modal */}
      <TargetedDrillModal
        isOpen={drillOpen}
        onClose={() => setDrillOpen(false)}
        weakTopics={weakTopics}
        selectedTopic={selectedTopicForDrill}
        onCompleted={() => {
          void refetch();
        }}
      />
    </>
  );
}
