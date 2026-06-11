import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, httpClient } from "../../../api";
import { readStoredAuthSession } from "../../../auth/auth-storage";
import { ApiAuthAdapter } from "./auth.adapter";

vi.mock("../../../api", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  toApiError: (error: unknown) => error,
  ApiError: class ApiError extends Error {
    category: string;
    status?: number;

    constructor(input: { category: string; message: string; status?: number }) {
      super(input.message);
      this.category = input.category;
      this.status = input.status;
    }
  },
}));

vi.mock("../../../auth/auth-storage", () => ({
  readStoredAuthSession: vi.fn(),
}));

const mockHttpClient = vi.mocked(httpClient);
const mockReadStoredAuthSession = vi.mocked(readStoredAuthSession);

const backendUser = {
  id: "user-1",
  email: "student@example.com",
  firstName: "Sarah",
  lastName: "Johnson",
  role: "STUDENT",
  avatarUrl: null,
  bio: "Biology student",
  institution: "Example University",
  isVerified: true,
  createdAt: "2026-06-01T10:00:00.000Z",
};

describe("ApiAuthAdapter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockReadStoredAuthSession.mockReturnValue({
      user: {
        id: "user-1",
        email: "student@example.com",
        firstName: "Sarah",
        lastName: "Johnson",
        fullName: "Sarah Johnson",
        role: "student",
      },
      tokens: { accessToken: "access-token" },
    });
  });

  it("sends student-only signup payload to POST /auth/signup", async () => {
    mockHttpClient.post.mockResolvedValue({
      status: "ok",
      data: { token: "token", user: backendUser },
    });

    const result = await new ApiAuthAdapter().signUp({
      firstName: "Sarah",
      lastName: "Johnson",
      email: "student@example.com",
      password: "password123",
      role: "instructor",
    } as Parameters<ApiAuthAdapter["signUp"]>[0] & { role: string });

    const signupRequest = {
      body: {
        email: "student@example.com",
        password: "password123",
        firstName: "Sarah",
        lastName: "Johnson",
      },
      auth: "none",
    } as const;

    expect(mockHttpClient.post).toHaveBeenCalledWith("/auth/signup", signupRequest);
    expect(signupRequest.body).not.toHaveProperty("role");
    expect(result.ok).toBe(true);
    expect(result.ok && result.user.role).toBe("student");
  });

  it("sends login without requiring an existing bearer token", async () => {
    mockReadStoredAuthSession.mockReturnValue(null);
    mockHttpClient.post.mockResolvedValue({
      status: "ok",
      data: { token: "token", user: backendUser },
    });

    const result = await new ApiAuthAdapter().signIn({
      email: "student@example.com",
      password: "password123",
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith("/auth/login", {
      body: {
        email: "student@example.com",
        password: "password123",
      },
      auth: "none",
    });
    expect(result.ok).toBe(true);
  });

  it("updates profile with PATCH /auth/me and maps returned profile fields", async () => {
    mockHttpClient.patch.mockResolvedValue({
      status: "ok",
      data: { user: backendUser },
    });

    const result = await new ApiAuthAdapter().updateProfile({
      firstName: "Sarah",
      lastName: "Johnson",
      email: "student@example.com",
      bio: "Biology student",
      institution: "Example University",
    });

    expect(mockHttpClient.patch).toHaveBeenCalledWith("/auth/me", {
      body: {
        firstName: "Sarah",
        lastName: "Johnson",
        email: "student@example.com",
        bio: "Biology student",
        institution: "Example University",
      },
    });
    expect(result).toEqual({
      ok: true,
      user: expect.objectContaining({
        bio: "Biology student",
        institution: "Example University",
        learningGoal: "Biology student",
      }),
    });
  });

  it("propagates profile update backend errors", async () => {
    mockHttpClient.patch.mockRejectedValue(
      new ApiError({ category: "http", message: "Email cannot be changed", status: 400 }),
    );

    const result = await new ApiAuthAdapter().updateProfile({
      firstName: "Sarah",
      lastName: "Johnson",
      email: "new@example.com",
      bio: "",
      institution: "",
    });

    expect(result).toEqual({ ok: false, message: "Email cannot be changed" });
  });

  it("does not fake profile success when no auth token exists", async () => {
    mockReadStoredAuthSession.mockReturnValue(null);

    const result = await new ApiAuthAdapter().updateProfile({
      firstName: "Sarah",
      lastName: "Johnson",
      email: "student@example.com",
    });

    expect(result).toEqual({ ok: false, message: "Authentication required" });
    expect(mockHttpClient.patch).not.toHaveBeenCalled();
  });

  it("changes password with PATCH /auth/password", async () => {
    mockHttpClient.patch.mockResolvedValue({ status: "ok", message: "Password updated successfully" });

    const result = await new ApiAuthAdapter().changePassword({
      currentPassword: "password123",
      newPassword: "new-password-123",
      confirmPassword: "new-password-123",
    });

    expect(mockHttpClient.patch).toHaveBeenCalledWith("/auth/password", {
      body: {
        currentPassword: "password123",
        newPassword: "new-password-123",
        confirmPassword: "new-password-123",
      },
    });
    expect(result).toEqual({ ok: true, message: "Password updated successfully." });
  });

  it("propagates password change backend errors", async () => {
    mockHttpClient.patch.mockRejectedValue(
      new ApiError({ category: "http", message: "Current password is incorrect", status: 400 }),
    );

    const result = await new ApiAuthAdapter().changePassword({
      currentPassword: "wrong-password",
      newPassword: "new-password-123",
      confirmPassword: "new-password-123",
    });

    expect(result).toEqual({ ok: false, message: "Current password is incorrect" });
  });
});
