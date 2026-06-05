import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Clock, Edit2, Eye, PlusCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import type { InstructorManagedCourse } from "../../models/courses";

interface CourseStatusCardProps {
  course: InstructorManagedCourse;
  onEdit?: (course: InstructorManagedCourse) => void;
  onAddQuiz?: (course: InstructorManagedCourse) => void;
  onSubmitForApproval?: (courseId: string) => void;
  onView?: (courseId: string) => void;
  isSubmitting?: boolean;
}

function getStatusIcon(status: InstructorManagedCourse["publicationStatus"]) {
  switch (status) {
    case "approved":
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case "pending-approval":
      return <Clock className="w-5 h-5 text-amber-600" />;
    case "rejected":
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    case "draft":
    default:
      return <Eye className="w-5 h-5 text-gray-600" />;
  }
}

function getStatusDescription(status: InstructorManagedCourse["publicationStatus"]) {
  switch (status) {
    case "approved":
      return "Your course is live and visible to students.";
    case "pending-approval":
      return "Waiting for admin review. Check back soon!";
    case "rejected":
      return "Please review the feedback and make corrections.";
    case "draft":
    default:
      return "Save as draft and submit when ready.";
  }
}

function getStatusBadgeStyle(status: InstructorManagedCourse["publicationStatus"]) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-900";
    case "pending-approval":
      return "bg-amber-100 text-amber-900";
    case "rejected":
      return "bg-red-100 text-red-900";
    case "draft":
    default:
      return "bg-gray-100 text-gray-900";
  }
}

export function CourseStatusCard({
  course,
  onEdit,
  onAddQuiz,
  onSubmitForApproval,
  onView,
  isSubmitting = false,
}: CourseStatusCardProps) {
  const canEdit = course.publicationStatus === "draft" || course.publicationStatus === "rejected";
  const [structureExpanded, setStructureExpanded] = useState(false);
  const totalQuizzes = course.modules.reduce(
    (sum, mod) => sum + mod.lessons.filter((l) => l.quizAvailable && l.quizId).length,
    0,
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon(course.publicationStatus)}
            <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
          </div>
          <p className="text-sm text-gray-600">{course.description}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold white-space-nowrap ${getStatusBadgeStyle(course.publicationStatus)}`}
        >
          {course.publicationStatus === "draft"
            ? "Draft"
            : course.publicationStatus === "pending-approval"
              ? "Pending"
              : course.publicationStatus === "approved"
                ? "Approved"
                : "Rejected"}
        </span>
      </div>

      {/* Course Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-500 uppercase">Category</div>
          <div className="font-medium text-gray-900">{course.category}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">Difficulty</div>
          <div className="font-medium text-gray-900 capitalize">{course.difficulty}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">Lessons</div>
          <div className="font-medium text-gray-900">{course.totalLessons}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase">Hours</div>
          <div className="font-medium text-gray-900">{course.estimatedHours}h</div>
        </div>
      </div>

      {/* Status Message */}
      <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
        <p className="text-sm text-blue-900">{getStatusDescription(course.publicationStatus)}</p>
      </div>

      {/* Rejection Feedback */}
      {course.rejectionReason && (
        <div className="rounded-lg bg-red-50 p-3 border border-red-200">
          <div className="text-xs font-semibold text-red-900 mb-1">Admin Feedback</div>
          <p className="text-sm text-red-800">{course.rejectionReason}</p>
        </div>
      )}

      {/* Course Structure */}
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          onClick={() => setStructureExpanded((prev) => !prev)}
        >
          <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
            <span>Course Structure</span>
            <span className="text-xs font-normal text-gray-500">
              {course.modules.length} {course.modules.length === 1 ? "module" : "modules"} ·{" "}
              {course.totalLessons} {course.totalLessons === 1 ? "lesson" : "lessons"}
              {totalQuizzes > 0 ? ` · ${totalQuizzes} ${totalQuizzes === 1 ? "quiz" : "quizzes"}` : ""}
            </span>
          </div>
          {structureExpanded
            ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
            : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          }
        </button>

        {structureExpanded && (
          <div className="divide-y divide-gray-100">
            {course.modules.map((mod, modIdx) => (
              <div key={mod.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                    Module {modIdx + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{mod.title || `Untitled Module ${modIdx + 1}`}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"}
                  </span>
                </div>
                <ul className="space-y-1 pl-2">
                  {mod.lessons.map((lesson, lessonIdx) => {
                    const quizCount = lesson.quizQuestions?.length ?? 0;
                    return (
                      <li key={lesson.id} className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
                        <span className="inline-block h-1 w-1 rounded-full bg-gray-300 shrink-0" />
                        <span className="font-medium">{lesson.title || `Lesson ${lessonIdx + 1}`}</span>
                        {lesson.duration ? (
                          <span className="text-gray-400">— {lesson.duration}</span>
                        ) : null}
                        {lesson.isFreePreview ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                            Free
                          </span>
                        ) : null}
                        {lesson.quizAvailable && lesson.quizId ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                            Quiz{quizCount > 0 ? ` · ${quizCount}q` : ""}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Created: {new Date(course.createdAt).toLocaleDateString()}</div>
        <div>Updated: {new Date(course.updatedAt).toLocaleDateString()}</div>
        {course.submittedAt && (
          <div>Submitted: {new Date(course.submittedAt).toLocaleDateString()}</div>
        )}
        {course.approvedAt && (
          <div>Approved: {new Date(course.approvedAt).toLocaleDateString()}</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
        {onView && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onView(course.id)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Course
          </Button>
        )}

        {canEdit && onEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(course)}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}

        {course.publicationStatus === "draft" && onSubmitForApproval && (
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
            onClick={() => onSubmitForApproval(course.id)}
          >
            {isSubmitting ? "Submitting..." : "Submit for Review"}
          </Button>
        )}

        {course.publicationStatus === "rejected" && onSubmitForApproval && (
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => onSubmitForApproval(course.id)}
          >
            {isSubmitting ? "Resubmitting..." : "Resubmit for Review"}
          </Button>
        )}

        {canEdit && onAddQuiz && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAddQuiz(course)}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Quiz
          </Button>
        )}
      </div>
    </div>
  );
}
