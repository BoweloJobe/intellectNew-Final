import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { LessonEditor } from "./LessonEditor";
import type {
  InstructorDraftLessonInput,
  InstructorDraftModuleInput,
  LessonVideoUploadInput,
  LessonVideoUploadResult,
} from "../../models/courses";

interface ModuleEditorProps {
  module: InstructorDraftModuleInput;
  moduleIndex: number;
  isOnlyModule: boolean;
  isExpanded: boolean;
  courseId?: string;
  courseName?: string;
  instructorName?: string;
  onUploadLessonVideo?: (input: LessonVideoUploadInput) => Promise<LessonVideoUploadResult>;
  onToggleExpand: (expanded: boolean) => void;
  onUpdate: (updated: InstructorDraftModuleInput) => void;
  onDelete: () => void;
}

function createEmptyLesson(): InstructorDraftLessonInput {
  return {
    title: "",
    videoUrl: "",
    description: "",
    duration: "",
    estimatedCompletionTimeMinutes: 20,
    notesContent: "",
    isFreePreview: false,
    quizAvailable: false,
    quizTimeLimitMinutes: null,
    quizId: "",
  };
}

export function ModuleEditor({
  module,
  moduleIndex,
  isOnlyModule,
  isExpanded,
  courseId,
  courseName = "",
  instructorName = "",
  onUploadLessonVideo,
  onToggleExpand,
  onUpdate,
  onDelete,
}: ModuleEditorProps) {
  const updateTitle = (title: string) => {
    onUpdate({ ...module, title });
  };

  const updateLesson = (lessonIndex: number, updated: InstructorDraftLessonInput) => {
    const lessons = [...module.lessons];
    lessons[lessonIndex] = updated;
    onUpdate({ ...module, lessons });
  };

  const addLesson = () => {
    onUpdate({
      ...module,
      lessons: [...module.lessons, createEmptyLesson()],
    });
  };

  const deleteLesson = (lessonIndex: number) => {
    const lessons = module.lessons.filter((_, i) => i !== lessonIndex);
    onUpdate({ ...module, lessons: lessons.length > 0 ? lessons : [createEmptyLesson()] });
  };

  const duplicateLesson = (lessonIndex: number) => {
    const lesson = module.lessons[lessonIndex];
    const lessons = [...module.lessons];
    lessons.splice(lessonIndex + 1, 0, { ...lesson });
    onUpdate({ ...module, lessons });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white/80 shadow-sm">
      {/* Module Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Module {moduleIndex + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onToggleExpand(!isExpanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <input
            value={module.title}
            onChange={(e) => updateTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder={`Module ${moduleIndex + 1} title`}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4a9ff5]/40"
          />
          <span className="text-xs text-gray-500 shrink-0">
            {module.lessons.length} {module.lessons.length === 1 ? "lesson" : "lessons"}
          </span>
        </button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isOnlyModule}
          title={isOnlyModule ? "Cannot delete only module" : "Delete module"}
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Lessons (expanded) */}
      {isExpanded && (
        <div className="space-y-3 p-4">
          {module.lessons.map((lesson, lessonIndex) => (
            <LessonEditor
              key={`lesson-${lessonIndex}`}
              lesson={lesson}
              lessonIndex={lessonIndex}
              courseId={courseId}
              moduleId={module.id}
              moduleTitle={module.title || `Module ${moduleIndex + 1}`}
              courseName={courseName}
              instructorName={instructorName}
              isOnlyLesson={module.lessons.length === 1}
              onUploadVideo={onUploadLessonVideo}
              onUpdate={(updated) => updateLesson(lessonIndex, updated)}
              onDuplicate={() => duplicateLesson(lessonIndex)}
              onDelete={() => deleteLesson(lessonIndex)}
            />
          ))}

          {/* Add Lesson Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLesson}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Lesson
          </Button>
        </div>
      )}
    </div>
  );
}
