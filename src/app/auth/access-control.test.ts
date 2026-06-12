import { describe, expect, it } from "vitest";
import {
  canAccessRoleRoute,
  canRoleAccessPath,
  getAdminRedirectFromStudentExperience,
  getAllowedRolesForPath,
  getAllowedRolesFromMatches,
  getDefaultPathForRole,
  isAuthRole,
  parseAllowedRoles,
  resolvePostLoginDestination,
} from "./access-control";

describe("access-control", () => {
  it("validates auth roles", () => {
    expect(isAuthRole("student")).toBe(true);
    expect(isAuthRole("admin")).toBe(true);
    expect(isAuthRole("guest")).toBe(false);
    expect(isAuthRole(null)).toBe(false);
  });

  it("parses route handle role arrays safely", () => {
    expect(parseAllowedRoles(["admin", "student", "admin"])).toEqual(["admin", "student"]);
    expect(parseAllowedRoles(["guest"])).toBeNull();
    expect(parseAllowedRoles("admin")).toBeNull();
  });

  it("reads nearest allowedRoles from route matches", () => {
    const matches = [
      { handle: { allowedRoles: ["student"] } },
      { handle: {} },
      { handle: { allowedRoles: ["admin", "instructor"] } },
    ];

    expect(getAllowedRolesFromMatches(matches)).toEqual(["admin", "instructor"]);
  });

  it("checks role access correctly", () => {
    expect(canAccessRoleRoute("admin", ["admin"])).toBe(true);
    expect(canAccessRoleRoute("student", ["admin"])).toBe(false);
    expect(canAccessRoleRoute(null, ["admin"])).toBe(false);
    expect(canAccessRoleRoute(null, null)).toBe(true);
  });

  it("resolves default destination by role", () => {
    expect(getDefaultPathForRole("student")).toBe("/dashboard");
    expect(getDefaultPathForRole("instructor")).toBe("/instructor");
    expect(getDefaultPathForRole("admin")).toBe("/admin");
    expect(getDefaultPathForRole(null)).toBe("/dashboard");
  });

  it("maps route path to role allowlists", () => {
    expect(getAllowedRolesForPath("/admin")).toEqual(["admin"]);
    expect(getAllowedRolesForPath("/instructor/analytics")).toEqual(["instructor", "admin"]);
    expect(getAllowedRolesForPath("/dashboard")).toBeNull();
    expect(canRoleAccessPath("admin", "/instructor")).toBe(true);
    expect(canRoleAccessPath("student", "/instructor")).toBe(false);
  });

  it("redirects admins away from student catalog and dashboard routes", () => {
    expect(getAdminRedirectFromStudentExperience("/courses", "admin")).toBe("/admin");
    expect(getAdminRedirectFromStudentExperience("/courses/course-1", "admin")).toBe("/admin");
    expect(getAdminRedirectFromStudentExperience("/dashboard", "admin")).toBe("/admin");
    expect(getAdminRedirectFromStudentExperience("/pricing", "admin")).toBe("/admin");
    expect(getAdminRedirectFromStudentExperience("/admin", "admin")).toBeNull();
    expect(getAdminRedirectFromStudentExperience("/courses", "student")).toBeNull();
  });

  it("resolves safe post-login destination", () => {
    expect(resolvePostLoginDestination("/courses", "student")).toBe("/courses");
    expect(resolvePostLoginDestination("/admin", "student")).toBe("/dashboard");
    expect(resolvePostLoginDestination("/login", "student")).toBe("/dashboard");
    expect(resolvePostLoginDestination("https://evil.test", "admin")).toBe("/admin");
    expect(resolvePostLoginDestination("", "instructor")).toBe("/instructor");
  });
});
