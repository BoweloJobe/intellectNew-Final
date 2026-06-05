export type TutorRole = "user" | "assistant";

export type TutorSessionStatus = "active" | "archived" | "pinned";

export type TutorTagType = "course" | "topic";

export interface TutorContextTag {
  id: string;
  type: TutorTagType;
  label: string;
}

export interface TutorMessage {
  id: string;
  role: TutorRole;
  content: string;
  createdAt: string;
}

export interface TutorSession {
  id: string;
  title: string;
  status: TutorSessionStatus;
  tags: TutorContextTag[];
  messages: TutorMessage[];
  takeaways: string[];
  updatedAt: string;
}

export interface SuggestedTutorPrompt {
  id: string;
  label: string;
  icon: "book" | "plan" | "help" | "sparkles";
  text: string;
  tags: TutorContextTag[];
}

export interface TutorPageData {
  sessions: TutorSession[];
  suggestedPrompts: SuggestedTutorPrompt[];
}

export interface TutorReplyInput {
  sessionId: string;
  prompt: string;
  tags: TutorContextTag[];
}
