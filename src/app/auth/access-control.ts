import type { AuthRole } from "../../services/auth";

export const AUTH_ROLES = ["student", "instructor", "admin"] as const satisfies readonly AuthRole[];

export const ROLE_ROUTE_ALLOWLIST = {
  instructor: ["instructor", "admin"],
  admin: ["admin"],
} as const satisfies Record<string, readonly AuthRole[]>;

const DEFAULT_PATH_BY_ROLE: Readonly<Record<AuthRole, string>> = {
  student: "/dashboard",
  instructor: "/instructor",
  admin: "/admin",
};

const NEVER_POST_LOGIN_REDIRECT_PATHS = new Set(["/login", "/signup", "/unauthorized"]);

type RouteLikeMatch = {
  handle?: unknown;
};

type RouteHandle = {
  allowedRoles?: unknown;
};

function getPathname(path: string): string {
  const queryIndex = path.indexOf("?");
  const hashIndex = path.indexOf("#");

  let endIndex = path.length;

  if (queryIndex >= 0) {
    endIndex = Math.min(endIndex, queryIndex);
  }

  if (hashIndex >= 0) {
    endIndex = Math.min(endIndex, hashIndex);
  }

  return path.slice(0, endIndex);
}

function startsWithPathSegment(pathname: string, segment: string): boolean {
  return pathname === segment || pathname.startsWith(`${segment}/`);
}

function normalizeInternalRoutePath(path: string | null | undefined): string | null {
  if (typeof path !== "string") {
    return null;
  }

  const trimmedPath = path.trim();

  if (!trimmedPath.startsWith("/")) {
    return null;
  }

  return trimmedPath;
}

export function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === "string" && AUTH_ROLES.includes(value as AuthRole);
}

export function parseAllowedRoles(allowedRoles: unknown): AuthRole[] | null {
  if (!Array.isArray(allowedRoles)) {
    return null;
  }

  const parsedRoles = allowedRoles.filter(isAuthRole);

  if (parsedRoles.length === 0) {
    return null;
  }

  return Array.from(new Set(parsedRoles));
}

export function getAllowedRolesFromMatches(matches: readonly RouteLikeMatch[]): AuthRole[] | null {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const handle = matches[index].handle as RouteHandle | undefined;
    const parsedRoles = parseAllowedRoles(handle?.allowedRoles);

    if (parsedRoles) {
      return parsedRoles;
    }
  }

  return null;
}

export function canAccessRoleRoute(role: AuthRole | null, allowedRoles: readonly AuthRole[] | null): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}

export function getDefaultPathForRole(role: AuthRole | null): string {
  if (!role) {
    return DEFAULT_PATH_BY_ROLE.student;
  }

  return DEFAULT_PATH_BY_ROLE[role];
}

export function getAllowedRolesForPath(path: string): readonly AuthRole[] | null {
  const pathname = getPathname(path);

  if (startsWithPathSegment(pathname, "/admin")) {
    return ROLE_ROUTE_ALLOWLIST.admin;
  }

  if (startsWithPathSegment(pathname, "/instructor")) {
    return ROLE_ROUTE_ALLOWLIST.instructor;
  }

  return null;
}

export function canRoleAccessPath(role: AuthRole, path: string): boolean {
  const allowedRoles = getAllowedRolesForPath(path);
  return canAccessRoleRoute(role, allowedRoles);
}

/** Redirect admins away from student-first catalog and dashboard experiences */
export function getAdminRedirectFromStudentExperience(
  pathname: string,
  role: AuthRole | null,
): string | null {
  if (role !== "admin") {
    return null;
  }

  const normalized = getPathname(pathname);

  if (
    normalized === "/dashboard" ||
    normalized === "/courses" ||
    normalized.startsWith("/courses/") ||
    normalized === "/pricing"
  ) {
    return "/admin";
  }

  return null;
}

export function resolvePostLoginDestination(
  requestedPath: string | null | undefined,
  role: AuthRole,
): string {
  const fallbackPath = getDefaultPathForRole(role);
  const normalizedRequestedPath = normalizeInternalRoutePath(requestedPath);

  if (!normalizedRequestedPath) {
    return fallbackPath;
  }

  const pathname = getPathname(normalizedRequestedPath);

  if (NEVER_POST_LOGIN_REDIRECT_PATHS.has(pathname)) {
    return fallbackPath;
  }

  if (!canRoleAccessPath(role, pathname)) {
    return fallbackPath;
  }

  return normalizedRequestedPath;
}