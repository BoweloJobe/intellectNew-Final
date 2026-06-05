import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DataErrorState } from "../components/DataState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { Button } from "../components/ui/button";
import { ArrowLeft, Clock, HelpCircle, Lock, Target } from "lucide-react";
import type { QuizTemplate } from "../models/quizzes";
import { getQuizTemplate } from "../services/quizzes.service";
import { useAuth } from "../auth/AuthContext";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function QuizDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 pb-20 space-y-6 animate-pulse">
      <div className="h-8 w-2/3 rounded-lg bg-white/70" />
      <div className="h-5 w-1/3 rounded-lg bg-white/60" />
      <GlassCard>
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-white/70" />
          <div className="h-4 w-5/6 rounded bg-white/70" />
          <div className="h-4 w-3/4 rounded bg-white/60" />
        </div>
      </GlassCard>
      <div className="h-10 w-32 rounded-lg bg-white/70" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function QuizDetailPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { errorMessage, isLoading, isError, run: runLoad } = useAsyncViewState({
    defaultErrorMessage: "This quiz could not be loaded. It may have been removed or you may not have access.",
  });
  const [quiz, setQuiz] = useState<QuizTemplate | null>(null);

  const isProUser = user?.subscriptionTier === "pro";

  const loadQuiz = () => {
    if (!quizId) return;
    void runLoad(async () => {
      const template = await getQuizTemplate({ quizId });
      setQuiz(template);
      return template;
    });
  };

  useEffect(() => {
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  if (isLoading) {
    return <QuizDetailSkeleton />;
  }

  if (isError || !quiz) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-20 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/quizzes")}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Quizzes
        </Button>
        <DataErrorState
          description={errorMessage ?? "This quiz could not be loaded."}
          onRetry={loadQuiz}
          retryLabel="Retry"
        />
      </div>
    );
  }

  const isPremiumLocked = quiz.isPremium && !isProUser;
  const durationLabel = quiz.timeLimitSeconds
    ? `${Math.ceil(quiz.timeLimitSeconds / 60)} min`
    : `~${quiz.estimatedDurationMinutes} min`;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20 space-y-6">
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/quizzes", { state: { defaultTab: "practice" } })}
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Quizzes
      </Button>

      {/* Title block */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#4a9ff5]/10 text-[#4a9ff5]">
            {quiz.subject}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              quiz.difficulty === "Easy"
                ? "bg-green-100 text-green-700"
                : quiz.difficulty === "Medium"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {quiz.difficulty}
          </span>
          {quiz.isPremium && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              <Lock className="w-3 h-3" />
              Pro
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-1">{quiz.topic}</h1>
        {quiz.description && (
          <p className="text-gray-600 text-sm leading-relaxed mt-2">{quiz.description}</p>
        )}
      </div>

      {/* Metadata card */}
      <GlassCard>
        <div className="flex flex-wrap gap-6 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#4a9ff5]" />
            <span>
              <strong>{quiz.questions.length}</strong> question{quiz.questions.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4a9ff5]" />
            <span>
              {quiz.timeLimitSeconds ? (
                <>Time limit: <strong>{durationLabel}</strong></>
              ) : (
                <>Est. duration: <strong>{durationLabel}</strong> · Untimed</>
              )}
            </span>
          </div>
          {quiz.passingScore !== undefined && (
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#4a9ff5]" />
              <span>
                Passing score: <strong>{quiz.passingScore}%</strong>
              </span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Access notice for premium locked */}
      {isPremiumLocked ? (
        <GlassCard>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <p className="font-semibold text-gray-900 mb-1">Pro subscription required</p>
              <p className="text-sm text-gray-600">
                Upgrade to access this quiz and all premium learning content.
              </p>
            </div>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
              onClick={() => navigate("/pricing")}
            >
              <Lock className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </div>
        </GlassCard>
      ) : (
        <div className="flex gap-3">
          <Button
            className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
            onClick={() => navigate(`/quizzes?quizId=${quizId}`)}
          >
            Start Quiz
          </Button>
          <Button
            variant="outline"
            className="bg-white/[0.45]"
            onClick={() => navigate("/quizzes")}
          >
            Browse All Quizzes
          </Button>
        </div>
      )}
    </div>
  );
}
