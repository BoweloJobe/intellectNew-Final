import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_SESSION_CLEARED_EVENT } from "../../auth/auth-storage";

const STORAGE_KEY = "intellectx.auth.session";

function storedSession(token: string) {
  return {
    user: {
      id: "user-1",
      fullName: "Test User",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      role: "student",
      subscriptionTier: "free",
    },
    tokens: {
      accessToken: token,
    },
  };
}

async function loadHttpClient() {
  vi.resetModules();
  return import("./httpClient");
}

function mockJsonResponse(status: number, body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("httpClient auth handling", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("attaches the stored bearer token centrally", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession("access-token")));
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const { httpClient } = await loadHttpClient();
    await httpClient.get("/protected");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/protected"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
      }),
    );
  });

  it("omits Authorization when no token exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const { httpClient } = await loadHttpClient();
    await httpClient.get("/public");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/public"),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });

  it("allows requests to opt out of auth headers", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession("access-token")));
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const { httpClient } = await loadHttpClient();
    await httpClient.post("/auth/login", { body: { email: "test@example.com" }, auth: "none" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
  });

  it("clears the stored session and emits an event on authenticated 401", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession("access-token")));
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(401, { message: "expired" }));
    const eventSpy = vi.fn();
    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, eventSpy);
    vi.stubGlobal("fetch", fetchMock);

    const { httpClient } = await loadHttpClient();

    await expect(httpClient.get("/protected")).rejects.toMatchObject({ status: 401 });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(eventSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, eventSpy);
  });

  it("does not clear the stored session for auth opt-out 401 responses", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession("access-token")));
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(401, { message: "bad login" }));
    vi.stubGlobal("fetch", fetchMock);

    const { httpClient } = await loadHttpClient();

    await expect(httpClient.post("/auth/login", { auth: "none" })).rejects.toMatchObject({ status: 401 });
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
