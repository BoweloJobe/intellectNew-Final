import type { NoteFormInput, NoteSubmissionResult } from "../form-flows.service";

export interface NotesService {
  getNotesLibrary(): Promise<NoteSubmissionResult[]>;
  saveNote(input: NoteFormInput, existingId?: number): Promise<NoteSubmissionResult>;
  deleteNote(id: number): Promise<void>;
}
