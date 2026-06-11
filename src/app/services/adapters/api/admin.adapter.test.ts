import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "../../../api";
import { ApiAdminAdapter } from "./admin.adapter";

vi.mock("../../../api", () => ({
  httpClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
  toApiError: (error: unknown) => error,
}));

const mockHttpClient = vi.mocked(httpClient);

const safeUser = {
  id: "user-1",
  email: "student@example.com",
  firstName: "Sarah",
  lastName: "Student",
  role: "STUDENT" as const,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
};

describe("ApiAdminAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists admin users from /admin/users", async () => {
    mockHttpClient.get.mockResolvedValueOnce({ status: "ok", data: { users: [safeUser] } });

    await expect(new ApiAdminAdapter().listUsers()).resolves.toEqual([safeUser]);
    expect(mockHttpClient.get).toHaveBeenCalledWith("/admin/users");
  });

  it("updates user roles through the admin role endpoint", async () => {
    const updatedUser = { ...safeUser, role: "INSTRUCTOR" as const };
    mockHttpClient.patch.mockResolvedValueOnce({ status: "ok", data: { user: updatedUser } });

    await expect(new ApiAdminAdapter().updateUserRole("user-1", "INSTRUCTOR")).resolves.toEqual(updatedUser);
    expect(mockHttpClient.patch).toHaveBeenCalledWith("/admin/users/user-1/role", {
      body: { role: "INSTRUCTOR" },
    });
  });
});
