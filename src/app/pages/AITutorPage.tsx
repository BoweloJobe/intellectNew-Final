import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import type { TutorContextTag, TutorSessionStatus } from "../models/tutor";
import {
  createProductNotification,
  useNotificationsState,
} from "../state/notifications/NotificationsStateContext";
import { useTutorState } from "../state/tutor/TutorStateContext";
import { getAsyncErrorMessage } from "../utils/async-errors";
import { normalizeRequiredTextInput } from "../utils/form-validation";
import { Archive, BookOpen, FileText, HelpCircle, Pin, Send, Sparkles, Tag, Trash2 } from "lucide-react";

const MIN_TUTOR_PROMPT_LENGTH = 6;
const MIN_TAKEAWAY_LENGTH = 8;

const promptIconMap = {
  book: BookOpen,
  plan: FileText,
  help: HelpCircle,
  sparkles: Sparkles,
} as const;

function sessionStatusBadgeClass(status: TutorSessionStatus): string {
  if (status === "pinned") {
    return "bg-[#4a9ff5]/10 text-[#4a9ff5]";
  }

  if (status === "archived") {
    return "bg-gray-200 text-gray-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

export function AITutorPage() {
  const location = useLocation();
  const { addRecentActivity, pushNotification } = useNotificationsState();
  const {
    state: {
      tutorSessions,
      tutorSuggestedPrompts,
      tutorViewState,
      tutorError,
      activeTutorSessionId,
    },
    reloadTutorData,
    setActiveTutorSession,
    sendTutorMessage,
    addTutorTakeaway,
    setTutorSessionStatus,
  } = useTutorState();

  const [input, setInput] = useState("");
  const [takeawayInput, setTakeawayInput] = useState("");
  const [sessionFilter, setSessionFilter] = useState<"all" | TutorSessionStatus>("all");
  const [selectedTags, setSelectedTags] = useState<TutorContextTag[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSavingTakeaway, setIsSavingTakeaway] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [takeawayError, setTakeawayError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sortedSessions = useMemo(() => {
    const filtered = tutorSessions.filter((session) => {
      if (sessionFilter === "all") {
        return true;
      }

      return session.status === sessionFilter;
    });

    return [...filtered].sort((left, right) => {
      if (left.status === "pinned" && right.status !== "pinned") {
        return -1;
      }

      if (left.status !== "pinned" && right.status === "pinned") {
        return 1;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [sessionFilter, tutorSessions]);

  const activeSession = useMemo(() => {
    if (!activeTutorSessionId) {
      return sortedSessions[0] ?? null;
    }

    return tutorSessions.find((session) => session.id === activeTutorSessionId) ?? sortedSessions[0] ?? null;
  }, [activeTutorSessionId, sortedSessions, tutorSessions]);

  const recentTopics = useMemo(() => {
    return Array.from(
      new Set(
        tutorSessions
          .flatMap((session) => session.tags)
          .filter((tag) => tag.type === "topic")
          .map((tag) => tag.label),
      ),
    ).slice(0, 8);
  }, [tutorSessions]);

  const recentCourses = useMemo(() => {
    return Array.from(
      new Set(
        tutorSessions
          .flatMap((session) => session.tags)
          .filter((tag) => tag.type === "course")
          .map((tag) => tag.label),
      ),
    ).slice(0, 6);
  }, [tutorSessions]);

  const effectiveSession = activeSession;
  const isLoading = tutorViewState === "loading";
  const isError = tutorViewState === "error";

  useEffect(() => {
    if (effectiveSession?.id && activeTutorSessionId !== effectiveSession.id) {
      setActiveTutorSession(effectiveSession.id);
    }
  }, [activeTutorSessionId, effectiveSession?.id, setActiveTutorSession]);

  useEffect(() => {
    const routeState = location.state as
      | {
          contextLessonId?: string;
          contextLessonTitle?: string;
          contextCourseName?: string;
          contextPrompt?: string;
        }
      | undefined;

    if (!routeState) {
      return;
    }

    const contextTags: TutorContextTag[] = [];

    if (routeState.contextCourseName) {
      contextTags.push({
        id: `course-${routeState.contextCourseName}`,
        type: "course",
        label: routeState.contextCourseName,
      });
    }

    if (routeState.contextLessonTitle) {
      contextTags.push({
        id: `topic-${routeState.contextLessonTitle}`,
        type: "topic",
        label: routeState.contextLessonTitle,
      });
    }

    if (contextTags.length > 0) {
      setSelectedTags(contextTags);
    }

    if (routeState.contextPrompt) {
      setInput(routeState.contextPrompt);
    }
  }, [location.state]);

  const ensureTag = (tag: TutorContextTag) => {
    setSelectedTags((previous) => {
      if (previous.some((item) => item.label === tag.label && item.type === tag.type)) {
        return previous;
      }

      return [...previous, tag];
    });
  };

  const removeTag = (tag: TutorContextTag) => {
    setSelectedTags((previous) => previous.filter((item) => !(item.label === tag.label && item.type === tag.type)));
  };

  const handleSend = async () => {
    const trimmedPrompt = normalizeRequiredTextInput(input);

    if (!trimmedPrompt || isSending) {
      return;
    }

    if (trimmedPrompt.length < MIN_TUTOR_PROMPT_LENGTH) {
      setSubmitError("Please add a bit more detail so the tutor can provide a useful answer.");
      return;
    }

    const sessionTags = selectedTags.length > 0
      ? selectedTags
      : effectiveSession?.tags ?? [];
    const hadExistingSession = Boolean(effectiveSession?.id);

    const targetSessionId = effectiveSession?.id ?? "new-session";
    const nextTitle = effectiveSession?.title ?? trimmedPrompt.slice(0, 42);

    setIsSending(true);
    setSubmitError(null);

    try {
      await sendTutorMessage({
        sessionId: targetSessionId,
        prompt: trimmedPrompt,
        tags: sessionTags,
        sessionTitle: nextTitle,
      });
      if (!hadExistingSession) {
        addRecentActivity("ai-tutor", `Started tutor session: ${nextTitle}`);
        pushNotification(
          createProductNotification({
            title: "Tutor session started",
            detail: `Session "${nextTitle}" is now active.`,
            category: "ai",
            source: "ai-tutor-recommendation",
            actionLabel: "Open session",
          }),
        );
      }
      if (effectiveSession?.id) {
        setActiveTutorSession(effectiveSession.id);
      }
      setInput("");
      setSuccessMessage("Tutor response added to session.");
      window.setTimeout(() => {
        setSuccessMessage(null);
      }, 1700);
    } catch {
      pushNotification(
        createProductNotification({
          title: "Tutor unavailable",
          detail: "Message could not be sent. Please try again.",
          category: "ai",
          source: "ai-tutor-recommendation",
        }),
      );
      setSubmitError("Message could not be sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveTakeaway = async () => {
    const text = normalizeRequiredTextInput(takeawayInput);

    if (!effectiveSession || !text || isSavingTakeaway) {
      return;
    }

    if (text.length < MIN_TAKEAWAY_LENGTH) {
      setTakeawayError("Takeaway is too short. Save a complete note you can revisit later.");
      return;
    }

    setTakeawayError(null);
    setIsSavingTakeaway(true);

    try {
      await addTutorTakeaway({ sessionId: effectiveSession.id, takeaway: text });
      addRecentActivity("ai-tutor", "Saved tutor takeaway");
      setTakeawayInput("");
      setSuccessMessage("Takeaway saved to this session.");
      window.setTimeout(() => {
        setSuccessMessage(null);
      }, 1700);
    } catch (error) {
      setTakeawayError(getAsyncErrorMessage(error, "Could not save takeaway."));
    } finally {
      setIsSavingTakeaway(false);
    }
  };

  const handleSessionStatus = async (status: TutorSessionStatus) => {
    if (!effectiveSession || effectiveSession.status === status) {
      return;
    }

    try {
      await setTutorSessionStatus({
        sessionId: effectiveSession.id,
        status,
      });
      setSuccessMessage(`Session marked as ${status}.`);
      window.setTimeout(() => {
        setSuccessMessage(null);
      }, 1700);
    } catch {
      setSubmitError("Could not update session status.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-2 text-gray-900">AI Tutor</h1>
        <p className="text-lg text-gray-700">Session-based tutoring with context, history, and reusable takeaways</p>
      </div>

      {successMessage ? <ActionSuccessState message={successMessage} className="mb-6" /> : null}

      {isError ? (
        <div className="mb-6">
          <DataErrorState
            title="Tutor data unavailable"
            description={tutorError ?? "We could not load tutor sessions right now. Retry to restore your session history."}
            onRetry={reloadTutorData}
            retryLabel="Reload Tutor"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <GlassCard>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tutor Sessions</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "pinned", label: "Pinned" },
                { id: "archived", label: "Archived" },
              ].map((filterOption) => (
                <button
                  key={filterOption.id}
                  type="button"
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40 ${sessionFilter === filterOption.id ? "bg-[#4a9ff5] text-white" : "bg-white/[0.5] text-gray-700 hover:bg-white/[0.65]"}`}
                  onClick={() => {
                    setSessionFilter(filterOption.id as "all" | TutorSessionStatus);
                  }}
                  aria-pressed={sessionFilter === filterOption.id}
                >
                  {filterOption.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={`session-loading-${index}`} className="h-20 rounded-xl border border-white/60 bg-white/[0.45]" />
                ))}
              </div>
            ) : sortedSessions.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No sessions yet"
                description="Send your first tutor question to create a session."
                className="px-3 py-6"
              />
            ) : (
              <div className="space-y-3">
                {sortedSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    className={`w-full text-left p-3 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40 ${effectiveSession?.id === session.id ? "border-[#4a9ff5] bg-[#4a9ff5]/10" : "border-white/70 bg-white/[0.45] hover:bg-white/[0.55]"}`}
                    onClick={() => {
                      setActiveTutorSession(session.id);
                      setSelectedTags(session.tags);
                    }}
                    aria-pressed={effectiveSession?.id === session.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{session.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sessionStatusBadgeClass(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{session.messages[session.messages.length - 1]?.content ?? "No messages yet"}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{session.messages.length} messages • {session.takeaways.length} notes</p>
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Recent Topics</h3>
            {recentTopics.length === 0 ? (
              <p className="text-sm text-gray-600">Topics will appear as your sessions grow.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recentTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    className="px-2.5 py-1 rounded-full bg-white/[0.5] border border-white/70 text-xs text-gray-700 hover:bg-[#4a9ff5] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40"
                    onClick={() => {
                      ensureTag({ id: `topic-${topic}`, type: "topic", label: topic });
                    }}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <GlassCard className="h-[560px] flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {effectiveSession ? effectiveSession.title : "New Tutor Session"}
                </h3>
                <p className="text-sm text-gray-600">
                  {effectiveSession
                    ? `${effectiveSession.messages.length} messages in this session`
                    : "Ask your first question to start a structured tutor session"}
                </p>
              </div>

              {effectiveSession ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="bg-white/[0.45]" onClick={() => { void handleSessionStatus("active"); }} disabled={effectiveSession.status === "active"}>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Active
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/[0.45]" onClick={() => { void handleSessionStatus("pinned"); }} disabled={effectiveSession.status === "pinned"}>
                    <Pin className="w-4 h-4 mr-1" />
                    Pin
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white/[0.45]" onClick={() => { void handleSessionStatus("archived"); }} disabled={effectiveSession.status === "archived"}>
                    <Archive className="w-4 h-4 mr-1" />
                    Archive
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {(selectedTags.length > 0 ? selectedTags : effectiveSession?.tags ?? []).map((tag) => (
                <span key={`${tag.type}-${tag.label}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4a9ff5]/10 text-xs font-semibold text-[#4a9ff5]">
                  <Tag className="w-3 h-3" />
                  {tag.type}: {tag.label}
                  <button
                    type="button"
                    className="text-[#4a9ff5]/80 hover:text-[#4a9ff5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40 rounded-sm"
                    onClick={() => {
                      removeTag(tag);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {isLoading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <div key={`message-loading-${index}`} className="h-16 rounded-2xl border border-white/70 bg-white/[0.45]" />
                ))
              ) : effectiveSession ? (
                effectiveSession.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl ${
                        message.role === "user"
                          ? "bg-[#4a9ff5] text-white"
                          : "bg-white/[0.45] text-gray-900 border border-white/70"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-[#4a9ff5]" />
                          <span className="text-xs font-semibold text-[#4a9ff5]">AI Tutor</span>
                        </div>
                      ) : null}
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No active tutor conversation"
                  description="Use a suggested prompt or ask a direct question to create a new tutor session."
                />
              )}

              {!isLoading && !effectiveSession ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {tutorSuggestedPrompts.map((prompt) => {
                    const Icon = promptIconMap[prompt.icon];

                    return (
                      <button
                        key={prompt.id}
                        type="button"
                        onClick={() => {
                          setInput(prompt.text);
                          setSelectedTags(prompt.tags);
                        }}
                        className="p-4 rounded-xl bg-white/[0.45] border border-white/50 hover:bg-white/[0.55] transition-all text-left flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40"
                      >
                        <div className="text-[#4a9ff5] mt-0.5">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{prompt.label}</p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{prompt.text}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {submitError ? <DataErrorState title="Message failed" description={submitError} className="mb-3" /> : null}

            <div className="space-y-2">
              <Textarea
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (submitError) {
                    setSubmitError(null);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Ask for explanation, examples, revision steps, or practice questions..."
                className="min-h-[74px] bg-white/[0.45] resize-none"
                disabled={isSending || isLoading || isError}
              />
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {recentCourses.slice(0, 2).map((course) => (
                    <button
                      key={course}
                      type="button"
                      className="px-2 py-1 rounded-full bg-white/[0.5] text-xs text-gray-700 border border-white/70 hover:bg-white/[0.65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40"
                      onClick={() => {
                        ensureTag({ id: `course-${course}`, type: "course", label: course });
                      }}
                    >
                      + {course}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    void handleSend();
                  }}
                  className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white px-6"
                  disabled={isSending || isLoading || isError || input.trim().length === 0}
                >
                  <Send className="w-5 h-5 mr-2" />
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Saved Takeaways</h3>
              {!effectiveSession ? (
                <p className="text-sm text-gray-600">Select or start a session to save notes.</p>
              ) : effectiveSession.takeaways.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No takeaways yet"
                  description="Save concise notes from tutor responses to build a reusable study memory."
                  className="px-3 py-6"
                />
              ) : (
                <div className="space-y-2 mb-4">
                  {effectiveSession.takeaways.map((takeaway) => (
                    <div key={takeaway} className="rounded-xl border border-white/60 bg-white/[0.45] px-3 py-2 text-sm text-gray-700">
                      {takeaway}
                    </div>
                  ))}
                </div>
              )}

              {effectiveSession ? (
                <div className="space-y-2">
                  <Input
                    value={takeawayInput}
                    onChange={(event) => {
                      setTakeawayInput(event.target.value);
                      if (takeawayError) {
                        setTakeawayError(null);
                      }
                    }}
                    placeholder="Add a key takeaway from this session"
                    className="bg-white/[0.45]"
                    disabled={isSavingTakeaway}
                  />
                  {takeawayError ? <p className="text-xs text-red-600">{takeawayError}</p> : null}
                  <Button
                    variant="outline"
                    className="bg-white/[0.45]"
                    disabled={isSavingTakeaway || takeawayInput.trim().length === 0}
                    onClick={() => {
                      void handleSaveTakeaway();
                    }}
                  >
                    {isSavingTakeaway ? "Saving..." : "Save Takeaway"}
                  </Button>
                </div>
              ) : null}
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Suggested Prompts</h3>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={`prompt-loading-${index}`} className="h-14 rounded-lg border border-white/60 bg-white/[0.45]" />
                  ))}
                </div>
              ) : tutorSuggestedPrompts.length === 0 ? (
                <p className="text-sm text-gray-600">Prompt suggestions will appear once tutor data is loaded.</p>
              ) : (
                <div className="space-y-2">
                  {tutorSuggestedPrompts.map((prompt) => {
                    const Icon = promptIconMap[prompt.icon];

                    return (
                      <button
                        key={prompt.id}
                        type="button"
                        className="w-full text-left p-3 rounded-lg bg-white/[0.45] border border-white/60 hover:bg-white/[0.55] transition-all flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40"
                        onClick={() => {
                          setInput(prompt.text);
                          setSelectedTags(prompt.tags);
                        }}
                      >
                        <Icon className="w-4 h-4 text-[#4a9ff5] mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{prompt.label}</p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{prompt.text}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
