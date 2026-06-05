import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  SuggestedTutorPrompt,
  TutorContextTag,
  TutorSession,
  TutorSessionStatus,
} from "../../models/tutor";
import {
  buildNewTutorSession,
  generateTutorReply,
  getTutorPageData,
  saveTutorTakeaway,
  updateTutorSessionStatus,
} from "../../services/tutor.service";
import { getAsyncErrorMessage } from "../../utils/async-errors";
import type { AsyncViewError, TutorViewState } from "../shared/types";

type TutorState = {
  tutorViewState: TutorViewState;
  tutorError: AsyncViewError;
  tutorSessions: TutorSession[];
  tutorSuggestedPrompts: SuggestedTutorPrompt[];
  activeTutorSessionId: string | null;
};

type TutorContextValue = {
  state: TutorState;
  hydrate: (partial: Partial<TutorState>) => void;
  reloadTutorData: () => void;
  setActiveTutorSession: (sessionId: string | null) => void;
  sendTutorMessage: (input: {
    sessionId: string;
    prompt: string;
    tags: TutorContextTag[];
    sessionTitle: string;
  }) => Promise<void>;
  addTutorTakeaway: (input: { sessionId: string; takeaway: string }) => Promise<void>;
  setTutorSessionStatus: (input: { sessionId: string; status: TutorSessionStatus }) => Promise<void>;
};

const TutorStateContext = createContext<TutorContextValue | null>(null);

const DEFAULT_STATE: TutorState = {
  tutorViewState: "loading",
  tutorError: null,
  tutorSessions: [],
  tutorSuggestedPrompts: [],
  activeTutorSessionId: null,
};

export function TutorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TutorState>(DEFAULT_STATE);

  const loadTutorData = () => {
    setState((previous) => ({ ...previous, tutorViewState: "loading", tutorError: null }));

    void getTutorPageData()
      .then((data) => {
        setState((previous) => ({
          ...previous,
          tutorViewState: "success",
          tutorError: null,
          tutorSessions: data.sessions,
          tutorSuggestedPrompts: data.suggestedPrompts,
          activeTutorSessionId:
            previous.activeTutorSessionId && data.sessions.some((session) => session.id === previous.activeTutorSessionId)
              ? previous.activeTutorSessionId
              : (data.sessions[0]?.id ?? null),
        }));
      })
      .catch((error) => {
        setState((previous) => ({
          ...previous,
          tutorViewState: "error",
          tutorError: getAsyncErrorMessage(
            error,
            "We could not load tutor sessions right now. Retry to restore your session history.",
          ),
        }));
      });
  };

  const value = useMemo<TutorContextValue>(
    () => ({
      state,
      hydrate: (partial) => {
        setState((previous) => {
          const hydratedSessions = partial.tutorSessions ?? previous.tutorSessions;
          const requestedSessionId = partial.activeTutorSessionId;
          const hydratedActiveSessionId =
            requestedSessionId && hydratedSessions.some((session) => session.id === requestedSessionId)
              ? requestedSessionId
              : previous.activeTutorSessionId;

          return {
            ...previous,
            tutorError: partial.tutorError ?? previous.tutorError,
            tutorSessions: hydratedSessions,
            tutorSuggestedPrompts: partial.tutorSuggestedPrompts ?? previous.tutorSuggestedPrompts,
            activeTutorSessionId: hydratedActiveSessionId ?? null,
          };
        });
      },
      reloadTutorData: loadTutorData,
      setActiveTutorSession: (sessionId) => {
        setState((previous) => {
          if (sessionId && !previous.tutorSessions.some((session) => session.id === sessionId)) {
            return previous;
          }

          return {
            ...previous,
            activeTutorSessionId: sessionId,
          };
        });
      },
      sendTutorMessage: async ({ sessionId, prompt, tags, sessionTitle }) => {
        const existingSession = state.tutorSessions.find((session) => session.id === sessionId);

        if (!existingSession) {
          const assistantReply = await generateTutorReply({ sessionId, prompt, tags });
          const nextSession = buildNewTutorSession({
            title: sessionTitle,
            tags,
            firstUserMessage: prompt,
            firstAssistantMessage: assistantReply,
          });

          setState((previous) => ({
            ...previous,
            tutorSessions: [nextSession, ...previous.tutorSessions],
            activeTutorSessionId: nextSession.id,
          }));
          return;
        }

        const userMessage = {
          id: `msg-${Date.now()}-user`,
          role: "user" as const,
          content: prompt,
          createdAt: new Date().toISOString(),
        };

        setState((previous) => ({
          ...previous,
          tutorSessions: previous.tutorSessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messages: [...session.messages, userMessage],
                  updatedAt: userMessage.createdAt,
                }
              : session,
          ),
        }));

        try {
          const assistantReply = await generateTutorReply({ sessionId, prompt, tags });

          setState((previous) => ({
            ...previous,
            tutorSessions: previous.tutorSessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    messages: [...session.messages, assistantReply],
                    updatedAt: assistantReply.createdAt,
                  }
                : session,
            ),
          }));
        } catch (error) {
          const fallbackMessage = error instanceof Error
            ? error.message
            : "Tutor response failed. Please try again.";

          setState((previous) => ({
            ...previous,
            tutorSessions: previous.tutorSessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    messages: [
                      ...session.messages,
                      {
                        id: `msg-${Date.now()}-fallback`,
                        role: "assistant",
                        content: fallbackMessage,
                        createdAt: new Date().toISOString(),
                      },
                    ],
                    updatedAt: new Date().toISOString(),
                  }
                : session,
            ),
          }));
        }
      },
      addTutorTakeaway: async ({ sessionId, takeaway }) => {
        const result = await saveTutorTakeaway({ sessionId, text: takeaway });

        setState((previous) => ({
          ...previous,
          tutorSessions: previous.tutorSessions.map((session) => {
            if (session.id !== sessionId) {
              return session;
            }

            return {
              ...session,
              takeaways: [result.takeaway, ...session.takeaways].slice(0, 12),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },
      setTutorSessionStatus: async ({ sessionId, status }) => {
        const result = await updateTutorSessionStatus({ sessionId, status });

        setState((previous) => ({
          ...previous,
          tutorSessions: previous.tutorSessions.map((session) => {
            if (session.id !== result.sessionId) {
              return session;
            }

            return {
              ...session,
              status: result.status,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },
    }),
    [state],
  );

  return <TutorStateContext.Provider value={value}>{children}</TutorStateContext.Provider>;
}

export function useTutorState(): TutorContextValue {
  const context = useContext(TutorStateContext);

  if (!context) {
    throw new Error("useTutorState must be used within TutorProvider");
  }

  return context;
}
