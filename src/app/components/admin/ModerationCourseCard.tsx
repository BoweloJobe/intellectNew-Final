import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, FileText, Video } from "lucide-react";
import { Button } from "../ui/button";
import type { CoursePublicationStatus, InstructorManagedCourse } from "../../models/courses";

interface ModerationCourseCardProps {
  course: InstructorManagedCourse;
  isSubmitting: boolean;
  rejectionNote: string;
  onRejectionNoteChange: (note: string) => void;
  onApprove: () => void;
  onReject: () => void;
}

function StatusBadge({ status }: { status: CoursePublicationStatus }) {
  const map: Record<CoursePublicationStatus, { label: string; className: string }> = {
    "pending-approval": { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
    approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
    draft: { label: "Draft", className: "bg-slate-100 text-slate-600" },
  };
  const { label, className } = map[status];
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

export function ModerationCourseCard({
  course,
  isSubmitting,
  rejectionNote,
  onRejectionNoteChange,
  onApprove,
  onReject,
}: ModerationCourseCardProps) {
  const isPending = course.publicationStatus === "pending-approval";
  const [contentExpanded, setContentExpanded] = useState(isPending);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const isRejected = course.publicationStatus === "rejected";
  const isDraft = course.publicationStatus === "draft";

  const totalLessons = course.modules.reduce((t, m) => t + m.lessons.length, 0);
  const totalQuizzes = course.modules.reduce(
    (t, m) => t + m.lessons.filter((l) => l.quizAvailable && l.quizId).length,
    0,
  );

  const submittedLabel = course.submittedAt
    ? new Date(course.submittedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-white/50 bg-white/[0.45] overflow-hidden">
      {/* Summary row — always visible */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="pt-0.5">
              <StatusBadge status={course.publicationStatus} />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 leading-snug">{course.title}</h4>
              <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0.5">
                <span>{course.instructor}</span>
                <span className="text-gray-300">·</span>
                <span>{course.category}</span>
                <span className="text-gray-300">·</span>
                <span className="capitalize">{course.difficulty}</span>
                <span className="text-gray-300">·</span>
                <span>{course.modules.length} {course.modules.length === 1 ? "module" : "modules"}</span>
                <span className="text-gray-300">·</span>
                <span>{totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}</span>
                <span className="text-gray-300">·</span>
                <span>{course.estimatedHours}h</span>
                <span className="text-gray-300">·</span>
                <span>
                  {course.price == null || course.price === 0 ? "Free" : `$${course.price}`}
                </span>
                {totalQuizzes > 0 ? (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-amber-600">{totalQuizzes} quiz{totalQuizzes !== 1 ? "zes" : ""}</span>
                  </>
                ) : null}
                {submittedLabel ? (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-400">Submitted {submittedLabel}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setContentExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-[#4a9ff5] font-medium shrink-0 hover:underline"
          >
            {contentExpanded ? "Hide" : "Review content"}
            {contentExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Progressive disclosure — content detail */}
      {contentExpanded && (
        <div className="border-t border-gray-100 bg-white/60 px-4 py-3 space-y-4">
          {/* Description */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Description
            </p>
            <p className="text-sm text-gray-700">{course.description}</p>
          </div>

          {/* Learning Outcomes */}
          {course.learningOutcomes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Learning Outcomes ({course.learningOutcomes.length})
              </p>
              <ul className="space-y-0.5">
                {course.learningOutcomes.map((outcome, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                    <span className="shrink-0 text-gray-400">·</span>
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Curriculum — per-module expand */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Curriculum
            </p>
            {course.modules.length === 0 ? (
              <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                Detailed module and lesson content is not included in the review queue response.
                Approve or reject based on the course metadata above.
              </p>
            ) : (
            <div className="space-y-1">
              {course.modules.map((mod) => {
                const isModExpanded = expandedModules.has(mod.id);
                const modQuizCount = mod.lessons.filter(
                  (l) => l.quizAvailable && l.quizId,
                ).length;
                return (
                  <div
                    key={mod.id}
                    className="rounded-lg border border-gray-100 bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isModExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-gray-800">{mod.title}</span>
                      </div>
                      <span className="text-xs text-gray-400 flex gap-2 items-center">
                        {modQuizCount > 0 ? (
                          <span className="text-amber-600">
                            {modQuizCount} quiz{modQuizCount !== 1 ? "zes" : ""}
                          </span>
                        ) : null}
                        {mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"}
                      </span>
                    </button>

                    {isModExpanded && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {mod.lessons.map((lesson) => {
                          const quizCount = lesson.quizQuestions?.length ?? 0;
                          return (
                            <div
                              key={lesson.id}
                              className="px-3 py-2 flex items-center gap-2 flex-wrap"
                            >
                              <span className="h-1 w-1 rounded-full bg-gray-300 shrink-0" />
                              <span className="text-xs text-gray-800 font-medium min-w-0 flex-1">
                                {lesson.title}
                              </span>
                              <span className="text-xs text-gray-400 shrink-0">{lesson.duration}</span>
                              {/* Video badge */}
                              {lesson.videoUrl ? (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                                  <Video className="w-3 h-3" />
                                  Video
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-400">
                                  No video
                                </span>
                              )}
                              {/* Notes badge */}
                              {lesson.notesContent ? (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                  <FileText className="w-3 h-3" />
                                  Notes
                                </span>
                              ) : null}
                              {/* Quiz badge */}
                              {lesson.quizAvailable && lesson.quizId ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                                  Quiz{quizCount > 0 ? ` · ${quizCount}q` : ""}
                                  {lesson.quizTimeLimitSeconds ? ` · ${Math.ceil(lesson.quizTimeLimitSeconds / 60)}m` : ""}
                                </span>
                              ) : null}
                              {/* Free badge */}
                              {lesson.isFreePreview ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700">
                                  Free
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Moderation actions — always shown for pending, inline below summary */}
      {isPending && (
        <div className="px-4 py-3 border-t border-gray-100 bg-white/30 space-y-2">
          <textarea
            value={rejectionNote}
            onChange={(e) => onRejectionNoteChange(e.target.value)}
            rows={2}
            placeholder="Optional rejection note (shown to instructor)"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={onApprove}
            >
              Approve
            </Button>
            <Button
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={onReject}
            >
              Reject
            </Button>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <p className="text-xs text-red-700">
            Rejection reason: {course.rejectionReason ?? "No reason provided."}
          </p>
        </div>
      )}

      {isDraft && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <p className="text-xs text-slate-500">Draft — awaiting instructor submission.</p>
        </div>
      )}
    </div>
  );
}
