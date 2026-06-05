import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type LessonsState = {
  lastViewedLessonId: string | null;
};

type LessonsContextValue = {
  state: LessonsState;
  setLastViewedLessonId: (lessonId: string | null) => void;
};

const LessonsStateContext = createContext<LessonsContextValue | null>(null);

export function LessonsProvider({ children }: { children: ReactNode }) {
  const [lastViewedLessonId, setLastViewedLessonId] = useState<string | null>(null);

  const value = useMemo<LessonsContextValue>(
    () => ({
      state: { lastViewedLessonId },
      setLastViewedLessonId,
    }),
    [lastViewedLessonId],
  );

  return <LessonsStateContext.Provider value={value}>{children}</LessonsStateContext.Provider>;
}

export function useLessonsState(): LessonsContextValue {
  const context = useContext(LessonsStateContext);

  if (!context) {
    throw new Error("useLessonsState must be used within LessonsProvider");
  }

  return context;
}
