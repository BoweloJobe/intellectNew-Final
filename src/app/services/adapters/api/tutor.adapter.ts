import type {
  TutorContextTag,
  TutorMessage,
  TutorReplyInput,
  TutorSession,
  TutorSessionStatus,
} from "../../../models/tutor";
import type { TutorService } from "../../contracts/tutor.contract";
import {
  httpClient,
  toApiError,
  type GenerateNoteExplanationRequestDto,
  type GenerateNoteExplanationResponseDto,
  type SaveTutorTakeawayRequestDto,
  type SaveTutorTakeawayResponseDto,
  type TutorPageDto,
  type TutorReplyDto,
  type TutorReplyRequestDto,
  type UpdateTutorSessionStatusRequestDto,
  type UpdateTutorSessionStatusResponseDto,
} from "../../../api";

export class ApiTutorAdapter implements TutorService {
  async getTutorPageData() {
    try {
      return await httpClient.get<TutorPageDto>("/tutor");
    } catch (error) {
      throw toApiError(error, { operation: "tutor.getTutorPageData" });
    }
  }

  async generateTutorReply(input: TutorReplyInput): Promise<TutorMessage> {
    const payload: TutorReplyRequestDto = input;

    try {
      return await httpClient.post<TutorReplyDto, TutorReplyRequestDto>("/tutor/reply", {
        body: payload,
      });
    } catch (error) {
      throw toApiError(error, { operation: "tutor.generateTutorReply" });
    }
  }

  async saveTutorTakeaway(input: { sessionId: string; text: string }): Promise<{ sessionId: string; takeaway: string }> {
    const payload: SaveTutorTakeawayRequestDto = input;

    try {
      return await httpClient.post<SaveTutorTakeawayResponseDto, SaveTutorTakeawayRequestDto>(
        `/tutor/sessions/${encodeURIComponent(input.sessionId)}/takeaways`,
        { body: payload },
      );
    } catch (error) {
      throw toApiError(error, { operation: "tutor.saveTutorTakeaway" });
    }
  }

  async updateTutorSessionStatus(input: {
    sessionId: string;
    status: TutorSessionStatus;
  }): Promise<{ sessionId: string; status: TutorSessionStatus }> {
    const payload: UpdateTutorSessionStatusRequestDto = input;

    try {
      return await httpClient.patch<
        UpdateTutorSessionStatusResponseDto,
        UpdateTutorSessionStatusRequestDto
      >(`/tutor/sessions/${encodeURIComponent(input.sessionId)}/status`, {
        body: payload,
      });
    } catch (error) {
      throw toApiError(error, { operation: "tutor.updateTutorSessionStatus" });
    }
  }

  async generateNoteExplanation(input: {
    noteTitle: string;
    noteContent: string;
    lessonTitle: string;
    courseName: string;
    tags: string[];
  }): Promise<string> {
    const payload: GenerateNoteExplanationRequestDto = input;

    try {
      const response = await httpClient.post<
        GenerateNoteExplanationResponseDto,
        GenerateNoteExplanationRequestDto
      >("/tutor/notes/explanation", { body: payload });

      return response.explanation;
    } catch (error) {
      throw toApiError(error, { operation: "tutor.generateNoteExplanation" });
    }
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