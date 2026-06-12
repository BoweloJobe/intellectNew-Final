import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DataErrorState } from "../components/DataState";
import { GlassCard } from "../components/GlassCard";
import { SolidCard } from "../components/SolidCard";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { PlayCircle, CheckCircle2, Lock, Clock, BookOpen, Download, Star, ChevronRight } from "lucide-react";
import type { Course, CourseDetails } from "../models/courses";
import { getCourseDetails, getCoursesPageData } from "../services/courses.service";
import { captureCoursePayment, createCoursePaymentOrder } from "../services/payment.service";
import { captureCoursePaymentReturn, startCourseEnrollment } from "../services/course-enrollment-flow.service";
import { useCoursesState } from "../state/courses/CoursesStateContext";
import { useDashboardState } from "../state/dashboard/DashboardStateContext";
import {
  createProductNotification,
  useNotificationsState,
} from "../state/notifications/NotificationsStateContext";
import { useAuth } from "../auth/AuthContext";
import { getAdminRedirectFromStudentExperience } from "../auth/access-control";
import { getAuthUserGreetingName } from "../auth/auth-normalizers";
import { getCourseAccessDecision } from "../utils/course-access";
import { formatRelativeTime, getMinutesSince } from "../utils/personalization";

const STATUS_LABELS = {
  "not-enrolled": "Not Enrolled",
  enrolled: "Enrolled",
  "in-progress": "In Progress",
  completed: "Completed",
} as const;

const STATUS_STYLES = {
  "not-enrolled": "bg-gray-100 text-gray-700",
  enrolled: "bg-blue-100 text-blue-700",
  "in-progress": "bg-[#4a9ff5]/10 text-[#4a9ff5]",
  completed: "bg-green-100 text-green-700",
} as const;

function hasCoverImage(value: string | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

export function CourseDetailsPage() {
  const { user, subscription, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = id ?? "";
  const { applyCourseJoin } = useDashboardState();
  const { addRecentActivity, pushNotification } = useNotificationsState();
  const {
    state: { courseLessonProgress },
    getCourseStatus,
    getCourseProgressSummary,
    joinCourse,
    reloadEnrollments,
    markCourseAccessed,
  } = useCoursesState();

  const { errorMessage, isLoading, isError, run: runLoadCourseDetails } = useAsyncViewState({
    defaultErrorMessage: "Course details are unavailable right now.",
  });
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);

  const loadCourseDetails = () => {
    void runLoadCourseDetails(async () => {
      const [details, list] = await Promise.all([getCourseDetails(courseId), getCoursesPageData()]);
      setCourseDetails(details);
      setAllCourses(list.courses);
      return details;
    });
  };

  useEffect(() => {
    const redirectPath = getAdminRedirectFromStudentExperience(location.pathname, role);
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [location.pathname, navigate, role]);

  useEffect(() => {
    loadCourseDetails();
  }, [courseId, runLoadCourseDetails]);

  useEffect(() => {
    let isCancelled = false;

    void captureCoursePaymentReturn({
      expectedCourseId: courseId,
      paymentType: searchParams.get("payment"),
      paymentCourseId: searchParams.get("courseId"),
      orderToken: searchParams.get("token") ?? searchParams.get("orderId"),
      capturePayment: captureCoursePayment,
    })
      .then(async (outcome) => {
        if (isCancelled || !outcome) {
          return;
        }

        if (outcome.kind === "missing-return-data") {
          setUpgradePrompt(outcome.message);
          return;
        }

        await reloadEnrollments();
        pushNotification(
          createProductNotification({
            title: "Enrollment confirmed",
            detail: "Your payment was successful and the course is now unlocked.",
            category: "course",
            source: "course-update",
            actionLabel: "Open course",
            metadata: { courseId },
          }),
        );
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setUpgradePrompt("Payment capture failed. Enrollment was not completed.");
      });

    return () => {
      isCancelled = true;
    };
  }, [courseId, pushNotification, reloadEnrollments, searchParams]);

  const handleEnrollCourse = () => {
    if (!courseDetails) {
      return;
    }

    void startCourseEnrollment({
      courseId,
      price: courseDetails.price,
      returnTo: location.pathname,
      origin: window.location.origin,
      joinCourse,
      createPaymentOrder: createCoursePaymentOrder,
      redirectToApprovalUrl: (url) => {
        window.location.assign(url);
      },
    })
      .then((result) => {
        if (result.kind !== "free") {
          return;
        }

        addRecentActivity("course", `Joined ${courseDetails.title}`);
        pushNotification(
          createProductNotification({
            title: "Course enrolled",
            detail: greetingName !== "there"
              ? `${greetingName}, you joined ${courseDetails.title}. Start your first lesson when ready.`
              : `You joined ${courseDetails.title}. Start your first lesson when ready.`,
            category: "course",
            source: "course-update",
            actionLabel: "Open course",
            metadata: { courseId },
          }),
        );
        applyCourseJoin(result.joinedNewCourse);

        if (!result.syncOk) {
          pushNotification(
            createProductNotification({
              title: "Enrollment sync issue",
              detail: `Could not confirm enrollment for ${courseDetails.title}. You can keep learning while sync retries in the background.`,
              category: "course",
              source: "course-update",
            }),
          );
        }

        markCourseAccessed(courseId);
        addRecentActivity("course", `Accessed ${courseDetails.title}`);
      })
      .catch((error) => {
        setUpgradePrompt(error instanceof Error ? error.message : "Payment could not be started.");
      });
  };

  const status = getCourseStatus(courseId);

  const progressSummary = useMemo(() => {
    if (!courseDetails) {
      return { completedLessons: 0, totalLessons: 0, percent: 0 };
    }

    const summary = getCourseProgressSummary(courseId, courseDetails.totalLessons);

    return {
      ...summary,
      percent: summary.totalLessons > 0
        ? Math.round((summary.completedLessons / summary.totalLessons) * 100)
        : 0,
    };
  }, [courseDetails, courseId, getCourseProgressSummary]);

  const courseLastAccessedAt = courseLessonProgress[courseId]?.lastAccessedAt ?? null;
  const courseLastAccessLabel = formatRelativeTime(courseLastAccessedAt);
  const minutesSinceCourseAccess = getMinutesSince(courseLastAccessedAt);
  const greetingName = getAuthUserGreetingName(user);

  const completedLessonIds = courseLessonProgress[courseId]?.completedLessonIds ?? [];
  const lessonAccessById = useMemo(() => {
    if (!courseDetails) {
      return {} as Record<string, ReturnType<typeof getCourseAccessDecision>>;
    }

    const flattenedLessons = courseDetails.modules.flatMap((module) => module.lessons);

    return flattenedLessons.reduce<Record<string, ReturnType<typeof getCourseAccessDecision>>>((accumulator, lesson, index) => {
      accumulator[lesson.id] = getCourseAccessDecision({
        lessonOrder: index + 1,
        subscription,
        isFreePreview: lesson.isFreePreview,
      });

      return accumulator;
    }, {});
  }, [courseDetails, subscription]);

  const recommendedNextCourse = useMemo(() => {
    if (!courseDetails?.recommendedNextCourseId) {
      return null;
    }

    return allCourses.find((course) => course.id === courseDetails.recommendedNextCourseId) ?? null;
  }, [allCourses, courseDetails?.recommendedNextCourseId]);

  const nextLessonId = useMemo(() => {
    if (!courseDetails) {
      return null;
    }

    const persistedCurrentLessonId = courseLessonProgress[courseId]?.currentLessonId;

    if (persistedCurrentLessonId) {
      return persistedCurrentLessonId;
    }

    const allLessons = courseDetails.modules.flatMap((module) => module.lessons);

    return allLessons.find((candidateLesson) => {
      const accessDecision = lessonAccessById[candidateLesson.id];
      return !completedLessonIds.includes(candidateLesson.id) && accessDecision?.isAccessible;
    })?.id ?? null;
  }, [completedLessonIds, courseDetails, courseId, courseLessonProgress, lessonAccessById]);

  const nextLessonTitle = useMemo(() => {
    if (!nextLessonId || !courseDetails) {
      return null;
    }

    return courseDetails.modules
      .flatMap((module) => module.lessons)
      .find((lesson) => lesson.id === nextLessonId)?.title ?? null;
  }, [courseDetails, nextLessonId]);

  const personalizedProgressLine = useMemo(() => {
    if (progressSummary.totalLessons === 0) {
      return "Start this course to see your momentum.";
    }

    if (progressSummary.percent >= 100) {
      return "Course complete. Keep momentum with your next pick.";
    }

    if (progressSummary.percent >= 75) {
      return `${progressSummary.completedLessons}/${progressSummary.totalLessons} topics complete. You are close to finishing.`;
    }

    if (progressSummary.percent > 0 && minutesSinceCourseAccess != null && minutesSinceCourseAccess < 36 * 60) {
      return `${progressSummary.completedLessons}/${progressSummary.totalLessons} topics complete. You have been consistent.`;
    }

    return `${progressSummary.completedLessons}/${progressSummary.totalLessons} topics complete.`;
  }, [minutesSinceCourseAccess, progressSummary.completedLessons, progressSummary.percent, progressSummary.totalLessons]);

  const nextStepCue = useMemo(() => {
    if (status === "not-enrolled") {
      return "Start with your first module to unlock progress cues and recommendations.";
    }

    if (progressSummary.percent >= 100) {
      return "You completed this course. Review key lessons or move to your next recommendation.";
    }

    if (progressSummary.percent >= 85) {
      return "Final stretch. A few focused sessions should finish this course.";
    }

    if (minutesSinceCourseAccess != null && minutesSinceCourseAccess > 72 * 60) {
      return "It has been a while. Resume now to rebuild momentum quickly.";
    }

    if (nextLessonTitle) {
      return `Next best step: ${nextLessonTitle}.`;
    }

    return "Keep moving lesson by lesson for steady progress.";
  }, [minutesSinceCourseAccess, nextLessonTitle, progressSummary.percent, status]);

  if (isLoading || !courseDetails) {
    return (
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <GlassCard className="mb-8">
          <div className="h-64 animate-pulse rounded-xl bg-white/40" />
        </GlassCard>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <DataErrorState
          description={errorMessage ?? "Course details are unavailable right now."}
          onRetry={() => {
            loadCourseDetails();
          }}
          retryLabel="Retry"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <GlassCard className="mb-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 h-48 bg-gradient-to-br from-[#4a9ff5]/20 to-[#0d6efd]/20 rounded-xl flex items-center justify-center text-6xl">
            {hasCoverImage(courseDetails.coverImageUrl) ? (
              <img src={courseDetails.coverImageUrl} alt={courseDetails.title} className="h-full w-full rounded-xl object-cover" />
            ) : (
              courseDetails.image
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h1 className="text-4xl font-semibold text-gray-900">{courseDetails.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status]}`}>
                {STATUS_LABELS[status]}
              </span>
            </div>
            {greetingName !== "there" ? (
              <p className="text-sm text-gray-500 mb-3">Keep going, {greetingName}.</p>
            ) : null}
            <p className="text-lg text-gray-700 mb-6 leading-relaxed max-w-2xl">
              {courseDetails.subtitle}
            </p>

            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-center gap-3">
                <img
                  src={courseDetails.instructorAvatar}
                  alt="Instructor"
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{courseDetails.instructorName}</p>
                  <p className="text-xs text-gray-500">Lead Instructor</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-[#4a9ff5] text-[#4a9ff5]" />
                <span className="font-semibold text-gray-900">{courseDetails.rating}</span>
                <span className="text-xs text-gray-500">({courseDetails.reviewCount.toLocaleString()} reviews)</span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-gray-500 font-medium mb-8">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>{courseDetails.totalLessons} lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{courseDetails.durationLabel}</span>
              </div>
              {courseDetails.estimatedHours ? (
                <div className="flex items-center gap-2">
                  <span>{courseDetails.estimatedHours}h total</span>
                </div>
              ) : null}
              {courseDetails.difficulty ? (
                <div className="flex items-center gap-2">
                  <span className="capitalize">{courseDetails.difficulty}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <span>{progressSummary.completedLessons}/{progressSummary.totalLessons} complete</span>
              </div>
            </div>

            {courseDetails.learningOutcomes && courseDetails.learningOutcomes.length > 0 ? (
              <div className="mb-6 rounded-xl border border-white/60 bg-white/[0.45] p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">Learning Outcomes</h2>
                <ul className="space-y-1 text-sm text-gray-700">
                  {courseDetails.learningOutcomes.map((outcome) => (
                    <li key={outcome}>• {outcome}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {courseDetails.topics && courseDetails.topics.length > 0 ? (
              <div className="mb-6 rounded-xl border border-white/60 bg-white/[0.45] p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">Topics Covered</h2>
                <div className="flex flex-wrap gap-2">
                  {courseDetails.topics.map((topic) => (
                    <span key={topic} className="rounded-full bg-[#4a9ff5]/10 px-2 py-1 text-xs text-[#2563eb]">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Course Progress</span>
                <span className="font-medium text-[#4a9ff5]">{progressSummary.percent}% complete</span>
              </div>
              <Progress value={progressSummary.percent} className="h-3" />
              <p className="text-sm text-gray-600">{personalizedProgressLine}</p>
              <p className="text-xs text-gray-500">{nextStepCue}</p>
              {courseLastAccessLabel ? (
                <p className="text-xs text-gray-500">Last active {courseLastAccessLabel}</p>
              ) : null}
            </div>

            {upgradePrompt ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                <p className="text-sm text-amber-700 mb-2">{upgradePrompt}</p>
                <Button
                  size="sm"
                  className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
                  onClick={() => {
                    navigate(`/checkout?plan=pro&returnTo=${encodeURIComponent(location.pathname)}`);
                  }}
                >
                  Upgrade to Pro
                </Button>
              </div>
            ) : null}

            <div className="flex gap-2">
              {status === "not-enrolled" ? (
                <Button
                  className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
                  onClick={handleEnrollCourse}
                >
                  Enroll Now
                </Button>
              ) : (
                nextLessonId ? (
                  <div>
                    <Link to={`/courses/${courseId}/lessons/${nextLessonId}`}>
                      <Button
                        className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
                        onClick={() => {
                          markCourseAccessed(courseId);
                          addRecentActivity("course", `Accessed ${courseDetails.title}`);
                        }}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Continue Where You Left Off
                      </Button>
                    </Link>
                    {nextLessonTitle ? (
                      <p className="text-xs text-gray-500 mt-2">Next up: {nextLessonTitle}</p>
                    ) : null}
                  </div>
                ) : (
                  <Button className="bg-[#4a9ff5] text-white" disabled>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Continue Where You Left Off
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {status === "completed" && recommendedNextCourse ? (
        <GlassCard className="mb-8 bg-gradient-to-r from-[#4a9ff5]/10 to-[#0d6efd]/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#4a9ff5] font-semibold mb-1">Recommended Next</p>
              <h3 className="text-xl font-semibold text-gray-900">{recommendedNextCourse.title}</h3>
              <p className="text-sm text-gray-600">{recommendedNextCourse.category} • {recommendedNextCourse.duration}</p>
            </div>
            <Link to={`/courses/${recommendedNextCourse.id}`}>
              <Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white">Open Course</Button>
            </Link>
          </div>
        </GlassCard>
      ) : null}

      <Tabs defaultValue="curriculum">
        <TabsList className="mb-6">
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum">
          <div className="space-y-4">
            {courseDetails.modules.map((module, moduleIndex) => (
              <GlassCard key={module.id}>
                <h3 className="text-xl font-semibold mb-6 text-gray-900">
                  Module {moduleIndex + 1}: {module.title}
                </h3>

                <div className="space-y-2">
                  {module.lessons.map((lesson) => {
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    const isCurrent = !isCompleted && nextLessonId === lesson.id;
                    const accessDecision = lessonAccessById[lesson.id] ?? getCourseAccessDecision({
                      lessonOrder: Number.MAX_SAFE_INTEGER,
                      subscription,
                    });
                    const isLocked = !accessDecision.isAccessible;

                    return (
                      <div key={lesson.id} className="block">
                        <button
                          type="button"
                          onClick={() => {
                            if (isLocked) {
                              setUpgradePrompt("Upgrade to Pro to unlock premium topics after the first 3 lessons.");
                              return;
                            }

                            setUpgradePrompt(null);
                            navigate(`/courses/${courseId}/lessons/${lesson.id}`);
                          }}
                          className="w-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40"
                        >
                        <SolidCard
                          hover={!isLocked}
                          className={`flex items-center justify-between ${
                            isCurrent ? "border-[#4a9ff5] bg-blue-50" : ""
                          } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : isLocked ? (
                              <Lock className="w-5 h-5 text-gray-400" />
                            ) : (
                              <PlayCircle className={`w-5 h-5 ${isCurrent ? "text-[#4a9ff5]" : "text-gray-400"}`} />
                            )}
                            <div>
                              <p className={`font-semibold ${isCurrent ? "text-[#4a9ff5]" : "text-gray-900"}`}>
                                {lesson.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {lesson.duration}
                                {lesson.isFreePreview
                                  ? " • Free Preview"
                                  : accessDecision.isPremiumContent ? " • Premium" : " • Free"}
                                {lesson.estimatedCompletionTimeMinutes ? ` • ${lesson.estimatedCompletionTimeMinutes} min to complete` : ""}
                                {lesson.quizAvailable ? " • Quiz" : ""}
                              </p>
                              {lesson.description ? (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{lesson.description}</p>
                              ) : null}
                            </div>
                          </div>

                          {!isLocked && isCurrent ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-[#4a9ff5]">Watch Now</span>
                              <ChevronRight className="w-4 h-4 text-[#4a9ff5]" />
                            </div>
                          ) : null}
                        </SolidCard>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <GlassCard>
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Course Resources</h3>
            {courseDetails.resources.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white/60 px-4 py-5">
                <p className="text-sm font-medium text-gray-900">No downloadable resources yet</p>
                <p className="mt-1 text-sm text-gray-600">
                  Lesson notes are available inside each lesson. Course-level downloads have not been added for this course.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseDetails.resources.map((resource) => (
                  <SolidCard key={resource.name} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{resource.name}</p>
                      <p className="text-xs text-gray-500">{resource.size} • Download unavailable</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-medium"
                      disabled
                      title="Course resources do not include downloadable file links yet."
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Unavailable
                    </Button>
                  </SolidCard>
                ))}
              </div>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="discussions">
          <GlassCard>
            <div className="text-center py-8">
              <p className="text-sm font-medium text-gray-900">Course discussions are not available yet</p>
              <p className="mt-1 text-sm text-gray-500">
                The community area exists separately, but course-specific discussion threads are not wired for this course.
              </p>
              <Button className="mt-4 bg-[#4a9ff5] text-white font-semibold" disabled>
                Start a Discussion
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="reviews">
          <GlassCard>
            <div className="text-center py-8">
              <p className="font-medium text-gray-900">Course reviews are not available yet</p>
              <p className="mt-1 text-sm text-gray-600">
                Ratings may be displayed when provided by course data, but review submission is not wired.
              </p>
              <Button className="mt-4 bg-[#4a9ff5] text-white" disabled>
                Write a Review
              </Button>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
