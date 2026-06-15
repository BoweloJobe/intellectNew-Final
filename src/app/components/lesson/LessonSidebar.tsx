import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  PlayCircle,
} from "lucide-react";
import type { VideoLesson } from "../../models/lessons";
import { getCourseAccessDecision } from "../../utils/course-access";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface SidebarModuleGroup {
  moduleId: string;
  moduleName: string;
  lessons: VideoLesson[];
}

interface LessonSidebarProps {
  sidebarModuleGroups: SidebarModuleGroup[];
  currentLessonId: string;
  orderedLessonsCount: number;
  completedLessonIds: string[];
  isCompleting: boolean;
  isLessonSwitching: boolean;
  canReadAllCourseLessons: boolean;
  onSetUpgradePrompt: (msg: string | null) => void;
}

export function LessonSidebar({
  sidebarModuleGroups,
  currentLessonId,
  orderedLessonsCount,
  completedLessonIds,
  isCompleting,
  isLessonSwitching,
  canReadAllCourseLessons,
  onSetUpgradePrompt,
}: LessonSidebarProps) {
  const navigate = useNavigate();

  const totalGroups = sidebarModuleGroups.length;
  const showModuleHeaders = totalGroups > 1;

  return (
    <div className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900 leading-snug">Course Contents</h2>
        {orderedLessonsCount > 0 ? (
          <p className="text-xs text-gray-500 mt-0.5">
            {orderedLessonsCount} {orderedLessonsCount === 1 ? "lesson" : "lessons"}
            {totalGroups > 1 ? ` across ${totalGroups} modules` : ""}
          </p>
        ) : null}
      </div>

      {/* Scrollable lesson list — independent scroll */}
      {sidebarModuleGroups.length > 0 ? (
        <div
          className="overflow-y-auto overscroll-contain pr-0.5 space-y-3"
          style={{ maxHeight: "calc(100vh - 16rem)" }}
        >
          {sidebarModuleGroups.map((group, groupIdx) => (
            <div key={group.moduleId}>
              {showModuleHeaders && (
                <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Module {groupIdx + 1}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 truncate">
                    {group.moduleName}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {group.lessons.map((candidate) => {
                  const isCurrent = candidate.id === currentLessonId;
                  const isCompleted =
                    completedLessonIds.includes(candidate.id) ||
                    Boolean(candidate.isCompleted);
                  const accessDecision = getCourseAccessDecision({
                    courseStatus: canReadAllCourseLessons ? "enrolled" : "not-enrolled",
                    isFreePreview: candidate.isFreePreview,
                  });
                  const isLocked = !accessDecision.isAccessible;

                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      disabled={isCompleting || isCurrent || isLessonSwitching}
                      onClick={() => {
                        if (isLocked) {
                          onSetUpgradePrompt(
                            "Enroll in this course to unlock this lesson.",
                          );
                          return;
                        }
                        onSetUpgradePrompt(null);
                        navigate(
                          `/courses/${candidate.courseId}/lessons/${candidate.id}`,
                        );
                      }}
                      className={`w-full rounded-xl border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40 disabled:cursor-default ${
                        isCurrent
                          ? "border-[#4a9ff5]/50 bg-[#4a9ff5]/10"
                          : "border-white/60 bg-white/70 hover:bg-white"
                      }`}
                    >
                      <div className="flex gap-2.5">
                        {/* Thumbnail */}
                        <div className="h-14 w-20 overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 shrink-0 flex items-center justify-center text-lg text-white relative">
                          {candidate.thumbnailUrl.startsWith("http") ? (
                            <img
                              src={candidate.thumbnailUrl}
                              alt={candidate.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{candidate.thumbnailUrl}</span>
                          )}
                          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-semibold text-white">
                            {formatDuration(candidate.duration)}
                          </span>
                        </div>

                        {/* Meta */}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">
                            {candidate.title}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {titleCase(candidate.difficulty)} · Lesson {candidate.lessonOrder}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                            {isCurrent && (
                              <span className="inline-flex items-center gap-0.5 text-[#1c7ed6] font-semibold">
                                <PlayCircle className="h-3 w-3" />
                                Now Playing
                              </span>
                            )}
                            {isCompleted && !isCurrent && (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Done
                              </span>
                            )}
                            {isLocked && (
                              <span className="inline-flex items-center gap-0.5 text-amber-600">
                                <Clock className="h-3 w-3" />
                                Premium
                              </span>
                            )}
                            {!isLocked && candidate.isFreePreview && !isCurrent && (
                              <span className="text-sky-600">Free</span>
                            )}
                            {candidate.quizAvailable && candidate.quizId && (
                              <span className="inline-flex items-center gap-0.5 text-amber-600">
                                <BarChart3 className="h-3 w-3" />
                                Quiz
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-6">
          No further lessons available.
        </p>
      )}

      {/* Nav hint — inline, no extra card */}
      <p className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
        Select any lesson to jump to it.{" "}
        <span className="text-amber-600">Locked</span> lessons require course enrollment.
      </p>
    </div>
  );
}
