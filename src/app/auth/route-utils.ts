import type { AuthRole } from "../../services/auth";
import {
  getDefaultPathForRole as getDefaultPathForRoleFromRules,
  resolvePostLoginDestination,
} from "./access-control";

export function getDefaultPathForRole(role: AuthRole | null): string {
  return getDefaultPathForRoleFromRules(role);
}

export function resolveSafeLoginDestination(
  requestedPath: string | null | undefined,
  role: AuthRole,
): string {
  return resolvePostLoginDestination(requestedPath, role);
}
