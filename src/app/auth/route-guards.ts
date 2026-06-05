import type { AuthRole } from "../../services/auth";
import { canAccessRoleRoute, getDefaultPathForRole } from "./access-control";

export type AuthStatus = "restoring" | "authenticated" | "unauthenticated";

type RouteAccessDecision =
  | { type: "loading" }
  | { type: "allow" }
  | { type: "redirect"; to: string };

export function getProtectedRouteDecision(status: AuthStatus): RouteAccessDecision {
  if (status === "restoring") {
    return { type: "loading" };
  }

  if (status !== "authenticated") {
    return { type: "redirect", to: "/login" };
  }

  return { type: "allow" };
}

export function getRoleProtectedRouteDecision(
  status: AuthStatus,
  role: AuthRole | null,
  allowedRoles: AuthRole[] | null,
  currentPath: string,
): RouteAccessDecision {
  const protectedRouteDecision = getProtectedRouteDecision(status);

  if (protectedRouteDecision.type !== "allow") {
    return protectedRouteDecision;
  }

  if (canAccessRoleRoute(role, allowedRoles)) {
    return { type: "allow" };
  }

  const fallbackPath = getDefaultPathForRole(role);

  if (fallbackPath !== currentPath) {
    return { type: "redirect", to: fallbackPath };
  }

  return { type: "redirect", to: "/unauthorized" };
}
