import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../api";
import { AI_TUTOR_UNAVAILABLE_MESSAGE, ApiTutorAdapter } from "./tutor.adapter";

vi.mock("../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../api")>("../../../api");

  return {
    ...actual,
    httpClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
  };
});

describe("ApiTutorAdapter", () => {
  let httpClient: typeof import("../../../api").httpClient;

  beforeEach(async () => {
    const api = await import("../../../api");
    httpClient = api.httpClient;
    vi.mocked(httpClient.get).mockReset();
    vi.mocked(httpClient.post).mockReset();
    vi.mocked(httpClient.patch).mockReset();
  });

  it("reports missing backend tutor routes as unavailable instead of falling back to fake AI", async () => {
    vi.mocked(httpClient.get).mockRejectedValueOnce(new ApiError({
      category: "http",
      status: 404,
      message: "Requested resource was not found.",
      operation: "tutor.getTutorPageData",
    }));

    await expect(new ApiTutorAdapter().getTutorPageData()).rejects.toMatchObject({
      status: 503,
      message: AI_TUTOR_UNAVAILABLE_MESSAGE,
    });
  });

  it("reports unavailable tutor replies honestly in API mode", async () => {
    vi.mocked(httpClient.post).mockRejectedValueOnce(new ApiError({
      category: "http",
      status: 503,
      message: "Provider not configured.",
      operation: "tutor.generateTutorReply",
    }));

    await expect(new ApiTutorAdapter().generateTutorReply({
      sessionId: "session-1",
      prompt: "Explain cells",
      tags: [],
    })).rejects.toMatchObject({
      status: 503,
      message: AI_TUTOR_UNAVAILABLE_MESSAGE,
    });
  });
});
