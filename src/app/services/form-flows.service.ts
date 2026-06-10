import { withMockDelay } from "./mock-utils";
import {
  normalizeEmailInput,
  normalizeRequiredTextInput,
} from "../utils/form-validation";
import { getNotesService } from "./factory/service-registry";
import { changePassword, updateProfile } from "./auth.service";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from "./notifications.service";

export type DiscussionFormInput = {
  title: string;
  body: string;
  category: string;
};

export type NoteFormInput = {
  title: string;
  content: string;
  course: string;
  tags: string[];
  starred: boolean;
};

export type ProfileSettingsInput = {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  institution: string;
};

export type NotificationSettingsInput = {
  courseUpdates: boolean;
  quizReminders: boolean;
  assignmentDeadlines: boolean;
  communityActivity: boolean;
  weeklyProgressReport: boolean;
  emailNotifications: boolean;
};

export type SecuritySettingsInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type DiscussionSubmissionResult = {
  title: string;
  body: string;
  category: string;
};

export type NoteSubmissionResult = NoteFormInput & {
  id: number;
  date: string;
};

export async function submitDiscussionForm(input: DiscussionFormInput): Promise<DiscussionSubmissionResult> {
  await withMockDelay(null, 700);

  const normalizedTitle = normalizeRequiredTextInput(input.title);
  const normalizedBody = normalizeRequiredTextInput(input.body);
  const normalizedCategory = normalizeRequiredTextInput(input.category);

  if (normalizedTitle.toLowerCase().includes("spam")) {
    throw new Error("Please revise the title before posting this discussion.");
  }

  return {
    title: normalizedTitle,
    body: normalizedBody,
    category: normalizedCategory,
  };
}

export async function saveDiscussionDraftForm(input: DiscussionFormInput): Promise<DiscussionSubmissionResult> {
  await withMockDelay(null, 400);

  const normalizedTitle = normalizeRequiredTextInput(input.title);
  const normalizedBody = normalizeRequiredTextInput(input.body);
  const normalizedCategory = normalizeRequiredTextInput(input.category);

  return {
    title: normalizedTitle || "Untitled discussion",
    body: normalizedBody,
    category: normalizedCategory || "General",
  };
}

export async function saveNoteForm(input: NoteFormInput, existingId?: number): Promise<NoteSubmissionResult> {
  return getNotesService().saveNote(input, existingId);
}

export async function saveProfileSettings(input: ProfileSettingsInput): Promise<ProfileSettingsInput> {
  const normalizedFirstName = normalizeRequiredTextInput(input.firstName);
  const normalizedLastName = normalizeRequiredTextInput(input.lastName);
  const normalizedEmail = normalizeEmailInput(input.email);
  const normalizedBio = input.bio.trim();
  const normalizedInstitution = input.institution.trim();

  const result = await updateProfile({
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    email: normalizedEmail,
    bio: normalizedBio,
    institution: normalizedInstitution,
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  return {
    firstName: result.user.firstName ?? "",
    lastName: result.user.lastName ?? "",
    email: result.user.email,
    bio: result.user.bio ?? "",
    institution: result.user.institution ?? "",
  };
}

export async function saveNotificationSettings(
  input: NotificationSettingsInput,
): Promise<NotificationSettingsInput> {
  return saveNotificationPreferences(input);
}

export async function loadNotificationSettings(): Promise<NotificationSettingsInput> {
  return getNotificationPreferences();
}

export async function saveSecuritySettings(input: SecuritySettingsInput): Promise<void> {
  const result = await changePassword({
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
    confirmPassword: input.confirmPassword,
  });

  if (!result.ok) {
    throw new Error(result.message);
  }
}
