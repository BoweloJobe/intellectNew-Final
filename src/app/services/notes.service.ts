import type { NoteFormInput, NoteSubmissionResult } from "./form-flows.service";
import type { NotesListParams, PaginatedNotesResult } from "./contracts/notes.contract";
import { getNotesService } from "./factory/service-registry";

export async function getNotesLibrary(params?: NotesListParams): Promise<NoteSubmissionResult[]> {
  return getNotesService().getNotesLibrary(params);
}

export async function listNotes(params?: NotesListParams): Promise<PaginatedNotesResult> {
  return getNotesService().listNotes(params);
}

export async function saveNote(input: NoteFormInput, existingId?: number): Promise<NoteSubmissionResult> {
  return getNotesService().saveNote(input, existingId);
}

export async function deleteNote(id: number): Promise<void> {
  return getNotesService().deleteNote(id);
}
