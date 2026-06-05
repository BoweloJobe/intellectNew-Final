import type {
  TutorContextTag,
  TutorMessage,
  TutorPageData,
  TutorReplyInput,
  TutorSession,
  TutorSessionStatus,
} from "../../models/tutor";

export interface TutorService {
  getTutorPageData(): Promise<TutorPageData>;
  generateTutorReply(input: TutorReplyInput): Promise<TutorMessage>;
  saveTutorTakeaway(input: { sessionId: string; text: string }): Promise<{ sessionId: string; takeaway: string }>;
  updateTutorSessionStatus(input: {
    sessionId: string;
    status: TutorSessionStatus;
  }): Promise<{ sessionId: string; status: TutorSessionStatus }>;
  generateNoteExplanation(input: {
    noteTitle: string;
    noteContent: string;
    lessonTitle: string;
    courseName: string;
    tags: string[];
  }): Promise<string>;
  buildNewTutorSession(input: {
    title: string;
    tags: TutorContextTag[];
    firstUserMessage: string;
    firstAssistantMessage: TutorMessage;
  }): TutorSession;
}