import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadNotificationSettings,
  saveNotificationSettings,
  type NotificationSettingsInput,
} from "./form-flows.service";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from "./notifications.service";

vi.mock("./notifications.service", () => ({
  getNotificationPreferences: vi.fn(),
  saveNotificationPreferences: vi.fn(),
}));

const mockGetNotificationPreferences = vi.mocked(getNotificationPreferences);
const mockSaveNotificationPreferences = vi.mocked(saveNotificationPreferences);

const preferences: NotificationSettingsInput = {
  courseUpdates: false,
  quizReminders: true,
  assignmentDeadlines: false,
  communityActivity: true,
  weeklyProgressReport: false,
  emailNotifications: true,
};

describe("notification settings form flow", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads notification settings through the notifications service", async () => {
    mockGetNotificationPreferences.mockResolvedValue(preferences);

    await expect(loadNotificationSettings()).resolves.toEqual(preferences);
    expect(mockGetNotificationPreferences).toHaveBeenCalledTimes(1);
  });

  it("saves notification settings through the notifications service", async () => {
    mockSaveNotificationPreferences.mockResolvedValue(preferences);

    await expect(saveNotificationSettings(preferences)).resolves.toEqual(preferences);
    expect(mockSaveNotificationPreferences).toHaveBeenCalledWith(preferences);
  });
});
