import type { NoteFormInput, NoteSubmissionResult } from "./form-flows.service";
import { getNotesService } from "./factory/service-registry";

export async function getNotesLibrary(): Promise<NoteSubmissionResult[]> {
  return getNotesService().getNotesLibrary();
}

export async function saveNote(input: NoteFormInput, existingId?: number): Promise<NoteSubmissionResult> {
  return getNotesService().saveNote(input, existingId);
}

export async function deleteNote(id: number): Promise<void> {
  return getNotesService().deleteNote(id);
}
