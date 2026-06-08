import type { NotesService } from "../../contracts/notes.contract";
import type { NoteFormInput, NoteSubmissionResult } from "../../form-flows.service";
import { httpClient, toApiError } from "../../../api";
import { readStoredAuthSession } from "../../../auth/auth-storage";

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

type BackendNotesResponse = { status: string; data: { notes: BackendNote[] } };
type BackendNoteResponse = { status: string; data: { note: BackendNote } };

function authHeaders(): Record<string, string> {
  const token = readStoredAuthSession()?.tokens?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  async getNotesLibrary(): Promise<NoteSubmissionResult[]> {
    try {
      const response = await httpClient.get<BackendNotesResponse>("/notes", {
        headers: authHeaders(),
      });
      return response.data.notes.map(toNoteSubmissionResult);
    } catch (error) {
      throw toApiError(error, { operation: "notes.getNotesLibrary" });
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
            headers: authHeaders(),
          })
        : await httpClient.post<BackendNoteResponse>("/notes", {
            body,
            headers: authHeaders(),
          });

      return toNoteSubmissionResult(response.data.note);
    } catch (error) {
      throw toApiError(error, { operation: existingId ? "notes.updateNote" : "notes.createNote" });
    }
  }

  async deleteNote(id: number): Promise<void> {
    try {
      await httpClient.delete(`/notes/${encodeURIComponent(String(id))}`, {
        headers: authHeaders(),
      });
    } catch (error) {
      throw toApiError(error, { operation: "notes.deleteNote" });
    }
  }
}
