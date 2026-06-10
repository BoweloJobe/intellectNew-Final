import { useState } from "react";
import { Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import type { InstructorDraftLessonInput } from "../../models/courses";
import { LessonQuizEditor } from "./LessonQuizEditor";
import { LessonPreview } from "./LessonPreview";

interface LessonEditorProps {
  lesson: InstructorDraftLessonInput;
  lessonIndex: number;
  moduleTitle: string;
  courseName?: string;
  instructorName?: string;
  isOnlyLesson: boolean;
  onUpdate: (updated: InstructorDraftLessonInput) => void;
  onDuplicate?: () => void;
  onDelete: () => void;
}

export function LessonEditor({
  lesson,
  lessonIndex,
  moduleTitle,
  courseName = "",
  instructorName = "",
  isOnlyLesson,
  onUpdate,
  onDuplicate,
  onDelete,
}: LessonEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  const updateField = <K extends keyof InstructorDraftLessonInput>(
    field: K,
    value: InstructorDraftLessonInput[K],
  ) => {
    onUpdate({ ...lesson, [field]: value });
  };

  const canEmbedVideo = (url: string): boolean => {
    if (!url.trim()) return false;
    return /^(https?:)?\/\//i.test(url);
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 space-y-4">
      {/* Lesson Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">
            Lesson {lessonIndex + 1} · {moduleTitle}
          </h4>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title={showPreview ? "Back to editing" : "Preview as student"}
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          {onDuplicate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Duplicate lesson"
              onClick={onDuplicate}
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isOnlyLesson}
            title={isOnlyLesson ? "Cannot delete only lesson in module" : "Delete lesson"}
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showPreview ? (
        <LessonPreview
          lesson={lesson}
          moduleTitle={moduleTitle}
          courseName={courseName || "This Course"}
          instructorName={instructorName || "Instructor"}
        />
      ) : (
        <>
          {/* Title (full width) */}
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 uppercase">Title *</span>
            <input
              value={lesson.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Lesson title"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          {/* Duration + Estimated Completion (same row) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-600 uppercase">Duration Label *</span>
              <input
                value={lesson.duration}
                onChange={(e) => updateField("duration", e.target.value)}
                placeholder="e.g. 15 min"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-600 uppercase">Estimated Completion (min) *</span>
              <input
                value={lesson.estimatedCompletionTimeMinutes}
                onChange={(e) => updateField("estimatedCompletionTimeMinutes", Number(e.target.value))}
                type="number"
                min={1}
                placeholder="20"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          {/* Description */}
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 uppercase">Description *</span>
            <textarea
              value={lesson.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={2}
              placeholder="What will students learn in this lesson?"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          {/* Video Source */}
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 uppercase">Video URL *</span>
            <input
              value={lesson.videoUrl}
              onChange={(e) => updateField("videoUrl", e.target.value)}
              placeholder="https://www.youtube.com/embed/... or https://vimeo.com/..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            {lesson.videoUrl && (
              <div className={`mt-1 text-xs ${canEmbedVideo(lesson.videoUrl) ? "text-emerald-700" : "text-amber-600"}`}>
                {canEmbedVideo(lesson.videoUrl) ? "✓ Video source looks embeddable" : "⚠ URL format may not embed — use an embed URL (e.g. youtube.com/embed/...)"}
              </div>
            )}
          </label>

          {/* Notes */}
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 uppercase">Instructor Notes *</span>
            <textarea
              value={lesson.notesContent}
              onChange={(e) => updateField("notesContent", e.target.value)}
              rows={2}
              placeholder="Notes, key concepts, or content for students"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={lesson.isFreePreview}
                onChange={(e) => updateField("isFreePreview", e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Free Preview</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={lesson.quizAvailable}
                onChange={(e) => {
                  const checked = e.target.checked;
                  // When enabling, seed one empty question so the editor opens immediately
                  onUpdate({
                    ...lesson,
                    quizAvailable: checked,
                    quizTimeLimitMinutes: checked ? lesson.quizTimeLimitMinutes ?? null : null,
                    quizQuestions: checked && (!lesson.quizQuestions || lesson.quizQuestions.length === 0)
                      ? [{ prompt: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "a", explanation: "" }]
                      : lesson.quizQuestions,
                  });
                }}
                className="rounded border-gray-300"
              />
              <span>Quiz Available</span>
            </label>
          </div>

          {/* Inline Quiz Authoring */}
          {lesson.quizAvailable && (
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600 uppercase">Quiz Time Limit (minutes)</span>
                <input
                  value={lesson.quizTimeLimitMinutes ?? ""}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    updateField("quizTimeLimitMinutes", value ? Number(value) : null);
                  }}
                  type="number"
                  min={1}
                  max={180}
                  placeholder="Untimed"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              <LessonQuizEditor
                questions={lesson.quizQuestions ?? []}
                onChange={(questions) => updateField("quizQuestions", questions)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
