import { withMockDelay } from "./mock-utils";
import {
  normalizeEmailInput,
  normalizeRequiredTextInput,
} from "../utils/form-validation";

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
  await withMockDelay(null, 650);

  const normalizedTitle = normalizeRequiredTextInput(input.title);
  const normalizedContent = normalizeRequiredTextInput(input.content);
  const normalizedCourse = normalizeRequiredTextInput(input.course);

  if (normalizedContent.length < 20) {
    throw new Error("Add a bit more detail so this note is useful to revisit later.");
  }

  return {
    id: existingId ?? Date.now(),
    title: normalizedTitle,
    content: normalizedContent,
    course: normalizedCourse,
    tags: input.tags,
    starred: input.starred,
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

export async function saveProfileSettings(input: ProfileSettingsInput): Promise<ProfileSettingsInput> {
  await withMockDelay(null, 700);

  const normalizedEmail = normalizeEmailInput(input.email);

  return {
    ...input,
    firstName: normalizeRequiredTextInput(input.firstName),
    lastName: normalizeRequiredTextInput(input.lastName),
    email: normalizedEmail,
    bio: normalizeRequiredTextInput(input.bio),
    institution: normalizeRequiredTextInput(input.institution),
  };
}

export async function saveNotificationSettings(
  input: NotificationSettingsInput,
): Promise<NotificationSettingsInput> {
  await withMockDelay(null, 500);
  return input;
}

export async function saveSecuritySettings(_input: SecuritySettingsInput): Promise<void> {
  throw new Error("Password changes are not available in demo mode.");
}
