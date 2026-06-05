import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type UiState = {
  dismissedUiPrompts: string[];
};

type UiContextValue = {
  state: UiState;
  hydrate: (partial: Partial<UiState>) => void;
  dismissUiPrompt: (promptId: string) => void;
};

const UiStateContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [dismissedUiPrompts, setDismissedUiPrompts] = useState<string[]>([]);

  const value = useMemo<UiContextValue>(
    () => ({
      state: { dismissedUiPrompts },
      hydrate: (partial) => {
        if (partial.dismissedUiPrompts) {
          setDismissedUiPrompts(partial.dismissedUiPrompts);
        }
      },
      dismissUiPrompt: (promptId) => {
        setDismissedUiPrompts((previous) =>
          previous.includes(promptId) ? previous : [...previous, promptId],
        );
      },
    }),
    [dismissedUiPrompts],
  );

  return <UiStateContext.Provider value={value}>{children}</UiStateContext.Provider>;
}

export function useUiState(): UiContextValue {
  const context = useContext(UiStateContext);

  if (!context) {
    throw new Error("useUiState must be used within UiProvider");
  }

  return context;
}
