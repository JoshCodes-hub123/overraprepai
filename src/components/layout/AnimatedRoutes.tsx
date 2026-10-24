import { lazy, Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import PageTransition from "./PageTransition";
import { TutorPendingGate } from "@/components/auth/TutorPendingGate";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ContentAdminRoute } from "@/components/auth/ContentAdminRoute";
import { RoleRoute } from "@/components/auth/RoleRoute";
import RouteErrorBoundary from "@/components/system/RouteErrorBoundary";
import { FEATURES } from "@/config/features";
import ComingSoon from "@/pages/ComingSoon";
import { Navigate } from "react-router-dom";

// Eager load the native welcome screen for best LCP (new `/`)
import Welcome from "@/pages/app/Welcome";
const Index = lazy(() => import("@/pages/Index"));
const MobileWelcome = lazy(() => import("@/pages/app/MobileWelcome"));
const ReleaseNotes = lazy(() => import("@/pages/ReleaseNotes"));

const Flashcards = lazy(() => import("@/pages/flashcards/Flashcards"));
import EnvironmentGuard from "@/components/routing/EnvironmentGuard";

const SurvivalKits = lazy(() => import("@/pages/survival-kits/SurvivalKits"));
const SurvivalKitView = lazy(() => import("@/pages/survival-kits/SurvivalKitView"));
const Strategy = lazy(() => import("@/pages/strategy/Strategy"));
const AITutor = lazy(() => import("@/pages/ai-tutor/AITutor"));
const CoachHome = lazy(() => import("@/pages/coach/CoachHome"));
const CoachChat = lazy(() => import("@/pages/coach/CoachChat"));
const ViralMode = lazy(() => import("@/pages/viral/ViralMode"));

// Lazy load all other pages for code splitting
const Auth = lazy(() => import("@/pages/Auth"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const StudentDashboard = lazy(() => import("@/pages/student/StudentDashboard"));
const ExamReadiness = lazy(() => import("@/pages/student/ExamReadiness"));
const WeakAreaDrill = lazy(() => import("@/pages/student/WeakAreaDrill"));
const MasteryBreakdown = lazy(() => import("@/pages/student/MasteryBreakdown"));
const OfflinePractice = lazy(() => import("@/pages/student/OfflinePractice"));
const OfflineRunner = lazy(() => import("@/pages/student/OfflineRunner"));
const AudioLearning = lazy(() => import("@/pages/student/AudioLearning"));
const SmartSummary = lazy(() => import("@/pages/student/SmartSummary"));
const Learn = lazy(() => import("@/pages/student/Learn"));
const TutorQuestionCards = lazy(() => import("@/pages/tutor/TutorQuestionCards"));
const TutorDashboard = lazy(() => import("@/pages/tutor/TutorDashboard"));
const TutorProfile = lazy(() => import("@/pages/tutor/TutorProfile"));
const BrowseTutors = lazy(() => import("@/pages/tutor/BrowseTutors"));
const ApplyTutor = lazy(() => import("@/pages/ApplyTutor"));
const TutorApplications = lazy(() => import("@/pages/admin/TutorApplications"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const QuizPreview = lazy(() => import("@/pages/quiz/QuizPreview"));
const QuizPractice = lazy(() => import("@/pages/quiz/QuizPractice"));
const CBTSimulation = lazy(() => import("@/pages/quiz/CBTSimulation"));
const QuizResults = lazy(() => import("@/pages/quiz/QuizResults"));
const AllQuizzes = lazy(() => import("@/pages/student/AllQuizzes"));
const EditProfile = lazy(() => import("@/pages/profile/EditProfile"));
const PreparationSettings = lazy(() => import("@/pages/profile/PreparationSettings"));
const PublicProfile = lazy(() => import("@/pages/profile/PublicProfile"));
const Community = lazy(() => import("@/pages/Community"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const TeamStatsPage = lazy(() => import("@/pages/TeamStatsPage"));
const CommunityView = lazy(() => import("@/pages/community/CommunityView"));
const TheoryPrep = lazy(() => import("@/pages/theory/TheoryPrep"));
const TheoryCourseView = lazy(() => import("@/pages/theory/TheoryCourseView"));
const TheoryQuestionView = lazy(() => import("@/pages/theory/TheoryQuestionView"));
const StudyHub = lazy(() => import("@/pages/study-hub/StudyHub"));
const StudyHubCourse = lazy(() => import("@/pages/study-hub/StudyHubCourse"));
const PQIntelligence = lazy(() => import("@/pages/study-hub/PQIntelligence"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Settings = lazy(() => import("@/pages/settings/Settings"));
const AcademicSettings = lazy(() => import("@/pages/settings/AcademicSettings"));
const ProfileSettings = lazyWithRetry(() => import("@/pages/settings/ProfileSettings"));
const HelpSupport = lazy(() => import("@/pages/HelpSupport"));

// SEO landing shells (public, indexable)
const SEOUniversityPage = lazy(() => import("@/pages/seo/UniversityPage"));
const SEOTopicPage = lazy(() => import("@/pages/seo/TopicPage"));
const SEOFlashcardGenerator = lazy(() => import("@/pages/seo/FlashcardGenerator"));
const SEOQuizGenerator = lazy(() => import("@/pages/seo/QuizGenerator"));
const SEOMockExams = lazy(() => import("@/pages/seo/MockExams"));
const StartupChecklist = lazy(() => import("@/pages/admin/StartupChecklist"));
const Terms = lazy(() => import("@/pages/legal/Terms"));
const Privacy = lazy(() => import("@/pages/legal/Privacy"));
const PrivacySettings = lazy(() => import("@/pages/settings/PrivacySettings"));
const NotificationSettings = lazy(() => import("@/pages/settings/NotificationSettings"));
const DeviceSessions = lazy(() => import("@/pages/settings/DeviceSessions"));
const LectureNotes = lazy(() => import("@/pages/tutor/LectureNotes"));
const Inbox = lazy(() => import("@/pages/messages/Inbox"));
const Announcements = lazy(() => import("@/pages/announcements/Announcements"));
const QABoard = lazy(() => import("@/pages/qa/QABoard"));
const QAQuestion = lazy(() => import("@/pages/qa/QAQuestion"));
const MyCourses = lazy(() => import("@/pages/student/MyCourses"));
const StudentTutorCourses = lazy(() => import("@/pages/student/StudentTutorCourses"));
const StudentLibraryHistory = lazy(() => import("@/pages/student/StudentLibraryHistory"));
const TutorCourses = lazy(() => import("@/pages/tutor/TutorCourses"));
const TutorCurricula = lazy(() => import("@/pages/tutor/TutorCurricula"));
const TutorCurriculumBuilder = lazy(() => import("@/pages/tutor/TutorCurriculumBuilder"));
const AdminCourses = lazy(() => import("@/pages/admin/AdminCourses"));
const AdminBulkUpload = lazy(() => import("@/pages/admin/AdminBulkUpload"));
const AdminContentManagement = lazy(() => import("@/pages/admin/AdminContentManagement"));
const CommunityWall = lazy(() => import("@/pages/community/CommunityWall"));

// Unified 2-step University Onboarding
const UniversityOnboarding = lazy(() => import("@/pages/onboarding/UniversityOnboarding"));
const ChooseProduct = lazy(() => import("@/pages/onboarding/ChooseProduct"));
const ChoosePath = lazy(() => import("@/pages/onboarding/ChoosePath"));
const RefinePath = lazy(() => import("@/pages/onboarding/RefinePath"));
const ChooseUniversity = lazy(() => import("@/pages/onboarding/ChooseUniversity"));
const ChooseFaculty = lazy(() => import("@/pages/onboarding/ChooseFaculty"));

const ChooseDepartment = lazy(() => import("@/pages/onboarding/ChooseDepartment"));
const ChooseLevel = lazy(() => import("@/pages/onboarding/ChooseLevel"));
const ChooseCourses = lazy(() => import("@/pages/onboarding/ChooseCourses"));
const TutorMatchingOnboarding = lazy(() => import("@/pages/onboarding/TutorMatching"));
const CGPACalculator = lazy(() => import("@/pages/student/CGPACalculator"));
const StudyPacks = lazy(() => import("@/pages/student/StudyPacks"));
const Library = lazy(() => import("@/pages/student/Library"));
const UploadAnalytics = lazy(() => import("@/pages/student/UploadAnalytics"));
const OfflineDownloads = lazy(() => import("@/pages/student/OfflineDownloads"));
const AIHistory = lazy(() => import("@/pages/student/AIHistory"));
const AIQuizRunner = lazy(() => import("@/pages/student/AIQuizRunner"));
const ChatInbox = lazy(() => import("@/pages/chat/Inbox"));
const ChatThread = lazy(() => import("@/pages/chat/ThreadView"));
const ChatJoin = lazy(() => import("@/pages/chat/ChatJoin"));
const Review = lazy(() => import("@/pages/student/Review"));
const Sessions = lazy(() => import("@/pages/sessions/Sessions"));
const TutorSessions = lazy(() => import("@/pages/tutor/TutorSessions"));
const Install = lazy(() => import("@/pages/Install"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const MockExams = lazy(() => import("@/pages/exams/MockExams"));
const MockExamTake = lazy(() => import("@/pages/exams/MockExamTake"));
const MockExamResult = lazy(() => import("@/pages/exams/MockExamResult"));
const RemediationPlaylists = lazy(() => import("@/pages/student/RemediationPlaylists"));
const TutorPayouts = lazy(() => import("@/pages/tutor/TutorPayouts"));
const TutorStorefrontEditor = lazy(() => import("@/pages/tutor/TutorStorefrontEditor"));
const StorefrontPublic = lazy(() => import("@/pages/StorefrontPublic"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const StudyCoach = lazy(() => import("@/pages/student/StudyCoach"));
const SocialFeed = lazy(() => import("@/pages/social/Feed"));
const WeeklyLeaderboard = lazy(() => import("@/pages/social/WeeklyLeaderboard"));
const AdminFeatureFlags = lazy(() => import("@/pages/admin/AdminFeatureFlags"));
const AdminModeration = lazy(() => import("@/pages/admin/AdminModeration"));
const AdminTutorScorecards = lazy(() => import("@/pages/admin/AdminTutorScorecards"));
const AdminWithdrawals = lazy(() => import("@/pages/admin/AdminWithdrawals"));
const AdminCohorts = lazy(() => import("@/pages/admin/AdminCohorts"));
const AdminCampaigns = lazy(() => import("@/pages/admin/AdminCampaigns"));
const AdminInsights = lazy(() => import("@/pages/admin/AdminInsights"));
const AdminAudit = lazy(() => import("@/pages/admin/AdminAudit"));
const AdminTrust = lazy(() => import("@/pages/admin/AdminTrust"));
const AdminBroadcast = lazy(() => import("@/pages/admin/AdminBroadcast"));
const AdminFeedback = lazy(() => import("@/pages/admin/AdminFeedback"));
const SmartSearch = lazy(() => import("@/pages/SmartSearch"));
const LiveRoom = lazy(() => import("@/pages/sessions/LiveRoom"));
const CopilotPage = lazy(() => import("@/pages/student/CopilotPage"));
const TutorGrowthStudio = lazy(() => import("@/pages/tutor/TutorGrowthStudio"));
const AffiliateRedirect = lazy(() => import("@/pages/AffiliateRedirect"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const CourseDirectory = lazy(() => import("@/pages/courses/CourseDirectory"));
const CourseHub = lazy(() => import("@/pages/courses/CourseHub"));
const CoursesScreen = lazy(() => import("@/pages/courses/CoursesScreen"));
const CourseWorkspace = lazy(() => import("@/pages/courses/CourseWorkspace"));
const TopicDetail = lazy(() => import("@/pages/courses/TopicDetail"));
const TopicPractice = lazy(() => import("@/pages/courses/TopicPractice"));
const WeakAreas = lazy(() => import("@/pages/student/WeakAreas"));

const TutorCourseEditor = lazy(() => import("@/pages/tutor/TutorCourseEditor"));
const Subscription = lazy(() => import("@/pages/student/Subscription"));
const Referrals = lazy(() => import("@/pages/student/Referrals"));
const Wallet = lazy(() => import("@/pages/student/Wallet"));
const AdminPaymentRequests = lazy(() => import("@/pages/admin/PaymentRequests"));
const Opportunities = lazy(() => import("@/pages/opportunities/Opportunities"));
const OpportunityDetail = lazy(() => import("@/pages/opportunities/OpportunityDetail"));
const AdminOpportunities = lazy(() => import("@/pages/admin/AdminOpportunities"));
const PostsFeed = lazy(() => import("@/pages/posts/PostsFeed"));
const PostDetail = lazy(() => import("@/pages/posts/PostDetail"));
const PostComposer = lazy(() => import("@/pages/posts/PostComposer"));
const SavedArticles = lazy(() => import("@/pages/posts/SavedArticles"));
const AdminPosts = lazy(() => import("@/pages/admin/AdminPosts"));
const Spotlight = lazy(() => import("@/pages/student/Spotlight"));
const AdminSpotlights = lazy(() => import("@/pages/admin/AdminSpotlights"));
const ActivityFeed = lazy(() => import("@/pages/student/ActivityFeed"));
const Challenges = lazy(() => import("@/pages/student/Challenges"));
const AdminChallenges = lazy(() => import("@/pages/admin/AdminChallenges"));
const AdminArena = lazy(() => import("@/pages/admin/AdminArena"));
const ArenaHome = lazyWithRetry(() => import("@/pages/arena/ArenaHome"));
const ArenaDetail = lazyWithRetry(() => import("@/pages/arena/ArenaDetail"));
const ArenaPlay = lazyWithRetry(() => import("@/pages/arena/ArenaPlay"));
const ArenaLeaderboard = lazyWithRetry(() => import("@/pages/arena/ArenaLeaderboard"));
const StudyMode = lazy(() => import("@/pages/student/StudyMode"));
const StudyHubPage = lazyWithRetry(() => import("@/pages/hubs/StudyHubPage"));
const PracticeHubPage = lazyWithRetry(() => import("@/pages/hubs/PracticeHubPage"));
const PeopleHubPage = lazyWithRetry(() => import("@/pages/hubs/PeopleHubPage"));
const MeHubPage = lazyWithRetry(() => import("@/pages/hubs/MeHubPage"));
const IntelligenceCenter = lazy(() => import("@/pages/intelligence/IntelligenceCenter"));
const GrowthHome = lazy(() => import("@/pages/growth/GrowthHome"));
const CampusBattles = lazy(() => import("@/pages/growth/CampusBattles"));
const CampusBattleDetail = lazy(() => import("@/pages/growth/CampusBattleDetail"));
const Ambassadors = lazy(() => import("@/pages/growth/Ambassadors"));
const CampusImpact = lazy(() => import("@/pages/growth/CampusImpact"));
const StudyMaterials = lazy(() => import("@/pages/materials/StudyMaterials"));
const MaterialsCourse = lazy(() => import("@/pages/materials/MaterialsCourse"));
const AdminGrowth = lazy(() => import("@/pages/admin/AdminGrowth"));
import { DashboardSkeleton } from "@/components/student/dashboard/DashboardSkeleton";

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<LoadingSpinner />} key={location.pathname}>
       <RouteErrorBoundary resetKey={location.pathname}>
        <TutorPendingGate>
         <Routes location={location}>
          <Route path="/" element={<PageTransition><Welcome /></PageTransition>} />

          {/* Public University routes */}
          <Route path="/jamb" element={<Navigate to="/courses" replace />} />
          <Route path="/jamb/cbt-practice" element={<Navigate to="/practice" replace />} />
          <Route path="/jamb/past-questions" element={<Navigate to="/courses" replace />} />
          <Route path="/post-utme/:university" element={<Navigate to="/courses" replace />} />
          <Route path="/universities/:slug" element={<PageTransition><SEOUniversityPage /></PageTransition>} />
          <Route path="/topics/:slug" element={<PageTransition><SEOTopicPage /></PageTransition>} />
          <Route path="/ai/flashcard-generator" element={<PageTransition><SEOFlashcardGenerator /></PageTransition>} />
          <Route path="/ai/quiz-generator" element={<PageTransition><SEOQuizGenerator /></PageTransition>} />
          <Route path="/mock-exams" element={<PageTransition><SEOMockExams /></PageTransition>} />
          <Route path="/notifications" element={<PageTransition><NotificationsPage /></PageTransition>} />
          <Route path="/website" element={<PageTransition><Index /></PageTransition>} />
          <Route path="/welcome-tour" element={<PageTransition><MobileWelcome /></PageTransition>} />
          <Route path="/release-notes" element={<PageTransition><ReleaseNotes /></PageTransition>} />
          <Route path="/release-notes/:version" element={<PageTransition><ReleaseNotes /></PageTransition>} />
          {/* Streamlined Onboarding */}
          <Route path="/onboarding/jamb" element={<Navigate to="/onboarding/university" replace />} />
          <Route path="/onboarding/university" element={<PageTransition><UniversityOnboarding /></PageTransition>} />
          <Route path="/onboarding" element={<PageTransition><UniversityOnboarding /></PageTransition>} />
          <Route path="/start" element={<PageTransition><UniversityOnboarding /></PageTransition>} />
          <Route path="/onboarding/*" element={<PageTransition><UniversityOnboarding /></PageTransition>} />

          <Route
            path="/auth"
            element={
              <PageTransition>
                <Auth />
              </PageTransition>
            }
          />
          <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route
            path="/dashboard"
            element={
              <PageTransition>
                <EnvironmentGuard allow="university">
                  <Dashboard />
                </EnvironmentGuard>
              </PageTransition>
            }
          />

          <Route
            path="/student/dashboard"
            element={
              <RoleRoute allow={["student"]}>
                <PageTransition>
                  <EnvironmentGuard allow="university" requireAuth>
                    <Suspense fallback={<DashboardSkeleton />}>
                      <StudentDashboard />
                    </Suspense>
                  </EnvironmentGuard>
                </PageTransition>
              </RoleRoute>
            }
          />

          <Route
            path="/tutor/dashboard"
            element={
              <RoleRoute allow={["tutor"]}>
                <PageTransition>
                  <TutorDashboard />
                </PageTransition>
              </RoleRoute>
            }
          />
          <Route
            path="/tutor/:tutorId"
            element={
              <PageTransition>
                <TutorProfile />
              </PageTransition>
            }
          />
          <Route
            path="/tutors"
            element={
              <PageTransition>
                <BrowseTutors />
              </PageTransition>
            }
          />
          <Route
            path="/apply-tutor"
            element={
              <PageTransition>
                <ApplyTutor />
              </PageTransition>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/applications"
            element={
              <AdminRoute>
                <PageTransition>
                  <TutorApplications />
                </PageTransition>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <PageTransition>
                  <AdminDashboard />
                </PageTransition>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/insights"
            element={
              <AdminRoute>
                <PageTransition>
                  <AdminInsights />
                </PageTransition>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/startup-checklist"
            element={
              <AdminRoute>
                <PageTransition>
                  <StartupChecklist />
                </PageTransition>
              </AdminRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <PageTransition>
                <EnvironmentGuard allow="university" preview>
                  <AllQuizzes />
                </EnvironmentGuard>
              </PageTransition>
            }
          />

          <Route
            path="/quiz/:quizId"
            element={
              <PageTransition>
                <QuizPreview />
              </PageTransition>
            }
          />

          <Route
            path="/quiz/:quizId/practice"
            element={
              <PageTransition>
                <QuizPractice />
              </PageTransition>
            }
          />
          <Route
            path="/quiz/:quizId/simulation"
            element={
              <PageTransition>
                <CBTSimulation />
              </PageTransition>
            }
          />
          <Route
            path="/quiz/:quizId/cbt"
            element={
              <PageTransition>
                <CBTSimulation />
              </PageTransition>
            }
          />
          <Route
            path="/quiz/:quizId/results/:attemptId"
            element={
              <PageTransition>
                <QuizResults />
              </PageTransition>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <PageTransition>
                <EditProfile />
              </PageTransition>
            }
          />
          <Route
            path="/profile/preparation"
            element={
              <PageTransition>
                <PreparationSettings />
              </PageTransition>
            }
          />
          <Route
            path="/settings/academic"
            element={
              <PageTransition>
                <AcademicSettings />
              </PageTransition>
            }
          />
          <Route
            path="/profile/academic"
            element={
              <PageTransition>
                <AcademicSettings />
              </PageTransition>
            }
          />
          <Route
            path="/u/:userId"
            element={
              <PageTransition>
                <PublicProfile />
              </PageTransition>
            }
          />
          <Route
            path="/community"
            element={
              <PageTransition>
                <CommunityWall />
              </PageTransition>
            }
          />
          <Route
            path="/communities"
            element={
              <PageTransition>
                <Community />
              </PageTransition>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <PageTransition>
                <LeaderboardPage />
              </PageTransition>
            }
          />
          <Route
            path="/team/stats"
            element={
              <PageTransition>
                <TeamStatsPage />
              </PageTransition>
            }
          />
          <Route
            path="/community/:communityId"
            element={
              <PageTransition>
                <CommunityView />
              </PageTransition>
            }
          />
          <Route path="/theory" element={<PageTransition><TheoryPrep /></PageTransition>} />
          <Route path="/theory/:courseId" element={<PageTransition><TheoryCourseView /></PageTransition>} />
          <Route path="/theory/question/:questionId" element={<PageTransition><TheoryQuestionView /></PageTransition>} />
          <Route path="/student/readiness" element={<PageTransition><ExamReadiness /></PageTransition>} />
          <Route path="/student/weak/:courseId" element={<PageTransition><WeakAreaDrill /></PageTransition>} />
          <Route path="/student/mastery" element={<PageTransition><MasteryBreakdown /></PageTransition>} />
          <Route path="/student/offline" element={<PageTransition><OfflinePractice /></PageTransition>} />
          <Route path="/student/offline/:setId" element={<PageTransition><OfflineRunner /></PageTransition>} />
          <Route path="/audio-learning" element={<PageTransition><AudioLearning /></PageTransition>} />
          <Route path="/audio" element={<Navigate to="/audio-learning" replace />} />
          <Route path="/student/smart-summary" element={<PageTransition><SmartSummary /></PageTransition>} />
          <Route path="/smart-notes" element={<Navigate to="/student/smart-summary" replace />} />
          <Route path="/notes" element={<Navigate to="/student/smart-summary" replace />} />
          <Route path="/cgpa" element={<PageTransition><CGPACalculator /></PageTransition>} />
          <Route path="/study-packs" element={<PageTransition><StudyPacks /></PageTransition>} />
          <Route path="/learn" element={<Navigate to="/courses" replace />} />
          <Route path="/progress" element={<RoleRoute allow={["student"]}><PageTransition><MasteryBreakdown /></PageTransition></RoleRoute>} />
          <Route path="/study" element={<RoleRoute allow={["student"]}><PageTransition><StudyHubPage /></PageTransition></RoleRoute>} />
          <Route path="/practice" element={<RoleRoute allow={["student"]}><PageTransition><PracticeHubPage /></PageTransition></RoleRoute>} />
          <Route path="/exams" element={<Navigate to="/practice" replace />} />
          <Route path="/cbt" element={<Navigate to="/practice" replace />} />
          <Route path="/library" element={<PageTransition><Library /></PageTransition>} />
          <Route path="/library/analytics" element={<PageTransition><UploadAnalytics /></PageTransition>} />
          <Route path="/library/offline-downloads" element={<PageTransition><OfflineDownloads /></PageTransition>} />
          <Route path="/ai-history" element={<PageTransition><AIHistory /></PageTransition>} />
          <Route path="/ai-quiz/:resourceId" element={<PageTransition><AIQuizRunner /></PageTransition>} />
          <Route path="/subscription" element={<PageTransition><Subscription /></PageTransition>} />
          <Route path="/referrals" element={<PageTransition><Referrals /></PageTransition>} />
          <Route path="/wallet" element={<PageTransition><Wallet /></PageTransition>} />
          <Route path="/admin/payments" element={<AdminRoute><PageTransition><AdminPaymentRequests /></PageTransition></AdminRoute>} />
          <Route path="/opportunities" element={<PageTransition><Opportunities /></PageTransition>} />
          <Route path="/opportunities/:id" element={<PageTransition><OpportunityDetail /></PageTransition>} />
          <Route path="/spotlight" element={<PageTransition><Spotlight /></PageTransition>} />
          <Route path="/activity" element={<PageTransition><ActivityFeed /></PageTransition>} />
          <Route path="/admin/opportunities" element={<AdminRoute><PageTransition><AdminOpportunities /></PageTransition></AdminRoute>} />
          <Route path="/feed" element={<PageTransition><PostsFeed /></PageTransition>} />
          <Route path="/posts/new" element={<PageTransition><PostComposer /></PageTransition>} />
          <Route path="/posts/saved" element={<PageTransition><SavedArticles /></PageTransition>} />
          <Route path="/posts/:id" element={<PageTransition><PostDetail /></PageTransition>} />
          <Route path="/admin/posts" element={<AdminRoute><PageTransition><AdminPosts /></PageTransition></AdminRoute>} />
          <Route path="/admin/spotlights" element={<AdminRoute><PageTransition><AdminSpotlights /></PageTransition></AdminRoute>} />
          <Route path="/admin/challenges" element={<AdminRoute><PageTransition><AdminChallenges /></PageTransition></AdminRoute>} />
          <Route path="/admin/arena" element={<AdminRoute><PageTransition><AdminArena /></PageTransition></AdminRoute>} />
          <Route path="/challenges" element={<PageTransition><Challenges /></PageTransition>} />
          <Route path="/student/challenges" element={<PageTransition><Challenges /></PageTransition>} />
          <Route path="/arena" element={<PageTransition><ArenaHome /></PageTransition>} />
          <Route path="/arena/:id" element={<PageTransition><ArenaDetail /></PageTransition>} />
          <Route path="/arena/:id/play" element={<PageTransition><ArenaPlay /></PageTransition>} />
          <Route path="/arena/:id/leaderboard" element={<PageTransition><ArenaLeaderboard /></PageTransition>} />
          <Route path="/growth" element={<PageTransition><GrowthHome /></PageTransition>} />
          <Route path="/growth/battles" element={<PageTransition><CampusBattles /></PageTransition>} />
          <Route path="/growth/battles/:id" element={<PageTransition><CampusBattleDetail /></PageTransition>} />
          <Route path="/growth/ambassadors" element={<PageTransition><Ambassadors /></PageTransition>} />
          <Route path="/growth/impact" element={<PageTransition><CampusImpact /></PageTransition>} />
          <Route path="/materials" element={<PageTransition><EnvironmentGuard allow="university" preview><StudyMaterials /></EnvironmentGuard></PageTransition>} />
          <Route path="/materials/:courseId" element={<PageTransition><EnvironmentGuard allow="university" preview><MaterialsCourse /></EnvironmentGuard></PageTransition>} />
          <Route path="/admin/growth" element={<AdminRoute><PageTransition><AdminGrowth /></PageTransition></AdminRoute>} />
          <Route path="/student/weak-area-drill" element={<PageTransition><MasteryBreakdown /></PageTransition>} />
          <Route path="/intelligence" element={<PageTransition><IntelligenceCenter /></PageTransition>} />
          <Route path="/student/success" element={<PageTransition><IntelligenceCenter /></PageTransition>} />
          <Route path="/study-mode/:courseId" element={<PageTransition><StudyMode /></PageTransition>} />
          <Route path="/weak-areas" element={<PageTransition><WeakAreas /></PageTransition>} />
          <Route path="/courses" element={<PageTransition><EnvironmentGuard allow="university" preview><CoursesScreen /></EnvironmentGuard></PageTransition>} />
          <Route path="/courses/browse" element={<PageTransition><EnvironmentGuard allow="university" preview><CourseDirectory /></EnvironmentGuard></PageTransition>} />
          <Route path="/courses/:courseId" element={<PageTransition><EnvironmentGuard allow="university" preview><CourseWorkspace /></EnvironmentGuard></PageTransition>} />
          <Route path="/courses/:courseId/topics/:topicId" element={<PageTransition><EnvironmentGuard allow="university" preview><TopicDetail /></EnvironmentGuard></PageTransition>} />
          <Route path="/courses/:courseId/topics/:topicId/practice" element={<PageTransition><EnvironmentGuard allow="university" requireAuth><TopicPractice /></EnvironmentGuard></PageTransition>} />

          <Route path="/tutor/courses/new" element={<PageTransition><TutorCourseEditor /></PageTransition>} />
          <Route path="/tutor/courses/:courseId/manage" element={<PageTransition><TutorCourseEditor /></PageTransition>} />
          <Route path="/tutor/question-cards" element={<PageTransition><TutorQuestionCards /></PageTransition>} />
          <Route path="/study-hub" element={<PageTransition><EnvironmentGuard allow="university" preview><StudyHub /></EnvironmentGuard></PageTransition>} />
          <Route path="/study-hub/:courseId" element={<PageTransition><EnvironmentGuard allow="university" preview><StudyHubCourse /></EnvironmentGuard></PageTransition>} />
          <Route path="/pq-intelligence/:courseId" element={<PageTransition><EnvironmentGuard allow="university" preview><PQIntelligence /></EnvironmentGuard></PageTransition>} />

          <Route path="/jamb/*" element={<Navigate to="/courses" replace />} />
          <Route path="/subjects" element={<Navigate to="/courses" replace />} />
          <Route path="/flashcards" element={<PageTransition><Flashcards /></PageTransition>} />
          <Route path="/jamb-intelligence" element={<Navigate to="/dashboard" replace />} />

          {/* Legacy School & Parent routes redirect cleanly to dashboard */}
          <Route path="/school/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/admin/schools" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/parent/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/verify/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/student/report-card" element={<Navigate to="/dashboard" replace />} />
          <Route path="/my-report-card" element={<Navigate to="/dashboard" replace />} />
          <Route path="/survival-kits" element={<PageTransition><SurvivalKits /></PageTransition>} />
          <Route path="/survival-kits/:kitId" element={<PageTransition><SurvivalKitView /></PageTransition>} />
          <Route path="/strategy" element={<PageTransition><Strategy /></PageTransition>} />
          <Route path="/ai-tutor" element={<PageTransition><AITutor /></PageTransition>} />
          <Route path="/ai-tutor/:threadId" element={<PageTransition><AITutor /></PageTransition>} />
          <Route path="/coach" element={<PageTransition><CoachHome /></PageTransition>} />
          <Route path="/coach/chat" element={<PageTransition><CoachChat /></PageTransition>} />
          <Route path="/coach/chat/:threadId" element={<PageTransition><CoachChat /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/settings/privacy" element={<PageTransition><PrivacySettings /></PageTransition>} />
          <Route path="/settings/notifications" element={<PageTransition><NotificationSettings /></PageTransition>} />
          <Route path="/settings/devices" element={<PageTransition><DeviceSessions /></PageTransition>} />
          <Route path="/settings/profile" element={<PageTransition><ProfileSettings /></PageTransition>} />
          <Route path="/profile/settings" element={<PageTransition><ProfileSettings /></PageTransition>} />
          <Route path="/lecture-notes" element={<PageTransition><LectureNotes /></PageTransition>} />
          <Route path="/messages" element={<PageTransition><Inbox /></PageTransition>} />
          <Route path="/chat" element={<PageTransition><ChatInbox /></PageTransition>} />
          <Route path="/chat/join/:code" element={<PageTransition><ChatJoin /></PageTransition>} />
          <Route path="/chat/:threadId" element={<PageTransition><ChatThread /></PageTransition>} />
          <Route path="/announcements" element={<PageTransition><Announcements /></PageTransition>} />
          <Route path="/qa" element={<PageTransition><QABoard /></PageTransition>} />
          <Route path="/qa/:id" element={<PageTransition><QAQuestion /></PageTransition>} />
          <Route path="/exam-tomorrow" element={<PageTransition><ViralMode /></PageTransition>} />
          <Route path="/can-i-pass" element={<PageTransition><ViralMode /></PageTransition>} />
          <Route path="/two-hours-left" element={<PageTransition><ViralMode /></PageTransition>} />
          <Route path="/my-courses" element={<PageTransition><EnvironmentGuard allow="university"><MyCourses /></EnvironmentGuard></PageTransition>} />

          <Route path="/student/tutor-courses" element={<PageTransition><StudentTutorCourses /></PageTransition>} />
          <Route path="/student/library-history" element={<PageTransition><StudentLibraryHistory /></PageTransition>} />
          <Route path="/tutor/courses" element={<PageTransition><TutorCourses /></PageTransition>} />
          <Route path="/tutor/curricula" element={<PageTransition><TutorCurricula /></PageTransition>} />
          <Route path="/tutor/curricula/:id" element={<PageTransition><TutorCurriculumBuilder /></PageTransition>} />
          <Route path="/admin/courses" element={<AdminRoute><PageTransition><AdminCourses /></PageTransition></AdminRoute>} />
          <Route path="/admin/bulk-upload" element={<AdminRoute><PageTransition><AdminBulkUpload /></PageTransition></AdminRoute>} />
          <Route path="/admin/content" element={<ContentAdminRoute><PageTransition><AdminContentManagement /></PageTransition></ContentAdminRoute>} />
          <Route path="/admin/content/syllabi" element={<ContentAdminRoute><PageTransition><AdminContentManagement /></PageTransition></ContentAdminRoute>} />
          <Route path="/admin/content/notes" element={<ContentAdminRoute><PageTransition><AdminContentManagement /></PageTransition></ContentAdminRoute>} />
          <Route path="/admin/content/cbt" element={<ContentAdminRoute><PageTransition><AdminContentManagement /></PageTransition></ContentAdminRoute>} />
          <Route path="/community-wall" element={<PageTransition><CommunityWall /></PageTransition>} />
          <Route path="/review" element={<PageTransition><Review /></PageTransition>} />
          <Route path="/sessions" element={<PageTransition><Sessions /></PageTransition>} />
          <Route path="/tutor/sessions" element={<PageTransition><TutorSessions /></PageTransition>} />
          <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
          <Route path="/unsubscribe" element={<PageTransition><Unsubscribe /></PageTransition>} />
          <Route path="/exams" element={<PageTransition><MockExams /></PageTransition>} />
          <Route path="/exams/:examId/take" element={<PageTransition><MockExamTake /></PageTransition>} />
          <Route path="/exams/:examId/result/:attemptId" element={<PageTransition><MockExamResult /></PageTransition>} />
          <Route path="/remediation" element={<PageTransition><RemediationPlaylists /></PageTransition>} />
          <Route path="/tutor/payouts" element={<PageTransition><TutorPayouts /></PageTransition>} />
          <Route path="/tutor/storefront" element={<PageTransition><TutorStorefrontEditor /></PageTransition>} />
          <Route path="/t/:slug" element={<PageTransition><StorefrontPublic /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
          <Route path="/coach" element={<PageTransition><StudyCoach /></PageTransition>} />
          <Route path="/feed" element={<PageTransition><SocialFeed /></PageTransition>} />
          <Route path="/champions" element={<PageTransition><WeeklyLeaderboard /></PageTransition>} />
          <Route path="/admin/flags" element={<AdminRoute><PageTransition><AdminFeatureFlags /></PageTransition></AdminRoute>} />
          <Route path="/admin/moderation" element={<AdminRoute><PageTransition><AdminModeration /></PageTransition></AdminRoute>} />
          <Route path="/admin/scorecards" element={<AdminRoute><PageTransition><AdminTutorScorecards /></PageTransition></AdminRoute>} />
          <Route path="/admin/withdrawals" element={<AdminRoute><PageTransition><AdminWithdrawals /></PageTransition></AdminRoute>} />
          <Route path="/admin/cohorts" element={<AdminRoute><PageTransition><AdminCohorts /></PageTransition></AdminRoute>} />
          <Route path="/admin/campaigns" element={<AdminRoute><PageTransition><AdminCampaigns /></PageTransition></AdminRoute>} />
          <Route path="/admin/audit" element={<AdminRoute><PageTransition><AdminAudit /></PageTransition></AdminRoute>} />
          <Route path="/admin/trust" element={<AdminRoute><PageTransition><AdminTrust /></PageTransition></AdminRoute>} />
          <Route path="/admin/broadcast" element={<AdminRoute><PageTransition><AdminBroadcast /></PageTransition></AdminRoute>} />
          <Route path="/admin/feedback" element={<AdminRoute><PageTransition><AdminFeedback /></PageTransition></AdminRoute>} />
          <Route path="/search" element={<PageTransition><SmartSearch /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          <Route path="/help" element={<PageTransition><HelpSupport /></PageTransition>} />
          <Route path="/support" element={<Navigate to="/help" replace />} />
          <Route
            path="/live/:slotId"
            element={
              <PageTransition>
                {FEATURES.liveClassrooms ? (
                  <LiveRoom />
                ) : (
                  <ComingSoon
                    title="Live classrooms"
                    note="Live video sessions are launching soon. We'll notify you the moment they go live."
                  />
                )}
              </PageTransition>
            }
          />
          <Route path="/copilot" element={<PageTransition><CopilotPage /></PageTransition>} />
          <Route path="/tutor/growth" element={<PageTransition><TutorGrowthStudio /></PageTransition>} />
          <Route path="/r/:slug" element={<AffiliateRedirect />} />
          {/* Friendly aliases — silently send common stale links to the home screen
              instead of showing a 404 after a reload. */}
          <Route path="/index" element={<Navigate to="/" replace />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            }
          />
         </Routes>
        </TutorPendingGate>
       </RouteErrorBoundary>
      </Suspense>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
