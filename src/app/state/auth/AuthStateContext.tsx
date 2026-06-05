import { type ReactNode } from "react";
import { AuthProvider } from "../../auth/AuthContext";

export function AuthStateProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
