import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncFormSubmission } from "../hooks/useAsyncFormSubmission";
import { Button } from "../components/ui/button";
import { createStandaloneQuiz } from "../services/quizzes.service";
import type {
  StandaloneQuizInput,
  StandaloneQuizQuestionInput,
  StandaloneQuizQuestionOptionInput,
  QuizDifficulty,
  QuizQuestionType,
} from "../models/quizzes";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUIZ_CATEGORIES = [
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "Computer Science",
  "History",
  "Geography",
  "Literature",
  "Economics",
  "General Knowledge",
  "Other",
];

const EMPTY_OPTION: StandaloneQuizQuestionOptionInput = { text: "", isCorrect: false };

function createEmptyMCQQuestion(): StandaloneQuizQuestionInput {
  return {
    text: "",
    questionType: "MCQ",
    explanation: "",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  };
}

function createEmptyShortAnswerQuestion(): StandaloneQuizQuestionInput {
  return {
    text: "",
    questionType: "SHORT_ANSWER",
    explanation: "",
    answerKey: "",
    options: [],
  };
}

// ─── Question editor ──────────────────────────────────────────────────────────

export function getStandaloneQuizValidationError(input: {
  title: string;
  category: string;
  questions: StandaloneQuizQuestionInput[];
}): { message: string; questionIndex?: number } | null {
  if (input.title.trim().length < 3) {
    return { message: "Quiz title must be at least 3 characters." };
  }
  if (!input.category) {
    return { message: "Please select a category." };
  }
  if (input.questions.length === 0) {
    return { message: "Add at least one question." };
  }

  for (let i = 0; i < input.questions.length; i++) {
    const q = input.questions[i];
    if (q.text.trim().length < 3) {
      return { message: `Question ${i + 1}: question text is too short.`, questionIndex: i };
    }
    if (q.questionType === "SHORT_ANSWER") {
      if (!q.answerKey?.trim()) {
        return {
          message: `Question ${i + 1}: add grading keywords for the short-answer question.`,
          questionIndex: i,
        };
      }
      continue;
    }
    if (q.options.length < 2) {
      return { message: `Question ${i + 1}: add at least 2 options.`, questionIndex: i };
    }
    if (q.options.some((o) => o.text.trim() === "")) {
      return { message: `Question ${i + 1}: all options must have text.`, questionIndex: i };
    }
    if (q.options.filter((o) => o.isCorrect).length !== 1) {
      return { message: `Question ${i + 1}: mark exactly one option as the correct answer.`, questionIndex: i };
    }
  }

  return null;
}

interface QuestionEditorProps {
  question: StandaloneQuizQuestionInput;
  index: number;
  isExpanded: boolean;
  isOnly: boolean;
  onToggle: () => void;
  onChange: (updated: StandaloneQuizQuestionInput) => void;
  onDelete: () => void;
}

function QuestionEditor({
  question,
  index,
  isExpanded,
  isOnly,
  onToggle,
  onChange,
  onDelete,
}: QuestionEditorProps) {
  const headerPreview = question.text.trim()
    ? question.text.trim().slice(0, 60) + (question.text.trim().length > 60 ? "…" : "")
    : `Question ${index + 1}`;

  const updateField = <K extends keyof StandaloneQuizQuestionInput>(
    field: K,
    value: StandaloneQuizQuestionInput[K],
  ) => {
    onChange({ ...question, [field]: value });
  };

  const setQuestionType = (type: QuizQuestionType) => {
    if (type === "MCQ") {
      onChange({
        ...question,
        questionType: "MCQ",
        answerKey: undefined,
        options: [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
      });
    } else {
      onChange({ ...question, questionType: "SHORT_ANSWER", options: [], answerKey: "" });
    }
  };

  const updateOption = (oidx: number, field: keyof StandaloneQuizQuestionOptionInput, value: string | boolean) => {
    const updated = question.options.map((o, i) => {
      if (field === "isCorrect") {
        // Only one option may be correct at a time
        return { ...o, isCorrect: i === oidx };
      }
      return i === oidx ? { ...o, [field]: value as string } : o;
    });
    onChange({ ...question, options: updated });
  };

  const addOption = () => {
    if (question.options.length >= 6) return;
    onChange({ ...question, options: [...question.options, { ...EMPTY_OPTION }] });
  };

  const removeOption = (oidx: number) => {
    if (question.options.length <= 2) return;
    const updated = question.options.filter((_, i) => i !== oidx);
    // Ensure at least one option is still marked correct
    const hasCorrect = updated.some((o) => o.isCorrect);
    if (!hasCorrect && updated.length > 0) {
      updated[0] = { ...updated[0], isCorrect: true };
    }
    onChange({ ...question, options: updated });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-gray-800"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 shrink-0 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0 text-gray-500" />
          )}
          <span className="truncate">{headerPreview}</span>
          <span className="ml-1 shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {question.questionType === "SHORT_ANSWER" ? "Short Answer" : "MCQ"}
          </span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isOnly}
          title={isOnly ? "Cannot delete the only question" : "Delete question"}
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
          {/* Type switcher */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setQuestionType("MCQ")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                question.questionType === "MCQ"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Multiple Choice
            </button>
            <button
              type="button"
              onClick={() => setQuestionType("SHORT_ANSWER")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                question.questionType === "SHORT_ANSWER"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Short Answer
            </button>
          </div>

          {/* Question text */}
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase text-gray-600">Question</span>
            <textarea
              value={question.text}
              onChange={(e) => updateField("text", e.target.value)}
              rows={2}
              placeholder="Enter the question here"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          {/* MCQ options */}
          {question.questionType === "MCQ" && (
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase text-gray-600">Answer Options</span>
              {question.options.map((option, oidx) => (
                <div key={oidx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={option.isCorrect}
                    onChange={() => updateOption(oidx, "isCorrect", true)}
                    title="Mark as correct answer"
                    className="accent-blue-500 shrink-0"
                  />
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => updateOption(oidx, "text", e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + oidx)}`}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={question.options.length <= 2}
                    onClick={() => removeOption(oidx)}
                    title="Remove option"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {question.options.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add option
                </Button>
              )}
              <p className="text-xs text-gray-500">Select the radio button next to the correct answer.</p>
            </div>
          )}

          {/* Short answer keyword grading */}
          {question.questionType === "SHORT_ANSWER" && (
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase text-gray-600">Grading Keywords</span>
              <textarea
                value={question.answerKey ?? ""}
                onChange={(e) => updateField("answerKey", e.target.value)}
                rows={2}
                placeholder="e.g. photosynthesis, chlorophyll, light energy, glucose"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500">
                Comma-separated keywords. Each keyword = 1 mark. Case-insensitive.
                Not shown to students.
              </p>
            </label>
          )}

          {/* Explanation */}
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase text-gray-600">Explanation (optional)</span>
            <textarea
              value={question.explanation ?? ""}
              onChange={(e) => updateField("explanation", e.target.value)}
              rows={2}
              placeholder="Shown to students after submission"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function InstructorQuizAuthoringPage() {
  const navigate = useNavigate();
  const { isSubmitting, submitError, submitSuccess, run: runSubmit } = useAsyncFormSubmission();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [createdQuizId, setCreatedQuizId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(QUIZ_CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("Medium");
  const [description, setDescription] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [hasTimed, setHasTimed] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [isPremium, setIsPremium] = useState(false);
  const [questions, setQuestions] = useState<StandaloneQuizQuestionInput[]>([
    createEmptyMCQQuestion(),
  ]);
  const [expandedIndex, setExpandedIndex] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ── Validation helpers ──────────────────────────────────────────────────────
  // ── Handlers ────────────────────────────────────────────────────────────────
  const addQuestion = (type: QuizQuestionType) => {
    const newQ = type === "SHORT_ANSWER" ? createEmptyShortAnswerQuestion() : createEmptyMCQQuestion();
    setQuestions((prev) => [...prev, newQ]);
    setExpandedIndex(questions.length);
  };

  const updateQuestion = (idx: number, updated: StandaloneQuizQuestionInput) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? updated : q)));
  };

  const deleteQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIndex((prev) => (prev >= idx && prev > 0 ? prev - 1 : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationResult = getStandaloneQuizValidationError({ title, category, questions });
    if (validationResult) {
      setValidationError(validationResult.message);
      if (validationResult.questionIndex !== undefined) {
        setExpandedIndex(validationResult.questionIndex);
      }
      return;
    }
    setValidationError(null);

    const input: StandaloneQuizInput = {
      title: title.trim(),
      category,
      difficulty,
      description: description.trim() || undefined,
      passingScore,
      timeLimitSeconds: hasTimed ? timeLimitMinutes * 60 : undefined,
      isPremium,
      questions: questions.map((question) => ({
        ...question,
        text: question.text.trim(),
        explanation: question.explanation?.trim() || undefined,
        answerKey: question.questionType === "SHORT_ANSWER"
          ? question.answerKey?.trim()
          : undefined,
        options: question.questionType === "MCQ"
          ? question.options.map((option) => ({ ...option, text: option.text.trim() }))
          : [],
      })),
    };

    void runSubmit(
      async () => createStandaloneQuiz(input),
      {
        successMessage: "Quiz published and live — no review required. Students can discover it now.",
        clearSuccessAfterMs: 0,
        onSuccess: (result) => {
          setCreatedQuizId(result.quizId);
          window.setTimeout(() => navigate("/instructor"), 3000);
        },
      },
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      {/* Back + heading */}
      <div className="mb-8 flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate("/instructor")}
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Create Quiz</h1>
          <p className="text-gray-600 text-sm mt-0.5">
            Standalone quizzes publish immediately — no admin review required. They appear in the
            student Quizzes tab, grouped by subject, as soon as you save.
          </p>
        </div>
      </div>

      {submitSuccess ? (
        <div className="mb-6 space-y-2">
          <ActionSuccessState message={submitSuccess} />
          {createdQuizId ? (
            <p className="text-sm text-gray-600 pl-1">
              Redirecting to dashboard in a moment.{" "}
              <a
                href={`/quizzes/${createdQuizId}`}
                className="font-medium text-[#4a9ff5] underline-offset-2 hover:underline"
              >
                Preview as student →
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {validationError || submitError ? (
        <DataErrorState description={validationError ?? submitError ?? ""} className="mb-6" />
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Quiz details ── */}
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Quiz details</h2>

          {/* Title */}
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cell Biology Fundamentals"
              maxLength={200}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          {/* Category */}
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Category *</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {QUIZ_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          {/* Difficulty */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-700 block">Difficulty</span>
            <div className="flex gap-2">
              {(["Easy", "Medium", "Hard"] as QuizDifficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    difficulty === d
                      ? d === "Easy"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : d === "Medium"
                          ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                          : "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description visible to students"
              maxLength={2000}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          {/* Passing score */}
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">
              Passing score: <strong>{passingScore}%</strong>
            </span>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>10%</span>
              <span>100%</span>
            </div>
          </label>
        </GlassCard>

        {/* ── Access & timing ── */}
        <GlassCard className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Access &amp; timing</h2>

          {/* Timer toggle */}
          <div className="flex items-start gap-3">
            <input
              id="hasTimed"
              type="checkbox"
              checked={hasTimed}
              onChange={(e) => setHasTimed(e.target.checked)}
              className="mt-0.5 accent-blue-500"
            />
            <label htmlFor="hasTimed" className="block">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4 text-gray-500" />
                Enable time limit
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Students must finish within the allotted time. The quiz auto-submits on expiry.
              </p>
            </label>
          </div>

          {hasTimed && (
            <label className="block space-y-1 pl-7">
              <span className="text-sm font-medium text-gray-700">
                Time limit: <strong>{timeLimitMinutes} minutes</strong>
              </span>
              <input
                type="range"
                min={1}
                max={180}
                step={1}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1 min</span>
                <span>180 min</span>
              </div>
            </label>
          )}

          {/* Premium toggle */}
          <div className="flex items-start gap-3">
            <input
              id="isPremium"
              type="checkbox"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="mt-0.5 accent-blue-500"
            />
            <label htmlFor="isPremium" className="block">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Lock className="w-4 h-4 text-amber-500" />
                Pro-only quiz
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Only students with an active Pro subscription can access this quiz.
                Free students will see it listed but cannot start it.
              </p>
            </label>
          </div>
        </GlassCard>

        {/* ── Questions ── */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Questions ({questions.length})
            </h2>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addQuestion("MCQ")}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                MCQ
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addQuestion("SHORT_ANSWER")}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Short Answer
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <QuestionEditor
                key={idx}
                question={q}
                index={idx}
                isExpanded={expandedIndex === idx}
                isOnly={questions.length === 1}
                onToggle={() => setExpandedIndex((prev) => (prev === idx ? -1 : idx))}
                onChange={(updated) => updateQuestion(idx, updated)}
                onDelete={() => deleteQuestion(idx)}
              />
            ))}
          </div>
        </GlassCard>

        {/* ── Actions ── */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/instructor")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating…" : "Create Quiz"}
          </Button>
        </div>
      </form>
    </div>
  );
}
