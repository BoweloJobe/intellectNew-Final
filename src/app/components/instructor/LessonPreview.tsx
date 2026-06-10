import { Clock, BookOpen } from "lucide-react";
import { GlassCard } from "../GlassCard";
import type { InstructorDraftLessonInput } from "../../models/courses";

interface LessonPreviewProps {
  lesson: InstructorDraftLessonInput;
  moduleTitle: string;
  courseName: string;
  instructorName: string;
}

function canEmbedVideo(url: string): boolean {
  if (!url.trim()) return false;
  return /^(https?:)?\/\//i.test(url);
}

function formatMinutes(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}

export function LessonPreview({
  lesson,
  moduleTitle,
  courseName,
  instructorName,
}: LessonPreviewProps) {
  const hasVideo = canEmbedVideo(lesson.videoUrl);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Student Preview</h3>

      <GlassCard className="space-y-4">
        {/* Lesson Header */}
        <div className="border-b border-white/20 pb-4">
          <div className="text-sm text-gray-500 mb-2">
            {courseName} · {moduleTitle}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {lesson.title || "Untitled Lesson"}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{lesson.duration || "TBD"}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{formatMinutes(lesson.estimatedCompletionTimeMinutes)} to complete</span>
            </div>
            {lesson.isFreePreview && (
              <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                Free Preview
              </div>
            )}
          </div>
        </div>

        {/* Video Embed (if valid URL) */}
        {hasVideo ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Video</div>
            <div className="rounded-lg bg-gray-900 aspect-video flex items-center justify-center">
              <iframe
                width="100%"
                height="100%"
                src={lesson.videoUrl}
                title={lesson.title || "Lesson Video"}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-100 aspect-video flex items-center justify-center text-gray-500 text-sm">
            {lesson.videoUrl ? "Invalid video URL" : "No video URL provided"}
          </div>
        )}

        {/* Description */}
        {lesson.description && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">About This Lesson</h3>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {lesson.description}
            </p>
          </div>
        )}

        {/* Notes/Content */}
        {lesson.notesContent && (
          <div className="space-y-2 rounded-lg bg-blue-50 p-3 border border-blue-100">
            <h3 className="text-sm font-semibold text-gray-900">Lesson Notes</h3>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {lesson.notesContent}
            </div>
          </div>
        )}

        {/* Quiz Indicator */}
        {lesson.quizAvailable && (
          <div className="rounded-lg bg-purple-50 p-3 border border-purple-100">
            <div className="text-sm font-medium text-purple-900">
              Quiz available for this lesson
              {(lesson.quizQuestions?.length ?? 0) > 0
                ? ` · ${lesson.quizQuestions!.length} question${lesson.quizQuestions!.length === 1 ? "" : "s"}`
                : ""}
              {lesson.quizTimeLimitMinutes ? ` · ${lesson.quizTimeLimitMinutes} min` : ""}
            </div>
          </div>
        )}

        {/* Instructor */}
        <div className="border-t border-white/20 pt-4 text-sm text-gray-600">
          Taught by <span className="font-medium text-gray-900">{instructorName}</span>
        </div>
      </GlassCard>

      {/* Validation Messages */}
      <div className="space-y-1 text-xs">
        {!lesson.title && (
          <div className="text-amber-600">⚠ Lesson title is required</div>
        )}
        {!lesson.description && (
          <div className="text-amber-600">⚠ Lesson description is required</div>
        )}
        {!lesson.videoUrl && (
          <div className="text-amber-600">⚠ Video URL is required</div>
        )}
        {lesson.videoUrl && !hasVideo && (
          <div className="text-amber-600">⚠ Video URL looks invalid</div>
        )}
        {!lesson.duration && (
          <div className="text-amber-600">⚠ Duration label is required</div>
        )}
        {lesson.estimatedCompletionTimeMinutes <= 0 && (
          <div className="text-amber-600">⚠ Estimated completion time must be positive</div>
        )}
        {!lesson.notesContent && (
          <div className="text-amber-600">⚠ Instructor notes are recommended</div>
        )}
      </div>
    </div>
  );
}
