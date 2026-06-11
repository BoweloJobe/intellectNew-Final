import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/ui/button";
import type { VideoLesson } from "../models/lessons";
import {
  getVideoLessonPageData,
  LessonCourseMismatchError,
  LessonNotFoundError,
  saveLessonWatchProgress,
} from "../services/lessons.service";
import { useCoursesState } from "../state/courses/CoursesStateContext";
import { useDashboardState } from "../state/dashboard/DashboardStateContext";
import { getAsyncErrorMessage } from "../utils/async-errors";
import {
  createProductNotification,
  useNotificationsState,
} from "../state/notifications/NotificationsStateContext";
import { useAuth } from "../auth/AuthContext";
import { getAuthUserGreetingName } from "../auth/auth-normalizers";
import { getCourseAccessDecision } from "../utils/course-access";
import { LessonVideoPlayer } from "../components/lesson/LessonVideoPlayer";
import { LessonHeader } from "../components/lesson/LessonHeader";
import { LessonNotes } from "../components/lesson/LessonNotes";
import { LessonSidebar } from "../components/lesson/LessonSidebar";
import type { SidebarModuleGroup } from "../components/lesson/LessonSidebar";

type ViewState = "loading" | "ready" | "error" | "not-found";
const WATCH_PROGRESS_SAVE_INTERVAL_MS = 30_000;
const MIN_WATCH_PROGRESS_SAVE_DELTA_SECONDS = 10;

export function VideoLessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, subscription } = useAuth();
  const parsedCourseId = courseId ?? "";

  const { applyLessonCompletion } = useDashboardState();
  const { addRecentActivity, pushNotification } = useNotificationsState();
  const {
    state: { bookmarks, courseLessonProgress },
    completeCourseLesson,
    markCourseAccessed,
    toggleBookmark,
  } = useCoursesState();

  const [viewState, setViewState] = useState<ViewState>("loading");
  const [lesson, setLesson] = useState<VideoLesson | null>(null);
  const [furtherLessons, setFurtherLessons] = useState<VideoLesson[]>([]);
  const [courseLessons, setCourseLessons] = useState<VideoLesson[]>([]);
  const [lessonLoadError, setLessonLoadError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLessonSwitching, setIsLessonSwitching] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);
  const [completionSuccess, setCompletionSuccess] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [watchProgressError, setWatchProgressError] = useState<string | null>(null);
  const [lastWatchProgressSavedAt, setLastWatchProgressSavedAt] = useState<string | null>(null);
  const requestCounterRef = useRef(0);
  const baseWatchedSecondsRef = useRef(0);
  const watchSessionStartedAtRef = useRef<number | null>(null);
  const lastSavedWatchedSecondsRef = useRef(0);

  const reloadLessonPage = () => {
    if (!lessonId || !courseId) {
      setViewState("not-found");
      return;
    }

    const requestId = requestCounterRef.current + 1;
    requestCounterRef.current = requestId;
    const keepExistingContentMounted = viewState === "ready" && lesson !== null;

    if (keepExistingContentMounted) {
      setIsLessonSwitching(true);
    } else {
      setViewState("loading");
      setIsLessonSwitching(false);
    }

    setLessonLoadError(null);

    void getVideoLessonPageData(parsedCourseId, lessonId)
      .then((data) => {
        if (requestCounterRef.current !== requestId) {
          return;
        }

        setIsLessonSwitching(false);
        setLesson(data.lesson);
        setFurtherLessons(data.furtherLessons);
        setCourseLessons(data.courseLessons);
        setCompletionSuccess(null);
        setCompletionError(null);
        setWatchProgressError(null);
        setLastWatchProgressSavedAt(null);
        setViewState("ready");
      })
      .catch((error) => {
        if (requestCounterRef.current !== requestId) {
          return;
        }

        if (error instanceof LessonNotFoundError || error instanceof LessonCourseMismatchError) {
          setIsLessonSwitching(false);
          setViewState("not-found");
          return;
        }

        setIsLessonSwitching(false);
        setLessonLoadError(getAsyncErrorMessage(error, "Unable to load this video lesson right now."));
        setViewState("error");
      });
  };

  useEffect(() => {
    reloadLessonPage();
  }, [courseId, lessonId]);

  useEffect(() => {
    if (!lesson) {
      return;
    }

    markCourseAccessed(lesson.courseId);
    addRecentActivity("course", `Accessed ${lesson.courseName}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson]);

  useEffect(() => {
    if (!isCompleting) {
      return;
    }

    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);
    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
    };
  }, [isCompleting]);

  useEffect(() => {
    if (viewState !== "ready" || !lesson) {
      return;
    }

    const initialWatchedSeconds = Math.max(0, Math.floor(lesson.watchedDuration ?? 0));
    baseWatchedSecondsRef.current = initialWatchedSeconds;
    lastSavedWatchedSecondsRef.current = initialWatchedSeconds;
    watchSessionStartedAtRef.current = Date.now();

    const getWatchedSeconds = () => {
      const startedAt = watchSessionStartedAtRef.current;
      const sessionSeconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      return baseWatchedSecondsRef.current + Math.max(0, sessionSeconds);
    };

    const saveProgress = (showSavedState: boolean) => {
      const watchedSeconds = getWatchedSeconds();
      const lastPositionSeconds = lesson.duration > 0
        ? Math.min(watchedSeconds, lesson.duration)
        : watchedSeconds;

      if (watchedSeconds - lastSavedWatchedSecondsRef.current < MIN_WATCH_PROGRESS_SAVE_DELTA_SECONDS) {
        return;
      }

      lastSavedWatchedSecondsRef.current = watchedSeconds;
      void saveLessonWatchProgress(lesson.id, {
        watchedSeconds,
        lastPositionSeconds,
      })
        .then(() => {
          setWatchProgressError(null);
          if (showSavedState) {
            setLastWatchProgressSavedAt(new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }));
          }
        })
        .catch((error) => {
          setWatchProgressError(getAsyncErrorMessage(error, "Could not save lesson watch progress."));
        });
    };

    const intervalId = window.setInterval(() => {
      saveProgress(true);
    }, WATCH_PROGRESS_SAVE_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveProgress(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      saveProgress(false);
    };
  }, [lesson, viewState]);

  const completedLessonIds = courseLessonProgress[parsedCourseId]?.completedLessonIds ?? [];
  const isLessonCompleted = lesson
    ? completedLessonIds.includes(lesson.id) || Boolean(lesson.isCompleted)
    : false;
  const isCourseSaved = bookmarks.includes(parsedCourseId);

  const orderedCourseLessons = useMemo(() => {
    return [...courseLessons].sort((left, right) => left.lessonOrder - right.lessonOrder);
  }, [courseLessons]);

  const nextLessonId = useMemo(() => {
    if (!lesson) {
      return null;
    }

    const currentLessonIndex = orderedCourseLessons.findIndex((item) => item.id === lesson.id);

    if (currentLessonIndex < 0) {
      return null;
    }

    const nextLesson = orderedCourseLessons[currentLessonIndex + 1];
    return nextLesson?.id ?? null;
  }, [lesson, orderedCourseLessons]);

  const nextLesson = useMemo(() => {
    if (!nextLessonId) {
      return null;
    }

    return orderedCourseLessons.find((candidateLesson) => candidateLesson.id === nextLessonId) ?? null;
  }, [nextLessonId, orderedCourseLessons]);

  const learnerName = getAuthUserGreetingName(user);

  const sidebarLessons = useMemo(() => {
    if (orderedCourseLessons.length > 0) {
      // Keep a stable curriculum order while switching lessons.
      return orderedCourseLessons;
    }

    if (!lesson) {
      return [];
    }

    const dedupe = new Map<string, VideoLesson>();
    dedupe.set(lesson.id, lesson);

    for (const candidate of furtherLessons) {
      dedupe.set(candidate.id, candidate);
    }

    return [...dedupe.values()].slice(0, 12);
  }, [lesson, furtherLessons, orderedCourseLessons]);

  /** Sidebar lessons grouped by module for structured navigation */
  const sidebarModuleGroups = useMemo<SidebarModuleGroup[]>(() => {
    const map = new Map<string, SidebarModuleGroup>();
    for (const l of sidebarLessons) {
      if (!map.has(l.moduleId)) {
        map.set(l.moduleId, { moduleId: l.moduleId, moduleName: l.moduleName, lessons: [] });
      }
      map.get(l.moduleId)!.lessons.push(l);
    }
    return [...map.values()];
  }, [sidebarLessons]);

  useEffect(() => {
    if (viewState === "ready") {
      setUpgradePrompt(null);
    }
  }, [lesson?.id, viewState]);

  if (viewState === "loading") {
    return (
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <GlassCard className="mb-6 p-4">
          <div className="h-4 w-40 rounded bg-white/70 animate-pulse" />
        </GlassCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 animate-pulse" />
            <GlassCard className="space-y-4">
              <div className="h-8 w-3/4 rounded bg-white/70 animate-pulse" />
              <div className="h-5 w-full rounded bg-white/60 animate-pulse" />
              <div className="h-5 w-5/6 rounded bg-white/60 animate-pulse" />
            </GlassCard>
          </div>

          <GlassCard className="h-[540px] space-y-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-20 rounded-xl bg-white/65 animate-pulse" />
            ))}
          </GlassCard>
        </div>
      </div>
    );
  }

  if (viewState === "not-found") {
    return (
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <DataErrorState
          title="Lesson route is invalid"
          description="This lesson link is missing a valid course or lesson id."
          retryLabel="Open Courses"
          onRetry={() => {
            navigate("/courses");
          }}
        />
      </div>
    );
  }

  if (viewState === "error" || !lesson) {
    return (
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <DataErrorState
          description={lessonLoadError ?? "Unable to load this video lesson right now."}
          retryLabel="Try Again"
          onRetry={reloadLessonPage}
        />
      </div>
    );
  }

  const currentLessonAccess = getCourseAccessDecision({
    lessonOrder: lesson.lessonOrder,
    subscription,
    isFreePreview: lesson.isFreePreview,
  });

  if (!currentLessonAccess.isAccessible) {
    return (
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <GlassCard className="p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Premium Lesson</h1>
          <p className="text-gray-700 mb-5">Upgrade to Pro to continue beyond the first 3 free lessons in this course.</p>
          <div className="flex items-center justify-center gap-3">
            <Button
              className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
              onClick={() => {
                navigate(`/checkout?plan=pro&returnTo=${encodeURIComponent(location.pathname)}`);
              }}
            >
              Upgrade to Pro
            </Button>
            <Button
              variant="outline"
              className="bg-white/70"
              onClick={() => { navigate(`/courses/${parsedCourseId}`); }}
            >
              Back to Course
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      {/* Breadcrumb */}
      <GlassCard className="mb-6 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link
            to="/courses"
            className="hover:text-[#0d6efd] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40 rounded-sm"
          >
            Courses
          </Link>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <Link
            to={`/courses/${parsedCourseId}`}
            className="hover:text-[#0d6efd] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40 rounded-sm"
          >
            {lesson.courseName}
          </Link>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium truncate">{lesson.title}</span>
        </div>
      </GlassCard>

      {/* Main grid: content + sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main column */}
        <div className="space-y-4">
          <LessonVideoPlayer
            videoUrl={lesson.videoUrl}
            lessonTitle={lesson.title}
            isLessonSwitching={isLessonSwitching}
          />

          {completionSuccess ? (
            <ActionSuccessState message={completionSuccess} />
          ) : null}

          {completionError ? (
            <DataErrorState
              title="Lesson completion did not sync"
              description={completionError}
            />
          ) : null}

          {watchProgressError ? (
            <DataErrorState
              title="Watch progress did not sync"
              description={watchProgressError}
            />
          ) : lastWatchProgressSavedAt ? (
            <p className="px-1 text-xs text-gray-500" role="status" aria-live="polite">
              Watch progress saved at {lastWatchProgressSavedAt}.
            </p>
          ) : lesson.watchedDuration && lesson.watchedDuration > 0 ? (
            <p className="px-1 text-xs text-gray-500">
              Resumed with {Math.floor(lesson.watchedDuration / 60)} min of saved watch progress.
            </p>
          ) : null}

          <LessonHeader
            lesson={lesson}
            parsedCourseId={parsedCourseId}
            completedCount={completedLessonIds.length}
            totalLessonsCount={orderedCourseLessons.length}
            isCompleted={isLessonCompleted}
            isCompleting={isCompleting}
            isLessonSwitching={isLessonSwitching}
            isCourseSaved={isCourseSaved}
            learnerName={learnerName}
            nextLesson={nextLesson}
            nextLessonId={nextLessonId}
            upgradePrompt={upgradePrompt}
            subscription={subscription}
            onMarkComplete={() => {
              setIsCompleting(true);
              setCompletionSuccess(null);
              setCompletionError(null);
              void completeCourseLesson({
                courseId: parsedCourseId,
                lessonId: lesson.id,
                totalLessons: orderedCourseLessons.length || lesson.totalLessonsInModule,
                nextLessonId,
              }).then((result) => {
                if (result.syncOk) {
                  addRecentActivity("lesson-completed", `Finished ${lesson.title} in ${lesson.courseName}`);
                  pushNotification(
                    createProductNotification({
                      title: "Lesson completed",
                      detail:
                        learnerName !== "there"
                          ? `${learnerName}, ${lesson.title} is complete. Next step is ready.`
                          : `${lesson.title} is complete. Next step is ready.`,
                      category: "course",
                      source: "course-update",
                      actionLabel: lesson.quizAvailable ? "Start quiz" : "Continue lesson",
                    }),
                  );
                  applyLessonCompletion(result.completedDelta);
                  setCompletionSuccess(`Completed "${lesson.title}".`);
                  void saveLessonWatchProgress(lesson.id, {
                    watchedSeconds: Math.max(lesson.duration, lesson.watchedDuration ?? 0),
                    lastPositionSeconds: lesson.duration,
                    completed: true,
                  }).catch(() => {
                    // The completion endpoint already synced; watch progress can retry on the next interval.
                  });
                } else {
                  setCompletionError(`Could not sync completion for ${lesson.title}. Your local progress is kept, but the server did not confirm it.`);
                  pushNotification(
                    createProductNotification({
                      title: "Sync issue",
                      detail: `Could not sync lesson completion for ${lesson.courseName}. Your local progress is kept.`,
                      category: "course",
                      source: "course-update",
                    }),
                  );
                }
              }).catch((error) => {
                setCompletionError(getAsyncErrorMessage(error, "Could not complete this lesson."));
              }).finally(() => {
                setIsCompleting(false);
              });
            }}
            onToggleBookmark={() => { toggleBookmark(parsedCourseId); }}
            onSetUpgradePrompt={setUpgradePrompt}
          />

          <LessonNotes
            notes={lesson.notes}
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            courseName={lesson.courseName}
            tags={lesson.tags}
          />
        </div>

        {/* Sidebar — sticky, independent scroll */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <LessonSidebar
            sidebarModuleGroups={sidebarModuleGroups}
            currentLessonId={lesson.id}
            orderedLessonsCount={orderedCourseLessons.length}
            completedLessonIds={completedLessonIds}
            isCompleting={isCompleting}
            isLessonSwitching={isLessonSwitching}
            subscription={subscription}
            onSetUpgradePrompt={setUpgradePrompt}
          />
        </aside>
      </div>
    </div>
  );
}
