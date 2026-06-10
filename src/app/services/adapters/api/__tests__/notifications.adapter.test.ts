import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, httpClient } from "../../../../api";
import { ApiNotificationsAdapter } from "../notifications.adapter";
import type { NotificationPreferences } from "../../../../models/notifications";

vi.mock("../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../api")>("../../../../api");
  return {
    ...actual,
    httpClient: {
      get: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      post: vi.fn(),
    },
  };
});

const mockHttpClient = vi.mocked(httpClient);

const preferences: NotificationPreferences = {
  courseUpdates: false,
  quizReminders: true,
  assignmentDeadlines: false,
  communityActivity: true,
  weeklyProgressReport: false,
  emailNotifications: true,
};

describe("ApiNotificationsAdapter preferences", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads notification preferences", async () => {
    mockHttpClient.get.mockResolvedValue({ data: { preferences } });

    const result = await new ApiNotificationsAdapter().getNotificationPreferences();

    expect(mockHttpClient.get).toHaveBeenCalledWith("/notifications/preferences");
    expect(result).toEqual(preferences);
  });

  it("saves notification preferences", async () => {
    mockHttpClient.put.mockResolvedValue({ data: { preferences } });

    const result = await new ApiNotificationsAdapter().saveNotificationPreferences(preferences);

    expect(mockHttpClient.put).toHaveBeenCalledWith("/notifications/preferences", {
      body: preferences,
    });
    expect(result).toEqual(preferences);
  });

  it("propagates preference API errors", async () => {
    mockHttpClient.get.mockRejectedValue(
      new ApiError({ category: "http", message: "Preferences failed", status: 500 }),
    );

    await expect(new ApiNotificationsAdapter().getNotificationPreferences()).rejects.toMatchObject({
      message: "Preferences failed",
      status: 500,
    });
  });
});
