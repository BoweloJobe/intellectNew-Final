import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { ModuleEditor } from "./ModuleEditor";
import type {
  CourseDifficulty,
  InstructorCourseDraftInput,
  InstructorDraftLessonInput,
  InstructorDraftModuleInput,
  InstructorDraftQuizQuestionInput,
  InstructorManagedCourse,
} from "../../models/courses";
import type { QuizQuestion } from "../../models/quizzes";

export type CoursePriceResult =
  | { ok: true; price: number }
  | { ok: false; message: string };

export function resolveCoursePrice(isFree: boolean, rawPrice: string): CoursePriceResult {
  if (isFree) {
    return { ok: true, price: 0 };
  }

  const trimmedPrice = rawPrice.trim();
  if (!trimmedPrice) {
    return { ok: false, message: "Paid courses need a price greater than 0" };
  }

  const parsedPrice = Number(trimmedPrice);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return { ok: false, message: "Paid courses need a price greater than 0" };
  }

  return { ok: true, price: parsedPrice };
}

function quizQuestionToInput(q: QuizQuestion): InstructorDraftQuizQuestionInput {
  const findOption = (id: string) => q.options.find((o) => o.id === id)?.text ?? "";
  return {
    questionType: q.questionType,
    prompt: q.prompt,
    optionA: findOption("a"),
    optionB: findOption("b"),
    optionC: findOption("c"),
    optionD: findOption("d"),
    correctOption: q.correctOptionId as "a" | "b" | "c" | "d",
    explanation: q.explanation,
    answerKey: q.answerKey,
  };
}

interface CourseAuthoringFormProps {
  isSubmitting: boolean;
  isEditing?: boolean;
  editingCourse?: InstructorManagedCourse | null;
  availableCategories: string[];
  instructorName: string;
  onSubmit: (input: InstructorCourseDraftInput) => void;
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

function createEmptyModule(): InstructorDraftModuleInput {
  return {
    title: "",
    lessons: [createEmptyLesson()],
  };
}

export function CourseAuthoringForm({
  isSubmitting,
  isEditing = false,
  editingCourse,
  availableCategories,
  instructorName,
  onSubmit,
}: CourseAuthoringFormProps) {
  const [title, setTitle] = useState(editingCourse?.title ?? "");
  const [category, setCategory] = useState(editingCourse?.category ?? "Biology");
  const [description, setDescription] = useState(editingCourse?.description ?? "");
  const [difficulty, setDifficulty] = useState<CourseDifficulty>(editingCourse?.difficulty ?? "beginner");
  const [estimatedHours, setEstimatedHours] = useState(
    editingCourse?.estimatedHours ? String(editingCourse.estimatedHours) : ""
  );
  const [isFree, setIsFree] = useState((editingCourse?.price ?? 0) === 0);
  const [price, setPrice] = useState(
    editingCourse?.price && editingCourse.price > 0 ? String(editingCourse.price) : ""
  );
  const [coverImageUrl, setCoverImageUrl] = useState(editingCourse?.coverImageUrl ?? "");
  
  // Convert CourseModule to InstructorDraftModuleInput if editing, otherwise use empty module
  const initialModules = editingCourse?.modules
    ? editingCourse.modules.map((mod) => ({
        id: mod.id,           // preserve backend ID for targeted updates/deletes
        title: mod.title,
        lessons: mod.lessons.map((lesson) => ({
          id: lesson.id,      // preserve backend ID
          title: lesson.title,
          videoUrl: lesson.videoUrl || "",
          description: lesson.description || "",
          duration: lesson.duration,
          estimatedCompletionTimeMinutes: lesson.estimatedCompletionTimeMinutes || 20,
          notesContent: lesson.notesContent || "",
          isFreePreview: lesson.isFreePreview || false,
          quizAvailable: lesson.quizAvailable || false,
          quizId: lesson.quizId,
          quizTimeLimitMinutes: lesson.quizTimeLimitSeconds
            ? Math.ceil(lesson.quizTimeLimitSeconds / 60)
            : null,
          quizQuestions: lesson.quizQuestions?.map(quizQuestionToInput),
        })),
      }))
    : [createEmptyModule()];
  
  const [modules, setModules] = useState<InstructorDraftModuleInput[]>(initialModules);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedEstimatedHours = Number(estimatedHours);
    const priceResult = resolveCoursePrice(isFree, price);
    const normalizedModules = modules
      .map((module) => ({
        id: module.id,
        title: module.title.trim(),
        lessons: module.lessons
          .map((lesson) => ({
            id: lesson.id,
            title: lesson.title.trim(),
            videoUrl: lesson.videoUrl.trim(),
            description: lesson.description.trim(),
            duration: lesson.duration.trim(),
            estimatedCompletionTimeMinutes: Number(lesson.estimatedCompletionTimeMinutes),
            notesContent: lesson.notesContent.trim(),
            isFreePreview: Boolean(lesson.isFreePreview),
            quizAvailable: Boolean(lesson.quizAvailable),
            quizId: lesson.quizId?.trim() || undefined,
            quizTimeLimitMinutes:
              lesson.quizAvailable && lesson.quizTimeLimitMinutes && lesson.quizTimeLimitMinutes > 0
                ? Number(lesson.quizTimeLimitMinutes)
                : null,
            quizQuestions: lesson.quizQuestions,
          }))
          .filter((lesson) => lesson.title.length > 0),
      }))
      .filter((module) => module.title.length > 0);

    const totalLessons = normalizedModules.reduce((total, module) => total + module.lessons.length, 0);

    const hasInvalidLesson = normalizedModules.some((module) =>
      module.lessons.length === 0 || module.lessons.some(
        (lesson) =>
          !lesson.title ||
          !lesson.videoUrl ||
          !lesson.description ||
          !lesson.duration ||
          !lesson.notesContent ||
          !Number.isFinite(lesson.estimatedCompletionTimeMinutes) ||
          lesson.estimatedCompletionTimeMinutes <= 0
      )
    );

    if (!title.trim() || !description.trim() || !priceResult.ok) {
      const validationMessages = ["Complete all required fields:", "- Course title and description"];
      if (!priceResult.ok) {
        validationMessages.push(`- ${priceResult.message}`);
      }
      alert(validationMessages.join("\n"));
      return;
    }

    if (
      isEditing &&
      (
        (estimatedHours.trim().length > 0 && (!Number.isFinite(parsedEstimatedHours) || parsedEstimatedHours <= 0)) ||
        (normalizedModules.length > 0 && hasInvalidLesson)
      )
    ) {
      alert(
        "Complete the fields you've started:\n" +
        "- Estimated hours must be greater than 0 when provided\n" +
        "- Each added module needs at least one complete lesson\n" +
        "- Each added lesson: title, video, description, duration, notes, estimated completion time"
      );
      return;
    }

    onSubmit({
      title: title.trim(),
      instructor: instructorName,
      category,
      description: description.trim(),
      difficulty,
      estimatedHours: estimatedHours.trim().length > 0 ? parsedEstimatedHours : undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      topics: modules.map((m) => m.title.trim()).filter(Boolean),
      modules: isEditing ? normalizedModules : [],
      totalLessons,
      initialStatus: "draft",
      price: priceResult.price,
    });
  };

  const handleAddModule = () => {
    const newIndex = modules.length;
    setModules([...modules, createEmptyModule()]);
    setExpandedModules((prev) => new Set([...prev, newIndex]));
  };

  const handleUpdateModule = (index: number, updated: InstructorDraftModuleInput) => {
    const newModules = [...modules];
    newModules[index] = updated;
    setModules(newModules);
  };

  const handleDeleteModule = (index: number) => {
    if (modules.length > 1) {
      setModules(modules.filter((_, i) => i !== index));
      setExpandedModules((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const toggleModuleExpanded = (index: number, expanded: boolean) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (expanded) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Course Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600 uppercase">Course Title *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Advanced Immunology"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600 uppercase">Category *</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            required
          >
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600 uppercase">Difficulty *</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as CourseDifficulty)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            required
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>

        <div className="space-y-1">
          <span className="text-xs font-medium text-gray-600 uppercase">Pricing *</span>
          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setIsFree(true)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isFree ? "bg-gray-100 text-gray-950" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => setIsFree(false)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                !isFree ? "bg-gray-100 text-gray-950" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Paid
            </button>
          </div>
        </div>

        {!isFree && (
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 uppercase">Price</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min={0}
              step="0.01"
              placeholder="49"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        )}
      </div>

      {/* Description */}
      <label className="space-y-1">
        <span className="text-xs font-medium text-gray-600 uppercase">Course Description *</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What will students learn in this course?"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          required
        />
      </label>

      {isEditing && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-600 uppercase">Estimated Hours</span>
              <input
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                type="number"
                min={1}
                placeholder="10"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-600 uppercase">Cover Image URL</span>
              <input
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          {/* Modules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Modules and Lessons</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddModule}>
                <Plus className="w-4 h-4 mr-2" />
                Add Module
              </Button>
            </div>

            <div className="space-y-2">
              {modules.map((module, moduleIndex) => (
                <ModuleEditor
                  key={`module-${moduleIndex}`}
                  module={module}
                  moduleIndex={moduleIndex}
                  isOnlyModule={modules.length === 1}
                  isExpanded={expandedModules.has(moduleIndex)}
                  courseName={title}
                  instructorName={instructorName}
                  onToggleExpand={(expanded) => toggleModuleExpanded(moduleIndex, expanded)}
                  onUpdate={(updated) => handleUpdateModule(moduleIndex, updated)}
                  onDelete={() => handleDeleteModule(moduleIndex)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Live Structure Summary */}
      {isEditing && modules.some((m) => m.title.trim().length > 0) && (() => {
        const summaryModules = modules.filter((m) => m.title.trim().length > 0);
        const summaryLessons = modules.flatMap((m) => m.lessons.filter((l) => l.title.trim().length > 0));
        const summaryQuizzes = summaryLessons.filter((l) => l.quizAvailable && (l.quizQuestions?.length ?? 0) > 0);
        return (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-gray-900">Course Structure</span>
              <span className="text-gray-500">
                {summaryModules.length} {summaryModules.length === 1 ? "module" : "modules"}
                {" · "}
                {summaryLessons.length} {summaryLessons.length === 1 ? "lesson" : "lessons"}
                {summaryQuizzes.length > 0 ? ` · ${summaryQuizzes.length} ${summaryQuizzes.length === 1 ? "quiz" : "quizzes"}` : ""}
              </span>
            </div>
            <div className="space-y-2">
              {modules.map((mod, modIdx) => {
                const modName = mod.title.trim() || `Module ${modIdx + 1} (untitled)`;
                const filledLessons = mod.lessons.filter((l) => l.title.trim().length > 0);
                return (
                  <div key={`summary-mod-${modIdx}`} className="text-sm">
                    <div className="font-medium text-gray-700">
                      {modIdx + 1}. {modName}
                      <span className="text-gray-400 font-normal ml-2">
                        ({filledLessons.length}/{mod.lessons.length} lessons)
                      </span>
                    </div>
                    {filledLessons.length > 0 && (
                      <ul className="mt-1 ml-4 space-y-0.5">
                        {filledLessons.map((lesson, lIdx) => (
                          <li key={`summary-l-${lIdx}`} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="h-1 w-1 rounded-full bg-gray-300 shrink-0 inline-block" />
                            <span>{lesson.title}</span>
                            {lesson.duration ? <span className="text-gray-400">— {lesson.duration}</span> : null}
                            {lesson.isFreePreview ? (
                              <span className="px-1 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">Free</span>
                            ) : null}
                            {lesson.quizAvailable && (lesson.quizQuestions?.length ?? 0) > 0 ? (
                              <span className="px-1 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                                Quiz · {lesson.quizQuestions!.length}q
                                {lesson.quizTimeLimitMinutes ? ` · ${lesson.quizTimeLimitMinutes}m` : ""}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" disabled={isSubmitting} className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white">
          {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Course"}
        </Button>
      </div>
    </form>
  );
}
