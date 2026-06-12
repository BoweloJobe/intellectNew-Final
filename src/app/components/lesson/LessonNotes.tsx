import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { GlassCard } from "../GlassCard";
import { FileText } from "lucide-react";
import type { VideoLessonNote } from "../../models/lessons";
import { generateNoteExplanation } from "../../services/tutor.service";
import { getAsyncErrorMessage } from "../../utils/async-errors";

type AiState = "idle" | "loading" | "success" | "error";

interface LessonNotesProps {
  notes: VideoLessonNote[];
  lessonId: string;
  lessonTitle: string;
  courseName: string;
  tags: string[];
  className?: string;
}

function formatTimestamp(seconds?: number): string | null {
  if (seconds == null || Number.isNaN(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function LessonNotes({
  notes,
  lessonId,
  lessonTitle,
  courseName,
  tags,
  className = "",
}: LessonNotesProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const counterRef = useRef(0);

  // Reset AI state when lesson changes
  useEffect(() => {
    setSelectedNoteId(null);
    setExplanation(null);
    setAiState("idle");
    setAiError(null);
  }, [lessonId]);

  const handleExplain = (note: VideoLessonNote) => {
    if (selectedNoteId === note.id && aiState === "success") {
      setSelectedNoteId(null);
      setAiState("idle");
      setExplanation(null);
      setAiError(null);
      return;
    }

    if (selectedNoteId === note.id && aiState === "loading") return;

    const requestId = ++counterRef.current;
    setSelectedNoteId(note.id);
    setExplanation(null);
    setAiError(null);
    setAiState("loading");

    void generateNoteExplanation({
      noteTitle: note.title,
      noteContent: note.content,
      lessonTitle,
      courseName,
      tags,
    }).then((result) => {
      if (counterRef.current !== requestId) return;
      setExplanation(result);
      setAiState("success");
    }).catch((err: unknown) => {
      if (counterRef.current !== requestId) return;
      setAiError(getAsyncErrorMessage(err, "Unable to load explanation. Please try again."));
      setAiState("error");
    });
  };

  const handleDismiss = () => {
    setSelectedNoteId(null);
    setAiState("idle");
    setExplanation(null);
    setAiError(null);
  };

  return (
    <GlassCard className={`flex h-full flex-col p-5 lg:p-6 ${className}`.trim()}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
        <Sparkles className="h-5 w-5 shrink-0 text-[#4a9ff5] opacity-50" aria-hidden="true" />
      </div>

      {notes.length > 0 ? (
        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {notes.map((note) => {
            const isSelected = selectedNoteId === note.id;
            const timestamp = formatTimestamp(note.timestamp);

            return (
              <section
                key={note.id}
                className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{note.title}</h3>
                    {timestamp ? (
                      <span className="text-xs font-semibold text-[#1c7ed6] bg-[#4a9ff5]/10 px-2 py-0.5 rounded-md">
                        {timestamp}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => { handleExplain(note); }}
                    className="inline-flex items-center gap-1 rounded-md border border-[#4a9ff5]/30 bg-white px-2 py-1 text-xs font-medium text-[#1c7ed6] hover:bg-[#4a9ff5]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isSelected && aiState === "success" ? "Hide AI" : "Explain with AI"}
                  </button>
                </div>

                <div className="max-w-none whitespace-pre-line text-[0.95rem] leading-relaxed text-gray-700">
                  {note.content}
                </div>

                {isSelected && (
                  <div className="mt-3 rounded-xl border border-[#4a9ff5]/40 bg-gradient-to-b from-[#eef6ff] to-white/90 px-4 pb-4 pt-3">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[#1c7ed6] uppercase tracking-wide">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Explanation
                      </span>
                      <button
                        type="button"
                        onClick={handleDismiss}
                        className="text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40 rounded"
                        aria-label="Dismiss explanation"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {aiState === "loading" && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-[#4a9ff5] border-t-transparent animate-spin shrink-0" />
                        Generating explanation…
                      </div>
                    )}

                    {aiState === "error" && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-red-600">{aiError}</span>
                        <button
                          type="button"
                          onClick={() => { handleExplain(note); }}
                          className="text-xs text-[#1c7ed6] hover:underline focus-visible:outline-none shrink-0"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {aiState === "success" && explanation ? (
                      <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>
                    ) : null}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No notes available yet"
          description="Key notes and timestamp takeaways will appear here after lesson updates."
        />
      )}
    </GlassCard>
  );
}
