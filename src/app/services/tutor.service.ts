import type { TutorContextTag, TutorMessage, TutorPageData, TutorReplyInput, TutorSession, TutorSessionStatus } from "../models/tutor";
import { getTutorService } from "./factory/service-registry";

export async function getTutorPageData(): Promise<TutorPageData> {
  return getTutorService().getTutorPageData();
}

export async function generateTutorReply(input: TutorReplyInput): Promise<TutorMessage> {
  return getTutorService().generateTutorReply(input);
}

export async function saveTutorTakeaway(input: { sessionId: string; text: string }): Promise<{ sessionId: string; takeaway: string }> {
  return getTutorService().saveTutorTakeaway(input);
}

export async function updateTutorSessionStatus(input: {
  sessionId: string;
  status: TutorSessionStatus;
}): Promise<{ sessionId: string; status: TutorSessionStatus }> {
  return getTutorService().updateTutorSessionStatus(input);
}

export async function generateNoteExplanation(input: {
  noteTitle: string;
  noteContent: string;
  lessonTitle: string;
  courseName: string;
  tags: string[];
}): Promise<string> {
  return getTutorService().generateNoteExplanation(input);
}

export function buildNewTutorSession(input: {
  title: string;
  tags: TutorContextTag[];
  firstUserMessage: string;
  firstAssistantMessage: TutorMessage;
}): TutorSession {
  return getTutorService().buildNewTutorSession(input);
}
