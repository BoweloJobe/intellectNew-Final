import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataErrorState } from "../components/DataState";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { SolidCard } from "../components/SolidCard";
import { DashboardWidgetSkeleton } from "../components/skeletons/SectionSkeletons";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { BookOpen, Trophy, Clock, TrendingUp, Calendar, Flame } from "lucide-react";
import type { DashboardStat, DashboardStatKey } from "../models/dashboard";
import type { Course } from "../models/courses";
import { getCoursesPageData } from "../services/courses.service";
import { useCoursesState } from "../state/courses/CoursesStateContext";
import { useDashboardState } from "../state/dashboard/DashboardStateContext";
import { useAuth } from "../auth/AuthContext";
import { getAuthUserGreetingName } from "../auth/auth-normalizers";
import { useNotificationsState } from "../state/notifications/NotificationsStateContext";
import { formatRelativeTime, getMinutesSince, getTimeOfDayGreetingPrefix } from "../utils/personalization";
import { useProgressStats } from "../hooks/useProgressStats";



export function StudentDashboard() {
  const { user } = useAuth();
  const {
    state: {
      weeklySnapshot,
      liveDeltas,
    },
  } = useDashboardState();

  // Daily goal targets are UI-defined constants — there is no backend endpoint
  // for personal goal preferences. Actual progress comes from recentActivity.
  const DAILY_STUDY_HOURS_TARGET = 3;
  const DAILY_LESSONS_TARGET = 5;
  const {
    state: {
      courseProgress,
      courseLessonProgress,
      courseTitles,
      enrolledCourseIds,
      bookmarks,
      recentlyAccessedCourses,
    },
    getCourseStatus,
  } = useCoursesState();
  const { completionCounts, realStudyHours, realCurrentStreak } = useProgressStats();
  const {
    state: { recentActivity },
  } = useNotificationsState();
  const { errorMessage, isLoading, isError, run: runLoadDashboard } = useAsyncViewState({
    defaultErrorMessage: "Your dashboard data is unavailable right now. Please retry to refresh your progress and recommendations.",
  });
  const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);

  const loadDashboard = () => {
    void runLoadDashboard(async () => {
      const coursesData = await getCoursesPageData();
      setCatalogCourses(coursesData.courses);
      return coursesData;
    });
  };

  useEffect(() => {
    loadDashboard();
  }, [runLoadDashboard]);

  // ── Stats derived from canonical useProgressStats hook ─────────────────
  const realCoursesEnrolled = completionCounts.total;
  const realCompleted = completionCounts.completed;

  // ── Lessons completed today (session-scoped) ─────────────────────────────
  const lessonsTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return recentActivity.filter(
      (a) => a.kind === "lesson-completed" && new Date(a.createdAt).toDateString() === today,
    ).length;
  }, [recentActivity]);

  // ── Quizzes completed today (session-scoped) ──────────────────────────────
  const quizzesTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return recentActivity.filter(
      (a) => a.kind === "quiz-completed" && new Date(a.createdAt).toDateString() === today,
    ).length;
  }, [recentActivity]);

  // ── Effective study days this week: union of lesson-access days + quiz days ─
  const effectiveStudyDaysThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 864e5;
    const lessonDays = new Set(
      recentlyAccessedCourses
        .filter((c) => c.lastAccessedAt && new Date(c.lastAccessedAt).getTime() > weekAgo)
        .map((c) => new Date(c.lastAccessedAt!).toDateString()),
    );
    const quizDays = new Set(
      recentActivity
        .filter((a) => a.kind === "quiz-completed" && new Date(a.createdAt).getTime() > weekAgo)
        .map((a) => new Date(a.createdAt).toDateString()),
    );
    return new Set([...lessonDays, ...quizDays]).size;
  }, [recentActivity, recentlyAccessedCourses]);

  // ── Recommendations: unenrolled courses from catalog ─────────────────────
  const realRecommendations = useMemo(() => {
    return catalogCourses
      .filter((c) => getCourseStatus(c.id) === "not-enrolled")
      .slice(0, 3)
      .map((c) => ({ title: c.title, category: c.category, duration: c.duration }));
  }, [catalogCourses, getCourseStatus]);

  const stats: DashboardStat[] = [
    {
      label: "Courses Enrolled",
      value: String(realCoursesEnrolled),
      key: "courses-enrolled",
    },
    {
      label: "Completed",
      value: String(realCompleted),
      key: "completed",
    },
    { label: "Study Hours", value: String(realStudyHours), key: "study-hours" },
    { label: "Current Streak", value: String(realCurrentStreak), key: "current-streak" },
  ];

  // ── Continue Learning: built from real CoursesState, not from mock dashboard ──
  //
  // `dashboardData.continueLearning` has hardcoded mock courseIds that don't
  // match real backend UUIDs when the courses domain is in API mode.  We build
  // the list from enrolled courses directly and fall back to the mock-enriched
  // items only when no real progress data is available.
  const continueLearning = useMemo(() => {
    // Primary path: real enrollment data with at least one in-progress course
    const fromState = enrolledCourseIds
      .map((courseId) => {
        const progress = courseProgress[courseId] ?? 0;
        const lessonProgress = courseLessonProgress[courseId];
        const resumeLessonId = lessonProgress?.currentLessonId ?? null;
        const lastAccessedAt =
          recentlyAccessedCourses.find((r) => r.courseId === courseId)?.lastAccessedAt
          ?? lessonProgress?.lastAccessedAt
          ?? null;
        const title = courseTitles[courseId] ?? "Course";
        const completedCount = lessonProgress?.completedLessonIds.length ?? 0;
        const lessonLabel = completedCount > 0 ? `Lesson ${completedCount + 1}` : "First lesson";
        const lessonHref = resumeLessonId
          ? `/courses/${courseId}/lessons/${resumeLessonId}`
          : `/courses/${courseId}`;
        const lastAccessedLabel = formatRelativeTime(lastAccessedAt);
        const minutesSinceLastAccess = getMinutesSince(lastAccessedAt);
        const latestCourseActivity = recentActivity.find((a) =>
          a.message.toLowerCase().includes(title.toLowerCase()),
        );
        const justFinishedLesson = latestCourseActivity?.kind === "lesson-completed";
        const inactiveForLong = minutesSinceLastAccess != null && minutesSinceLastAccess > 72 * 60;
        const nearCompletion = progress >= 85 && progress < 100;

        const nextAction = justFinishedLesson
          ? {
              label: "Take Quiz",
              helper: "Good momentum — test recall while it's still fresh.",
              href: `/quizzes?courseId=${courseId}`,
            }
          : nearCompletion
          ? {
              label: "Finish Strong",
              helper: "You are close to completing this course.",
              href: lessonHref,
            }
          : inactiveForLong
          ? {
              label: "Resume",
              helper: lastAccessedLabel ? `Last active ${lastAccessedLabel}.` : "Pick up where you left off.",
              href: lessonHref,
            }
          : {
              label: "Continue",
              helper: `Continue with ${lessonLabel}.`,
              href: lessonHref,
            };

        return {
          courseId,
          title,
          progress,
          lesson: lessonLabel,
          duration: `${completedCount} lesson${completedCount === 1 ? "" : "s"} done`,
          resumeLessonId: resumeLessonId ?? "",
          status: getCourseStatus(courseId),
          lastAccessedAt,
          lastAccessedLabel,
          nextAction,
        };
      })
      .filter((c) => c.status === "in-progress" && c.progress > 0 && c.progress < 100)
      .sort((a, b) => {
        if (!a.lastAccessedAt || !b.lastAccessedAt) return 0;
        return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
      });

    return fromState;
  }, [
    enrolledCourseIds,
    courseProgress,
    courseLessonProgress,
    courseTitles,
    recentlyAccessedCourses,
    recentActivity,
    getCourseStatus,
  ]);

  // No backend schedule endpoint — upcoming quizzes show empty state
  const upcomingQuizzes: { subject: string; topic: string; date: string; difficulty: string }[] = [];
  // Unenrolled courses from the catalog; empty array when catalog not yet loaded
  const recommendations = realRecommendations;
  const greetingName = getAuthUserGreetingName(user);
  const primaryCourse = continueLearning[0];
  const greetingHeadline = useMemo(() => {
    if (!greetingName || greetingName === "there") {
      return "Welcome back";
    }

    return `Welcome back, ${greetingName}`;
  }, [greetingName, primaryCourse]);
  const greetingSubline = useMemo(() => {
    const prefix = getTimeOfDayGreetingPrefix();

    if (!primaryCourse) {
      return `${prefix}. Ready when you are.`;
    }

    const activity = primaryCourse.lastAccessedLabel ? ` · ${primaryCourse.lastAccessedLabel}` : "";
    return `${prefix} · ${primaryCourse.lesson}${activity} · ${primaryCourse.nextAction.label}`;
  }, [primaryCourse]);

  const statDeltaByKey: Partial<Record<DashboardStatKey, string>> = {
    "courses-enrolled": liveDeltas.enrollments > 0 ? `+${liveDeltas.enrollments} new course` : "",
    "current-streak": liveDeltas.streakDays > 0 ? `+${liveDeltas.streakDays} streak day` : "",
  };


  const getStatIcon = (statKey: DashboardStatKey) => {
    switch (statKey) {
      case "courses-enrolled":
        return <BookOpen className="w-6 h-6" />;
      case "completed":
        return <Trophy className="w-6 h-6" />;
      case "study-hours":
        return <Clock className="w-6 h-6" />;
      case "current-streak":
        return <Flame className="w-6 h-6" />;
      default:
        return <BookOpen className="w-6 h-6" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      {/* Welcome Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-semibold mb-2 text-gray-900">{greetingHeadline}</h1>
        <p className="text-lg text-gray-700">{greetingSubline}</p>
      </div>

      {isError ? (
        <div className="mb-8">
          <DataErrorState
            description={errorMessage ?? "Your dashboard data is unavailable right now. Please retry to refresh your progress and recommendations."}
            onRetry={() => {
              loadDashboard();
            }}
            retryLabel="Retry"
          />
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => <DashboardWidgetSkeleton key={index} />)
          : !isError && stats.map((stat, index) => (
              <GlassCard key={index}>
                <div className="flex items-center gap-4">
                  <div className="text-[#4a9ff5]">{getStatIcon(stat.key)}</div>
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
                    {statDeltaByKey[stat.key] ? (
                      <p className="text-xs font-medium text-green-600 mt-1">{statDeltaByKey[stat.key]}</p>
                    ) : null}
                  </div>
                </div>
              </GlassCard>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Learning */}
          <GlassCard>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-gray-900">Continue Learning</h2>
              <Link to="/courses">
                <Button variant="ghost" className="text-[#4a9ff5] text-sm font-medium">View all</Button>
              </Link>
            </div>
            
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 2 }, (_, index) => <DashboardWidgetSkeleton key={`continue-loading-${index}`} />)
              ) : continueLearning.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="Nothing in progress"
                  description="Start a course to see your active lessons and continue where you left off."
                  action={<Link to="/courses"><Button className="bg-[#4a9ff5] text-white hover:bg-[#2e8ef7]">Browse Courses</Button></Link>}
                />
              ) : (
                continueLearning.map((course, index) => (
                  <Link key={index} to={course.nextAction.href}>
                    <SolidCard hover>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base text-gray-900 mb-1">{course.title}</h3>
                          <p className="text-sm text-gray-600">{course.lesson}</p>
                          <p className="text-xs text-gray-500 mt-1">{course.nextAction.helper}</p>
                        </div>
                        <div className="text-[#4a9ff5] text-xs font-semibold uppercase tracking-wide">
                          {course.nextAction.label}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{course.duration}</span>
                          <span className="text-[#4a9ff5] font-semibold">{course.progress}% complete</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {course.status === "completed"
                              ? "Completed"
                              : course.status === "in-progress"
                              ? "In Progress"
                              : course.status === "enrolled"
                              ? "Enrolled"
                              : "Not Enrolled"}
                          </span>
                          {course.lastAccessedLabel ? <span>{course.lastAccessedLabel}</span> : null}
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>
                    </SolidCard>
                  </Link>
                ))
              )}
            </div>
          </GlassCard>

          {/* Upcoming Quizzes */}
          <GlassCard>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-gray-900">Upcoming Quizzes</h2>
              <div className="flex items-center gap-3">
                {upcomingQuizzes.length > 0 ? (
                  <span className="text-xs font-medium text-[#4a9ff5] uppercase tracking-wide">
                    Upcoming
                  </span>
                ) : null}
                <Link to="/quizzes">
                  <Button variant="ghost" className="text-[#4a9ff5]">View All</Button>
                </Link>
              </div>
            </div>
            
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 2 }, (_, index) => <DashboardWidgetSkeleton key={`quiz-loading-${index}`} />)
              ) : upcomingQuizzes.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming quizzes"
                  description="You are all caught up. New quiz schedules will appear here automatically."
                />
              ) : null}
            </div>
          </GlassCard>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Today's Goal */}
          <GlassCard>
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Today's Goal</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Study Time</span>
                  <span className="text-sm font-semibold text-[#4a9ff5]">
                    {Math.round((lessonsTodayCount * 20 / 60 + quizzesTodayCount * 12 / 60) * 10) / 10}h / {DAILY_STUDY_HOURS_TARGET}h
                  </span>
                </div>
                <Progress value={Math.min(100, ((lessonsTodayCount * 20 / 60 + quizzesTodayCount * 12 / 60) / DAILY_STUDY_HOURS_TARGET) * 100)} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Lessons Completed</span>
                  <span className="text-sm font-semibold text-[#4a9ff5]">
                    {lessonsTodayCount} / {DAILY_LESSONS_TARGET}
                  </span>
                </div>
                <Progress value={Math.min(100, (lessonsTodayCount / DAILY_LESSONS_TARGET) * 100)} className="h-2" />
              </div>
              {quizzesTodayCount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">Quizzes Taken</span>
                    <span className="text-sm font-semibold text-[#4a9ff5]">{quizzesTodayCount} today</span>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Performance */}
          <GlassCard>
            <h3 className="text-xl font-semibold mb-6 text-gray-900">This Week</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Avg. Score</span>
                <span className="font-semibold text-gray-900">
                  {weeklySnapshot.averageQuizScore > 0 ? `${weeklySnapshot.averageQuizScore}%` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Study Days</span>
                <span className="font-semibold text-gray-900">{effectiveStudyDaysThisWeek}/7</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Quizzes Taken</span>
                <span className="font-semibold text-gray-900">
                  {weeklySnapshot.quizzesTaken > 0 ? weeklySnapshot.quizzesTaken : "—"}
                </span>
              </div>
              {weeklySnapshot.newReplies > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Community Replies</span>
                  <span className="font-semibold text-[#4a9ff5]">{weeklySnapshot.newReplies} new</span>
                </div>
              ) : null}
            </div>
          </GlassCard>

          {/* Recommendations */}
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Recommended</h3>
              <span className="text-xs font-medium text-[#4a9ff5] uppercase tracking-wide">
                {bookmarks.length} saved
              </span>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 2 }, (_, index) => <DashboardWidgetSkeleton key={`rec-loading-${index}`} />)
              ) : recommendations.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No recommendations yet"
                  description="Complete a few lessons to unlock personalized recommendations."
                  className="px-4 py-8"
                />
              ) : (
                recommendations.map((rec, index) => (
                  <div key={index} className="p-3 rounded-lg bg-white/[0.45] border border-white/50">
                    <h4 className="font-medium text-gray-900 text-sm mb-1">{rec.title}</h4>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{rec.category}</span>
                      <span>{rec.duration}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* AI Tutor CTA */}
          <GlassCard className="bg-gradient-to-br from-[#4a9ff5]/10 to-[#0d6efd]/10">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Need Help?</h3>
            <p className="text-sm text-gray-500 mb-4">Chat with our AI tutor anytime</p>
            <Link to="/ai-tutor">
              <Button className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white font-semibold">
                Ask AI Tutor
              </Button>
            </Link>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
