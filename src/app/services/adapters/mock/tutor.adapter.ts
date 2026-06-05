import type {
  TutorContextTag,
  TutorMessage,
  TutorSession,
  TutorSessionStatus,
} from "../../../models/tutor";
import { tutorPageMock } from "../../../mocks/tutor.mock";
import type { TutorService } from "../../contracts/tutor.contract";
import { withMockDelay } from "../../mock-utils";

export class MockTutorAdapter implements TutorService {
  async getTutorPageData() {
    return withMockDelay(tutorPageMock, 350);
  }

  async generateTutorReply(input: { prompt: string; tags: TutorContextTag[] }) {
    await withMockDelay(null, 700);

    if (input.prompt.trim().length < 6) {
      throw new Error("Please add a bit more detail so the tutor can provide a useful answer.");
    }

    const topicTag = input.tags.find((tag) => tag.type === "topic")?.label ?? "your topic";

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: "assistant",
      content: `Here is a focused breakdown for ${topicTag}. Start with the core idea, then test recall with 3 short questions, and finish by writing one summary sentence in your own words.`,
      createdAt: new Date().toISOString(),
    } as TutorMessage;
  }

  async saveTutorTakeaway(input: { sessionId: string; text: string }): Promise<{ sessionId: string; takeaway: string }> {
    await withMockDelay(null, 280);

    if (input.text.trim().length < 8) {
      throw new Error("Takeaway is too short. Save a complete note you can revisit later.");
    }

    return {
      sessionId: input.sessionId,
      takeaway: input.text.trim(),
    };
  }

  async updateTutorSessionStatus(input: {
    sessionId: string;
    status: TutorSessionStatus;
  }): Promise<{ sessionId: string; status: TutorSessionStatus }> {
    await withMockDelay(null, 180);
    return input;
  }

  async generateNoteExplanation(input: {
    noteTitle: string;
    noteContent: string;
    lessonTitle: string;
    courseName: string;
    tags: string[];
  }): Promise<string> {
    await withMockDelay(null, 850);

    const topicContext = input.tags.length > 0 ? input.tags.slice(0, 2).join(" and ") : input.courseName;
    const firstSentence = input.noteContent.split(/[.!?\n]/)[0]?.trim() ?? input.noteContent;
    const truncated = firstSentence.length > 110 ? firstSentence.slice(0, 110) + "..." : firstSentence;

    return `In "${input.lessonTitle}", this note on "${input.noteTitle}" covers a concept central to ${topicContext}. At its core: ${truncated}. Grasping this builds directly toward more advanced ideas in ${input.courseName}. A good retention technique: close the note and try restating the idea in your own words, then verify.`;
  }

  buildNewTutorSession(input: {
    title: string;
    tags: TutorContextTag[];
    firstUserMessage: string;
    firstAssistantMessage: TutorMessage;
  }): TutorSession {
    const nowIso = new Date().toISOString();

    return {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      status: "active",
      tags: input.tags,
      messages: [
        {
          id: `msg-${Date.now()}-user`,
          role: "user",
          content: input.firstUserMessage,
          createdAt: nowIso,
        },
        input.firstAssistantMessage,
      ],
      takeaways: [],
      updatedAt: nowIso,
    };
  }
}