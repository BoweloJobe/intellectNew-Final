import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { InstructorDraftQuizQuestionInput } from "../../models/courses";
import { Button } from "../ui/button";

interface LessonQuizEditorProps {
  questions: InstructorDraftQuizQuestionInput[];
  onChange: (questions: InstructorDraftQuizQuestionInput[]) => void;
}

function createEmptyQuestion(): InstructorDraftQuizQuestionInput {
  return {
    prompt: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "a",
    explanation: "",
  };
}

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const OPTION_FIELDS = ["optionA", "optionB", "optionC", "optionD"] as const satisfies readonly (keyof InstructorDraftQuizQuestionInput)[];
const OPTION_VALUES = ["a", "b", "c", "d"] as const satisfies readonly InstructorDraftQuizQuestionInput["correctOption"][];

interface QuestionEditorProps {
  question: InstructorDraftQuizQuestionInput;
  questionIndex: number;
  isExpanded: boolean;
  isOnly: boolean;
  onToggle: () => void;
  onChange: (updated: InstructorDraftQuizQuestionInput) => void;
  onDelete: () => void;
}

function QuestionEditor({
  question,
  questionIndex,
  isExpanded,
  isOnly,
  onToggle,
  onChange,
  onDelete,
}: QuestionEditorProps) {
  const updateField = <K extends keyof InstructorDraftQuizQuestionInput>(
    field: K,
    value: InstructorDraftQuizQuestionInput[K],
  ) => {
    onChange({ ...question, [field]: value });
  };

  const headerPreview = question.prompt.trim()
    ? question.prompt.trim().slice(0, 60) + (question.prompt.trim().length > 60 ? "…" : "")
    : `Question ${questionIndex + 1}`;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
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
          {headerPreview}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isOnly}
          title={isOnly ? "Cannot delete only question" : "Delete question"}
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Prompt */}
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-gray-600 uppercase">Question</span>
            <textarea
              value={question.prompt}
              onChange={(e) => updateField("prompt", e.target.value)}
              rows={2}
              placeholder="Enter the question here"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          {/* Options */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-gray-600 uppercase">Answer Options</span>
            {OPTION_FIELDS.map((field, index) => (
              <div key={field} className="flex items-center gap-2">
                <label className="flex items-center gap-2 shrink-0">
                  <input
                    type="radio"
                    name={`correct-${questionIndex}`}
                    checked={question.correctOption === OPTION_VALUES[index]}
                    onChange={() => updateField("correctOption", OPTION_VALUES[index])}
                    className="accent-[#4a9ff5]"
                  />
                  <span className="w-5 text-xs font-bold text-gray-600">{OPTION_LABELS[index]}</span>
                </label>
                <input
                  value={question[field] as string}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder={`Option ${OPTION_LABELS[index]}`}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                    question.correctOption === OPTION_VALUES[index]
                      ? "border-[#4a9ff5] bg-[#4a9ff5]/5"
                      : "border-gray-200 bg-white"
                  }`}
                />
              </div>
            ))}
            <p className="text-xs text-gray-500">Select the radio button next to the correct option.</p>
          </div>

          {/* Explanation */}
          <label className="space-y-1 block">
            <span className="text-xs font-medium text-gray-600 uppercase">Explanation / Feedback</span>
            <textarea
              value={question.explanation}
              onChange={(e) => updateField("explanation", e.target.value)}
              rows={2}
              placeholder="Shown to student after they answer"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function LessonQuizEditor({ questions, onChange }: LessonQuizEditorProps) {
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set([0]));

  const toggleExpanded = (index: number) => {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addQuestion = () => {
    const newIndex = questions.length;
    onChange([...questions, createEmptyQuestion()]);
    setExpandedIndexes((prev) => new Set([...prev, newIndex]));
  };

  const updateQuestion = (index: number, updated: InstructorDraftQuizQuestionInput) => {
    const next = [...questions];
    next[index] = updated;
    onChange(next);
  };

  const deleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      return;
    }

    onChange(questions.filter((_, i) => i !== index));
    setExpandedIndexes((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx < index) {
          next.add(idx);
        } else if (idx > index) {
          next.add(idx - 1);
        }
      }
      return next;
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-[#4a9ff5]/30 bg-[#4a9ff5]/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Quiz Questions</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {questions.length} question{questions.length !== 1 ? "s" : ""} · auto-graded · students see results after submission
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
          <Plus className="w-4 h-4 mr-1" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
          No questions yet. Add at least one question to enable the quiz for this lesson.
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((question, index) => (
            <QuestionEditor
              key={`quiz-q-${index}`}
              question={question}
              questionIndex={index}
              isExpanded={expandedIndexes.has(index)}
              isOnly={questions.length === 1}
              onToggle={() => toggleExpanded(index)}
              onChange={(updated) => updateQuestion(index, updated)}
              onDelete={() => deleteQuestion(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
