import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Calendar, CheckCircle2, Clock, Lock, RotateCcw, Trophy, TrendingUp } from "lucide-react";
import type {
  QuizAttemptResult,
  QuizDifficulty,
  QuizzesPageData,
  QuizTemplate,
  PastQuiz,
  PracticeQuiz,
  QuizAnswerSubmission,
} from "../models/quizzes";
import { getQuizTemplate, getQuizzesPageData, startQuizAttempt, submitQuizAttempt } from "../services/quizzes.service";
import {
  createProductNotification,
  useNotificationsState,
} from "../state/notifications/NotificationsStateContext";
import { useAuth } from "../auth/AuthContext";
import { getAuthUserGreetingName } from "../auth/auth-normalizers";
import { useDashboardState } from "../state/dashboard/DashboardStateContext";

type QuizPageLocationState = {
  fromLesson?: string;
  courseName?: string;
  defaultTab?: "upcoming" | "past" | "practice";
};

interface ActiveQuizAttempt {
  template: QuizTemplate;
  attemptId: string;
  expiresAt?: string | null;
  answersByQuestionId: Record<string, QuizAnswerSubmission | undefined>;
  currentQuestionIndex: number;
  startedAt: number;
  contextLabel: string;
}

const EMPTY_QUIZZES_DATA: QuizzesPageData = {
  upcomingQuizzes: [],
  pastQuizzes: [],
  practiceQuizzes: [],
};

function getDifficultyBadgeClass(difficulty: QuizDifficulty): string {
  if (difficulty === "Easy") {
    return "bg-green-100 text-green-700";
  }

  if (difficulty === "Medium") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-red-100 text-red-700";
}

function formatElapsedSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
}

export function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? {}) as QuizPageLocationState;
  const { addRecentActivity, pushNotification } = useNotificationsState();
  const { applyQuizCompletion, applyQuizSubjectScore } = useDashboardState();
  const { user } = useAuth();
  const { errorMessage, isLoading, isError, run: runLoadQuizzes } = useAsyncViewState({
    defaultErrorMessage: "Quiz data is unavailable right now. Retry to load your upcoming and past assessments.",
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [quizzesData, setQuizzesData] = useState<QuizzesPageData>(EMPTY_QUIZZES_DATA);
  const [activeAttempt, setActiveAttempt] = useState<ActiveQuizAttempt | null>(null);
  const [attemptResult, setAttemptResult] = useState<QuizAttemptResult | null>(null);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const hasAutoStartedFromContext = useRef(false);
  const isAutoSubmittingRef = useRef(false);
  const isSubmittingAttemptRef = useRef(false);

  const showActionFeedback = (message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2200);
  };

  const loadQuizzes = () => {
    void runLoadQuizzes(async () => {
      const data = await getQuizzesPageData();
      setQuizzesData(data);
      return data;
    });
  };

  useEffect(() => {
    loadQuizzes();
  }, [runLoadQuizzes]);

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeAttempt?.expiresAt) {
      setTimeLeft(null);
      return;
    }

    const getSecondsUntilExpiry = () => {
      const expiresAtMs = Date.parse(activeAttempt.expiresAt ?? "");
      if (!Number.isFinite(expiresAtMs)) return 0;
      return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
    };

    setTimeLeft(getSecondsUntilExpiry());

    const interval = window.setInterval(() => {
      const nextTimeLeft = getSecondsUntilExpiry();
      setTimeLeft(() => {
        if (nextTimeLeft <= 0) {
          // Time's up — auto-submit once
          if (!isAutoSubmittingRef.current) {
            isAutoSubmittingRef.current = true;
            void finishAttempt({ automatic: true });
          }
          return 0;
        }
        return nextTimeLeft;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAttempt?.template.id, activeAttempt?.expiresAt]);

  // Reset auto-submit guard when a new attempt begins
  useEffect(() => {
    if (activeAttempt) {
      isAutoSubmittingRef.current = false;
    }
  }, [activeAttempt?.template.id]);

  const lessonIdParam = searchParams.get("lessonId") ?? undefined;
  const courseIdParamRaw = searchParams.get("courseId");
  const quizIdParam = searchParams.get("quizId") ?? undefined;
  const courseIdParam = courseIdParamRaw ?? undefined;
  const learnerName = getAuthUserGreetingName(user);

  // Context label shown during the quiz.
  // Standalone quizzes (quizId only, no lessonId) use a generic practice label;
  // lesson-bound quizzes show the course name when available.
  const quizContextLabel =
    quizIdParam && !lessonIdParam
      ? "Practice Quiz"
      : locationState.courseName
        ? `Lesson check-in from ${locationState.courseName}`
        : "Lesson check-in";

  const startQuiz = async (
    input: {
      quizId?: string;
      lessonId?: string;
      courseId?: string;
      subject?: string;
      topic?: string;
      difficulty?: QuizDifficulty;
    },
    contextLabel: string,
  ) => {
    let template: QuizTemplate;
    let attempt;
    try {
      template = await getQuizTemplate(input);
      attempt = await startQuizAttempt(template.id);
    } catch {
      pushNotification(
        createProductNotification({
          title: "Quiz unavailable",
          detail: "This quiz could not be loaded. Please try again.",
          category: "quiz",
          source: "quiz-reminder",
        }),
      );
      return;
    }

    setAttemptResult(null);
    setActiveAttempt({
      template,
      attemptId: attempt.attemptId,
      expiresAt: attempt.expiresAt,
      answersByQuestionId: {},
      currentQuestionIndex: 0,
      startedAt: Date.parse(attempt.startedAt) || Date.now(),
      contextLabel,
    });

    addRecentActivity("quiz-reminder", `Started quiz: ${template.topic}`);
    pushNotification(
      createProductNotification({
        title: "Quiz started",
        detail:
          learnerName !== "there"
            ? `${learnerName}, ${template.topic} is live (${template.subject}).`
            : `You started ${template.topic} (${template.subject}).`,
        category: "quiz",
        source: "quiz-reminder",
        actionLabel: "Continue",
      }),
    );

    showActionFeedback(
      learnerName !== "there"
        ? `${learnerName}, ${template.topic} is ready. Good luck!`
        : `Starting ${template.topic}. Good luck!`,
    );
  };

  useEffect(() => {
    if (hasAutoStartedFromContext.current) {
      return;
    }

    if (!lessonIdParam && !quizIdParam) {
      return;
    }

    hasAutoStartedFromContext.current = true;

    void startQuiz(
      {
        quizId: quizIdParam,
        lessonId: lessonIdParam,
        courseId: courseIdParam,
      },
      quizContextLabel,
    );
  }, [courseIdParam, lessonIdParam, quizContextLabel, quizIdParam]);

  const finishAttempt = async (options?: { automatic?: boolean }) => {
    if (!activeAttempt || isSubmittingAttemptRef.current) {
      return;
    }

    isSubmittingAttemptRef.current = true;
    setIsSubmittingAttempt(true);
    try {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - activeAttempt.startedAt) / 1000));
      // Build a complete answers map covering every question in the template.
      // Unanswered questions get undefined so the API adapter can forward them
      // as empty strings; the backend counts them as incorrect rather than
      // rejecting the submission.
      const fullAnswerMap: Record<string, QuizAnswerSubmission | undefined> = Object.fromEntries(
        activeAttempt.template.questions.map((q) => {
          const answer = activeAttempt.answersByQuestionId[q.id];
          if (answer) {
            return [q.id, answer];
          }

          return [
            q.id,
            q.questionType === "SHORT_ANSWER"
              ? { questionType: "SHORT_ANSWER", textAnswer: "" }
              : { questionType: "MCQ", selectedOptionId: "" },
          ];
        }),
      );
      const result = await submitQuizAttempt({
        quizId: activeAttempt.template.id,
        attemptId: activeAttempt.attemptId,
        answersByQuestionId: fullAnswerMap,
        elapsedSeconds,
      });

      setAttemptResult(result);
      setActiveAttempt(null);
      applyQuizCompletion(result.percentage);
      applyQuizSubjectScore(activeAttempt.template.subject, result.percentage);
      addRecentActivity(
        "quiz-completed",
        `Completed quiz: ${activeAttempt.template.topic} — ${result.percentage}% (${result.score}/${result.maxScore})`,
      );

      // Prepend to pastQuizzes so the Past tab immediately reflects the completed attempt
      const completedEntry: PastQuiz = {
        subject: activeAttempt.template.subject,
        topic: activeAttempt.template.topic,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        score: result.percentage,
        maxScore: 100,
        timeTaken: `${result.score}/${result.maxScore} correct`,
      };
      setQuizzesData((prev) => ({ ...prev, pastQuizzes: [completedEntry, ...prev.pastQuizzes] }));

      const resultTone = result.percentage >= 85
        ? "Strong work"
        : result.percentage >= 70
          ? "Solid progress"
          : "Good effort";

      pushNotification(
        createProductNotification({
          title: "Quiz submitted",
          detail:
            learnerName !== "there"
              ? `${resultTone}, ${learnerName}. ${activeAttempt.template.topic}: ${result.score}/${result.maxScore}.`
              : `You scored ${result.score}/${result.maxScore} on ${activeAttempt.template.topic}.`,
          category: "quiz",
          source: "quiz-reminder",
          actionLabel: "Review",
        }),
      );

      showActionFeedback(
        `${resultTone} on ${activeAttempt.template.topic}: ${result.percentage}%.`,
      );
    } catch {
      if (options?.automatic) {
        setActiveAttempt(null);
        setTimeLeft(null);
      } else {
        isAutoSubmittingRef.current = false;
      }
      pushNotification(
        createProductNotification({
          title: "Quiz submission failed",
          detail: "Your quiz could not be submitted. Please try again.",
          category: "quiz",
          source: "quiz-reminder",
        }),
      );
    } finally {
      isSubmittingAttemptRef.current = false;
      setIsSubmittingAttempt(false);
    }
  };

  const { upcomingQuizzes, pastQuizzes, practiceQuizzes } = quizzesData;

  // Pro access determined from the auth session tier (updated on subscription change)
  const isProUser = user?.subscriptionTier === "pro";

  // ── Filter state for Practice tab ────────────────────────────────────────────
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<QuizDifficulty | null>(null);

  // ── Derived stat values from real fetched data ──────────────────────────────
  const avgScore = useMemo(() => {
    if (pastQuizzes.length === 0) return null;
    const total = pastQuizzes.reduce((sum, q) => sum + q.score, 0);
    return Math.round(total / pastQuizzes.length);
  }, [pastQuizzes]);
  // Group practice quizzes by subject for category display
  const groupedPracticeQuizzes = useMemo(() => {
    const groups = new Map<string, PracticeQuiz[]>();
    for (const quiz of practiceQuizzes) {
      const subject = quiz.subject || "General";
      const list = groups.get(subject) ?? [];
      list.push(quiz);
      groups.set(subject, list);
    }
    // Sort subjects alphabetically, with "General" last
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "General") return 1;
      if (b === "General") return -1;
      return a.localeCompare(b);
    });
  }, [practiceQuizzes]);

  // Unique subjects (for filter pills)
  const uniqueSubjects = useMemo(
    () => groupedPracticeQuizzes.map(([s]) => s),
    [groupedPracticeQuizzes],
  );

  // Filtered groups based on active subject/difficulty filters
  const filteredGroups = useMemo(() => {
    let result = groupedPracticeQuizzes;
    if (subjectFilter) {
      result = result.filter(([s]) => s === subjectFilter);
    }
    if (difficultyFilter) {
      result = result
        .map(([s, qs]) => [s, qs.filter((q) => q.difficulty === difficultyFilter)] as [string, PracticeQuiz[]])
        .filter(([, qs]) => qs.length > 0);
    }
    return result;
  }, [groupedPracticeQuizzes, subjectFilter, difficultyFilter]);
  const currentQuestion = useMemo(() => {
    if (!activeAttempt) {
      return null;
    }

    return activeAttempt.template.questions[activeAttempt.currentQuestionIndex] ?? null;
  }, [activeAttempt]);

  if (activeAttempt && currentQuestion) {
    const answeredQuestions = activeAttempt.template.questions.filter((question) => {
      const answer = activeAttempt.answersByQuestionId[question.id];
      if (!answer) return false;
      return answer.questionType === "SHORT_ANSWER"
        ? answer.textAnswer.trim().length > 0
        : answer.selectedOptionId.trim().length > 0;
    }).length;
    const progress = Math.round(((activeAttempt.currentQuestionIndex + 1) / activeAttempt.template.questions.length) * 100);
    const currentAnswer = activeAttempt.answersByQuestionId[currentQuestion.id];
    const selectedOptionId = currentAnswer?.questionType === "MCQ" ? currentAnswer.selectedOptionId : undefined;
    const textAnswer = currentAnswer?.questionType === "SHORT_ANSWER" ? currentAnswer.textAnswer : "";

    return (
      <div className="max-w-5xl mx-auto px-4 pb-20 space-y-6">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900 mb-2">{activeAttempt.template.topic}</h1>
          <p className="text-lg text-gray-700">{activeAttempt.contextLabel}</p>
        </div>

        <GlassCard>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-sm text-gray-600">{activeAttempt.template.subject}</p>
              <p className="text-lg font-semibold text-gray-900">
                Question {activeAttempt.currentQuestionIndex + 1} of {activeAttempt.template.questions.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {timeLeft !== null ? (
                <span
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    timeLeft <= 60
                      ? "bg-red-100 text-red-700"
                      : timeLeft <= 180
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Time left {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                  <Clock className="w-3 h-3" />
                  Untimed quiz
                </span>
              )}
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyBadgeClass(activeAttempt.template.difficulty)}`}
              >
                {activeAttempt.template.difficulty}
              </span>
            </div>
          </div>

          <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-4">
            <div
              className="h-full bg-[#4a9ff5] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mb-6">
            <p className="text-xl font-semibold text-gray-900 leading-relaxed">{currentQuestion.prompt}</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.questionType === "SHORT_ANSWER" ? (
              <textarea
                rows={4}
                value={textAnswer}
                onChange={(e) => {
                  const answer = e.target.value;
                  setActiveAttempt((previous) => {
                    if (!previous) return previous;
                    return {
                      ...previous,
                      answersByQuestionId: {
                        ...previous.answersByQuestionId,
                        [currentQuestion.id]: {
                          questionType: "SHORT_ANSWER",
                          textAnswer: answer,
                        },
                      },
                    };
                  });
                }}
                placeholder="Type your answer here…"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm resize-none focus:border-[#4a9ff5] focus:outline-none"
              />
            ) : (
              currentQuestion.options.map((option) => {
                const isSelected = selectedOptionId === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                      isSelected
                        ? "border-[#4a9ff5] bg-[#4a9ff5]/10 text-[#1c7ed6]"
                        : "border-gray-200 bg-white hover:border-[#4a9ff5]/50"
                    }`}
                    onClick={() => {
                      setActiveAttempt((previous) => {
                        if (!previous) {
                          return previous;
                        }

                        return {
                          ...previous,
                          answersByQuestionId: {
                            ...previous.answersByQuestionId,
                            [currentQuestion.id]: {
                              questionType: "MCQ",
                              selectedOptionId: option.id,
                            },
                          },
                        };
                      });
                    }}
                  >
                    {option.text}
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Answered {answeredQuestions}/{activeAttempt.template.questions.length}
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-white/[0.45]"
                disabled={activeAttempt.currentQuestionIndex === 0}
                onClick={() => {
                  setActiveAttempt((previous) => {
                    if (!previous) {
                      return previous;
                    }

                    return {
                      ...previous,
                      currentQuestionIndex: Math.max(0, previous.currentQuestionIndex - 1),
                    };
                  });
                }}
              >
                Previous
              </Button>

              {activeAttempt.currentQuestionIndex < activeAttempt.template.questions.length - 1 ? (
                <Button
                  className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
                  onClick={() => {
                    setActiveAttempt((previous) => {
                      if (!previous) {
                        return previous;
                      }

                      return {
                        ...previous,
                        currentQuestionIndex: Math.min(
                          previous.template.questions.length - 1,
                          previous.currentQuestionIndex + 1,
                        ),
                      };
                    });
                  }}
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  className="bg-[#0d6efd] hover:bg-[#1c7ed6] text-white"
                  disabled={isSubmittingAttempt}
                  onClick={() => {
                    void finishAttempt();
                  }}
                >
                  {isSubmittingAttempt ? "Submitting..." : "Finish Quiz"}
                </Button>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (attemptResult) {
    const percentageTone =
      attemptResult.percentage >= 85
        ? "text-green-600"
        : attemptResult.percentage >= 70
          ? "text-yellow-600"
          : "text-red-600";

    const resultsSubtitle =
      attemptResult.percentage >= 85
        ? learnerName !== "there"
          ? `Excellent finish, ${learnerName}. Keep this pace into your next lesson.`
          : "Excellent finish. Keep this pace into your next lesson."
        : attemptResult.percentage >= 70
          ? "Solid result. A quick review now will lock in the weak spots."
          : "You are close. Review the missed concepts and retake while they are fresh.";

    return (
      <div className="max-w-5xl mx-auto px-4 pb-20 space-y-6">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900 mb-2">Quiz Results</h1>
          <p className="text-lg text-gray-700">{resultsSubtitle}</p>
        </div>

        <GlassCard>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600">Final Score</p>
              <p className={`text-5xl font-semibold ${percentageTone}`}>{attemptResult.percentage}%</p>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                Correct: <span className="font-semibold">{attemptResult.score}</span>/{attemptResult.maxScore}
              </p>
              <p>
                Time: <span className="font-semibold">{formatElapsedSeconds(attemptResult.elapsedSeconds)}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-white/[0.45]"
                onClick={() => {
                  void startQuiz({ quizId: attemptResult.quizId }, "Retry attempt");
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </Button>
              <Button
                className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
                onClick={() => {
                  setAttemptResult(null);
                }}
              >
                Back To Quizzes
              </Button>
            </div>
          </div>
        </GlassCard>

        <div className="space-y-3">
          {attemptResult.questionResults.map((questionResult, index) => (
            <GlassCard key={questionResult.questionId}>
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  {questionResult.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-sm text-gray-600">Question {index + 1}</p>
                  {questionResult.questionType === "SHORT_ANSWER" ? (
                    <>
                      <p className="text-sm text-gray-800">
                        {questionResult.isCorrect ? "Partially or fully correct" : "Not enough keywords matched"}{" "}
                        &bull; <span className="font-medium">{questionResult.marksAwarded ?? 0}/{questionResult.maxMarks ?? 0} marks</span>
                      </p>
                      {questionResult.textAnswer ? (
                        <p className="text-sm text-gray-700">
                          Your answer: &ldquo;{questionResult.textAnswer}&rdquo;
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">No answer provided.</p>
                      )}
                      {(questionResult.matchedKeywords?.length ?? 0) > 0 && (
                        <p className="text-sm text-green-700">
                          Keywords matched: {questionResult.matchedKeywords?.join(", ")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-800">
                      {questionResult.isCorrect ? "Correct" : "Needs review"}
                      {questionResult.selectedOptionId
                        ? ` • Selected: ${questionResult.selectedOptionId.toUpperCase()} • Correct: ${(questionResult.correctOptionId ?? "").toUpperCase()}`
                        : ` • No answer • Correct: ${(questionResult.correctOptionId ?? "").toUpperCase()}`}
                    </p>
                  )}
                  <p className="text-sm text-gray-700">{questionResult.explanation}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-2 text-gray-900">Quizzes & Assessments</h1>
        <p className="text-lg text-gray-700">
          {lessonIdParam
            ? `${quizContextLabel}. Keep momentum while the lesson is still fresh.`
            : "Test your knowledge and track your progress."}
        </p>
      </div>

      {successMessage ? <ActionSuccessState message={successMessage} className="mb-6" /> : null}

      {isError ? (
        <div className="mb-8">
          <DataErrorState
            description={errorMessage ?? "Quiz data is unavailable right now. Retry to load your upcoming and past assessments."}
            onRetry={() => {
              loadQuizzes();
            }}
            retryLabel="Reload Quizzes"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <GlassCard>
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#4a9ff5]" />
            <div>
              <p className="text-sm text-gray-600">Avg. Score</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? "—" : avgScore !== null ? `${avgScore}%` : "—"}
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Improvement</p>
              <p className="text-2xl font-semibold text-gray-900">—</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-[#4a9ff5]" />
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? "—" : String(pastQuizzes.length)}
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-[#4a9ff5]" />
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? "—" : String(upcomingQuizzes.length)}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      <Tabs defaultValue={locationState.defaultTab ?? "upcoming"}>
        <TabsList className="bg-white/[0.45] backdrop-blur-md mb-6">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past Quizzes</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={`upcoming-loading-${index}`} className="rounded-2xl border border-white/70 bg-white/[0.45] p-6">
                  <div className="mb-3 h-5 w-1/3 rounded bg-white/80" />
                  <div className="mb-3 h-6 w-3/4 rounded bg-white/70" />
                  <div className="mb-2 h-4 w-5/6 rounded bg-white/70" />
                  <div className="h-10 w-full rounded bg-white/75" />
                </div>
              ))}
            </div>
          ) : isError ? null : upcomingQuizzes.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming quizzes"
              description="You are fully caught up. New quiz schedules will appear here automatically."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingQuizzes.map((quiz) => (
                <GlassCard key={`${quiz.subject}-${quiz.topic}-${quiz.date}`} hover>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#4a9ff5]/10 text-[#4a9ff5]">
                        {quiz.subject}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyBadgeClass(quiz.difficulty)}`}>
                        {quiz.difficulty}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{quiz.topic}</h3>

                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {quiz.date} at {quiz.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {quiz.duration} • {quiz.questions} questions
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
                    onClick={() => {
                      void startQuiz(
                        {
                          subject: quiz.subject,
                          topic: quiz.topic,
                          difficulty: quiz.difficulty,
                        },
                        `Scheduled assessment: ${quiz.date} at ${quiz.time}`,
                      );
                    }}
                  >
                    Start Quiz
                  </Button>
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={`past-loading-${index}`} className="rounded-2xl border border-white/70 bg-white/[0.45] p-6">
                  <div className="mb-2 h-5 w-2/3 rounded bg-white/80" />
                  <div className="h-4 w-1/2 rounded bg-white/70" />
                </div>
              ))}
            </div>
          ) : isError ? null : pastQuizzes.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No completed quizzes yet"
              description="Finish your first quiz to start tracking detailed performance history."
            />
          ) : (
            <div className="space-y-4">
              {pastQuizzes.map((quiz) => (
                <GlassCard key={`${quiz.subject}-${quiz.topic}-${quiz.date}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#4a9ff5]/10 text-[#4a9ff5]">
                          {quiz.subject}
                        </span>
                        <span className="text-sm text-gray-600">{quiz.date}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.topic}</h3>
                      <p className="text-sm text-gray-600">Time taken: {quiz.timeTaken}</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-3xl font-semibold text-gray-900">{quiz.score}%</p>
                        <p className="text-sm text-gray-600">Score</p>
                      </div>

                      <Button
                        variant="outline"
                        className="bg-white/[0.45]"
                        onClick={() => {
                          addRecentActivity("quiz-reminder", `Reviewed quiz results: ${quiz.topic}`);
                          navigate("/ai-tutor", {
                            state: {
                              contextPrompt: `Review my quiz performance on ${quiz.topic} (${quiz.score}%). Give me a focused remediation plan.`,
                              contextCourseName: quiz.subject,
                              contextLessonTitle: quiz.topic,
                              contextLessonId: `quiz-${quiz.topic.toLowerCase().replace(/\s+/g, "-")}`,
                            },
                          });
                          showActionFeedback(`Opened review flow for ${quiz.topic}.`);
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="practice">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={`practice-loading-${index}`} className="rounded-2xl border border-white/70 bg-white/[0.45] p-6">
                  <div className="mb-3 h-5 w-1/3 rounded bg-white/80" />
                  <div className="mb-3 h-6 w-3/4 rounded bg-white/70" />
                  <div className="h-10 w-full rounded bg-white/75" />
                </div>
              ))}
            </div>
          ) : isError ? null : practiceQuizzes.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No practice sets available"
              description="New targeted practice quizzes will unlock as you progress through courses."
            />
          ) : (
            <>
              {/* ── Filter bar ── */}
              {uniqueSubjects.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {/* Subject pills */}
                  <button
                    type="button"
                    onClick={() => setSubjectFilter(null)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      !subjectFilter
                        ? "bg-[#4a9ff5] text-white"
                        : "border border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80"
                    }`}
                  >
                    All subjects
                  </button>
                  {uniqueSubjects.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubjectFilter(s === subjectFilter ? null : s)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        s === subjectFilter
                          ? "bg-[#4a9ff5] text-white"
                          : "border border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80"
                      }`}
                    >
                      {s}
                    </button>
                  ))}

                  <span className="mx-1 self-stretch w-px bg-gray-200" />

                  {/* Difficulty pills */}
                  {(["Easy", "Medium", "Hard"] as QuizDifficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficultyFilter(d === difficultyFilter ? null : d)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        d === difficultyFilter
                          ? getDifficultyBadgeClass(d) + " ring-1 ring-current"
                          : "border border-gray-200 bg-white/60 text-gray-700 hover:bg-white/80"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Quiz grid ── */}
              {filteredGroups.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-gray-600">No quizzes match your selected filters.</p>
                  <button
                    type="button"
                    onClick={() => { setSubjectFilter(null); setDifficultyFilter(null); }}
                    className="text-sm text-[#4a9ff5] hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="space-y-10">
                  {filteredGroups.map(([subject, quizzes]) => (
                    <section key={subject}>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#4a9ff5]" />
                        {subject}
                        <span className="text-sm font-normal text-gray-500">{quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"}</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.map((quiz) => (
                          <GlassCard key={`${quiz.subject}-${quiz.topic}-${quiz.quizId ?? quiz.lessonId}`} hover>
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#4a9ff5]/10 text-[#4a9ff5]">
                                  {quiz.subject}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {quiz.isPremium && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                      <Lock className="w-3 h-3" />
                                      Pro
                                    </span>
                                  )}
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyBadgeClass(quiz.difficulty)}`}>
                                    {quiz.difficulty}
                                  </span>
                                </div>
                              </div>

                              <h3 className="text-xl font-semibold text-gray-900 mb-4">{quiz.topic}</h3>

                              <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
                                <span>{quiz.questions} questions</span>
                                {quiz.timeLimitSeconds && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {Math.ceil(quiz.timeLimitSeconds / 60)} min
                                  </span>
                                )}
                                {quiz.lessonId && !quiz.isPremium && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                    Course Quiz
                                  </span>
                                )}
                              </div>
                            </div>

                            {quiz.isPremium && !isProUser ? (
                              <Button
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={() => navigate("/pricing")}
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                Upgrade to Pro
                              </Button>
                            ) : quiz.isStandalone && quiz.quizId ? (
                              <Button
                                className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
                                onClick={() => navigate(`/quizzes/${quiz.quizId}`)}
                              >
                                View Quiz
                              </Button>
                            ) : (
                              <Button
                                className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
                                onClick={() => {
                                  void startQuiz(
                                    {
                                      quizId: quiz.quizId,
                                      lessonId: quiz.lessonId,
                                      subject: quiz.subject,
                                      topic: quiz.topic,
                                      difficulty: quiz.difficulty,
                                    },
                                    quiz.lessonId ? `Lesson quiz: ${quiz.topic}` : `${quiz.subject} Practice`,
                                  );
                                }}
                              >
                                Start Practice
                              </Button>
                            )}
                          </GlassCard>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
