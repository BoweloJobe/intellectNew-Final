import type { NotesListParams, NotesService, PaginatedNotesResult } from "../../contracts/notes.contract";
import type { NoteFormInput, NoteSubmissionResult } from "../../form-flows.service";
import { httpClient, toApiError } from "../../../api";

type BackendNote = {
  id: number;
  title: string;
  content: string;
  course: string;
  tags: string[];
  starred: boolean;
  createdAt: string;
  updatedAt: string;
};

type BackendNotesResponse = {
  status: string;
  data: {
    items?: BackendNote[];
    notes?: BackendNote[];
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};
type BackendNoteResponse = { status: string; data: { note: BackendNote } };

function formatNoteDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toNoteSubmissionResult(note: BackendNote): NoteSubmissionResult {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    course: note.course,
    tags: note.tags,
    starred: note.starred,
    date: formatNoteDate(note.updatedAt || note.createdAt),
  };
}

export class ApiNotesAdapter implements NotesService {
  async getNotesLibrary(params?: NotesListParams): Promise<NoteSubmissionResult[]> {
    const result = await this.listNotes(params);
    return result.items;
  }

  async listNotes(params: NotesListParams = {}): Promise<PaginatedNotesResult> {
    try {
      const response = await httpClient.get<BackendNotesResponse>("/notes", {
        query: {
          search: params.search,
          course: params.course,
          tag: params.tag,
          starred: params.starred,
          page: params.page,
          pageSize: params.pageSize,
        },
      });
      const backendNotes = response.data.items ?? response.data.notes ?? [];
      const items = backendNotes.map(toNoteSubmissionResult);

      return {
        items,
        page: response.data.page ?? params.page ?? 1,
        pageSize: response.data.pageSize ?? params.pageSize ?? items.length,
        total: response.data.total ?? items.length,
        totalPages: response.data.totalPages ?? 1,
        hasNextPage: response.data.hasNextPage ?? false,
        hasPreviousPage: response.data.hasPreviousPage ?? false,
      };
    } catch (error) {
      throw toApiError(error, { operation: "notes.listNotes" });
    }
  }

  async saveNote(input: NoteFormInput, existingId?: number): Promise<NoteSubmissionResult> {
    try {
      const body = {
        title: input.title,
        content: input.content,
        course: input.course,
        tags: input.tags,
        starred: input.starred,
      };

      const response = existingId
        ? await httpClient.put<BackendNoteResponse>(`/notes/${encodeURIComponent(String(existingId))}`, {
            body,
          })
        : await httpClient.post<BackendNoteResponse>("/notes", {
            body,
          });

      return toNoteSubmissionResult(response.data.note);
    } catch (error) {
      throw toApiError(error, { operation: existingId ? "notes.updateNote" : "notes.createNote" });
    }
  }

  async deleteNote(id: number): Promise<void> {
    try {
      await httpClient.delete(`/notes/${encodeURIComponent(String(id))}`);
    } catch (error) {
      throw toApiError(error, { operation: "notes.deleteNote" });
    }
  }
}
