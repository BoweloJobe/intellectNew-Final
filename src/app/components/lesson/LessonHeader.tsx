import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bookmark,
  CheckCircle2,
  Clock,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import type { VideoLesson } from "../../models/lessons";
import type { SubscriptionOverview } from "../../models/subscription";
import { getCourseAccessDecision } from "../../utils/course-access";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface LessonHeaderProps {
  lesson: VideoLesson;
  parsedCourseId: string;
  completedCount: number;
  totalLessonsCount: number;
  isCompleted: boolean;
  isCompleting: boolean;
  isLessonSwitching: boolean;
  isCourseSaved: boolean;
  learnerName: string;
  nextLesson: VideoLesson | null;
  nextLessonId: string | null;
  upgradePrompt: string | null;
  subscription: Pick<SubscriptionOverview, "status" | "hasProAccess">;
  onMarkComplete: () => void;
  onToggleBookmark: () => void;
  onSetUpgradePrompt: (msg: string | null) => void;
}

export function LessonHeader({
  lesson,
  parsedCourseId,
  completedCount,
  totalLessonsCount,
  isCompleted,
  isCompleting,
  isLessonSwitching,
  isCourseSaved,
  learnerName,
  nextLesson,
  nextLessonId,
  upgradePrompt,
  subscription,
  onMarkComplete,
  onToggleBookmark,
  onSetUpgradePrompt,
}: LessonHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Quiz nudge dismiss state — scoped to session per lesson
  const [isQuizNudgeDismissed, setIsQuizNudgeDismissed] = useState(false);
  useEffect(() => {
    if (!lesson.id) {
      setIsQuizNudgeDismissed(false);
      return;
    }
    const key = `lesson-quiz-nudge-dismissed:${lesson.id}`;
    setIsQuizNudgeDismissed(window.sessionStorage.getItem(key) === "1");
  }, [lesson.id]);

  const durationLabel = formatDuration(lesson.duration);
  const completionLabel =
    totalLessonsCount > 0
      ? `${completedCount}/${totalLessonsCount} lessons complete`
      : `${lesson.totalLessonsInModule} lessons in module`;

  const handleNavigateNext = () => {
    if (!nextLesson || !nextLessonId) return;
    const access = getCourseAccessDecision({
      lessonOrder: nextLesson.lessonOrder,
      subscription,
      isFreePreview: nextLesson.isFreePreview,
    });
    if (!access.isAccessible) {
      onSetUpgradePrompt("Upgrade to Pro to continue into premium lessons.");
      return;
    }
    navigate(`/courses/${parsedCourseId}/lessons/${nextLessonId}`);
  };

  const handleLaunchQuiz = () => {
    if (!lesson.quizId) return;
    navigate(
      `/quizzes?quizId=${lesson.quizId}&lessonId=${lesson.id}&courseId=${parsedCourseId}`,
      { state: { fromLesson: lesson.id, courseName: lesson.courseName } },
    );
  };

  const handleAiTutor = () => {
    navigate("/ai-tutor", {
      state: {
        contextLessonId: lesson.id,
        contextLessonTitle: lesson.title,
        contextCourseName: lesson.courseName,
        contextPrompt: lesson.aiPromptContext ?? `Help me understand ${lesson.title}.`,
      },
    });
  };

  const handleUpgrade = () => {
    navigate(
      `/checkout?plan=pro&returnTo=${encodeURIComponent(location.pathname)}`,
    );
  };

  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-base md:text-lg font-semibold text-gray-900 leading-tight">{lesson.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <img
                src={lesson.instructorAvatar}
                alt={lesson.instructor}
                className="h-4 w-4 rounded-full"
              />
              {lesson.instructor}
            </span>
            <span className="text-gray-300">·</span>
            <span className="truncate max-w-[12rem]">{lesson.courseName}</span>
            <span className="text-gray-300">·</span>
            <span className="truncate max-w-[10rem]">{lesson.moduleName}</span>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4a9ff5]/10 text-[#1c7ed6]">
            {titleCase(lesson.difficulty)}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
            Lesson {lesson.lessonOrder}
          </span>
          {isCompleted && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Compact meta row */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-[#1c7ed6]" />
          {durationLabel}
        </span>
        <span className="text-gray-300">·</span>
        <span>{lesson.estimatedCompletionTime} min to complete</span>
        <span className="text-gray-300">·</span>
        <span>{completionLabel}</span>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap gap-2">
        {lesson.quizAvailable && (
          <Button
            size="sm"
            disabled={!lesson.quizId}
            onClick={handleLaunchQuiz}
            variant={isCompleted ? "default" : "outline"}
            className={
              isCompleted
                ? "bg-[#0d6efd] hover:bg-[#1c7ed6] text-white"
                : "border-[#4a9ff5]/40 bg-white/70 text-[#1c7ed6] hover:bg-[#4a9ff5]/10"
            }
          >
            <BarChart3 className="h-4 w-4" />
            {isCompleted ? "Test this lesson" : "Take Quiz"}
          </Button>
        )}

        <Button
          size="sm"
          onClick={handleAiTutor}
          variant="outline"
          className="border-[#4a9ff5]/40 bg-white/70 text-[#1c7ed6] hover:bg-[#4a9ff5]/10"
        >
          <Sparkles className="h-4 w-4" />
          Ask AI
        </Button>

        {!isCompleted ? (
          <Button
            size="sm"
            disabled={isCompleting}
            className="bg-[#0d6efd] hover:bg-[#1c7ed6] text-white"
            onClick={onMarkComplete}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isCompleting ? "Saving…" : "Mark Complete"}
          </Button>
        ) : nextLessonId ? (
          <Button
            size="sm"
            className="bg-[#0d6efd] hover:bg-[#1c7ed6] text-white"
            disabled={isLessonSwitching}
            onClick={handleNavigateNext}
          >
            <PlayCircle className="h-4 w-4" />
            Continue Lesson
          </Button>
        ) : (
          <Button size="sm" disabled className="bg-[#0d6efd] text-white">
            <CheckCircle2 className="h-4 w-4" />
            Module Complete
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="border-gray-200 bg-white/70"
          onClick={onToggleBookmark}
        >
          <Bookmark className="h-4 w-4" />
          {isCourseSaved ? "Saved" : "Save Course"}
        </Button>
      </div>

      {/* Post-completion nudge */}
      {isCompleted && (
        <div className="mt-3 rounded-lg border border-[#4a9ff5]/20 bg-[#4a9ff5]/5 px-3 py-2.5">
          <p className="text-sm font-medium text-gray-800 mb-2">
            {lesson.quizAvailable && lesson.quizId
              ? isQuizNudgeDismissed
                ? "You can skip, but this is where it sticks."
                : learnerName !== "there"
                  ? `${learnerName}, quick quiz on ${lesson.title}?`
                  : `Quick quiz on ${lesson.title}?`
              : nextLesson
                ? `Nice finish. Next up: ${nextLesson.title}.`
                : "You finished this lesson. Review notes or continue your module."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {lesson.quizAvailable && lesson.quizId ? (
              <>
                <Button
                  size="sm"
                  className="bg-[#0d6efd] hover:bg-[#1c7ed6] text-white"
                  onClick={handleLaunchQuiz}
                >
                  Quick Quiz
                </Button>
                {!isQuizNudgeDismissed && (
                  <button
                    type="button"
                    className="text-xs font-medium text-gray-500 hover:text-gray-800"
                    onClick={() => {
                      setIsQuizNudgeDismissed(true);
                      window.sessionStorage.setItem(
                        `lesson-quiz-nudge-dismissed:${lesson.id}`,
                        "1",
                      );
                    }}
                  >
                    Not now
                  </button>
                )}
              </>
            ) : nextLesson ? (
              <Button
                size="sm"
                className="bg-[#0d6efd] hover:bg-[#1c7ed6] text-white"
                onClick={() => {
                  navigate(`/courses/${parsedCourseId}/lessons/${nextLesson.id}`);
                }}
              >
                Continue to Next Lesson
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Upgrade prompt */}
      {upgradePrompt && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-sm text-amber-700 mb-2">{upgradePrompt}</p>
          <Button
            size="sm"
            className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
            onClick={handleUpgrade}
          >
            Upgrade to Pro
          </Button>
        </div>
      )}
    </div>
  );
}
