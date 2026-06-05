import { describe, expect, it } from "vitest";
import { getProtectedRouteDecision, getRoleProtectedRouteDecision } from "./route-guards";

describe("route-guards", () => {
  it("returns loading while auth is restoring", () => {
    expect(getProtectedRouteDecision("restoring")).toEqual({ type: "loading" });
  });

  it("redirects unauthenticated users to login", () => {
    expect(getProtectedRouteDecision("unauthenticated")).toEqual({ type: "redirect", to: "/login" });
  });

  it("allows authenticated users", () => {
    expect(getProtectedRouteDecision("authenticated")).toEqual({ type: "allow" });
  });

  it("allows role access when role is permitted", () => {
    expect(
      getRoleProtectedRouteDecision("authenticated", "admin", ["admin"], "/admin"),
    ).toEqual({ type: "allow" });
  });

  it("redirects disallowed role to fallback role home", () => {
    expect(
      getRoleProtectedRouteDecision("authenticated", "student", ["admin"], "/admin"),
    ).toEqual({ type: "redirect", to: "/dashboard" });
  });

  it("redirects to unauthorized when already on fallback", () => {
    expect(
      getRoleProtectedRouteDecision("authenticated", "student", ["admin"], "/dashboard"),
    ).toEqual({ type: "redirect", to: "/unauthorized" });
  });
});
