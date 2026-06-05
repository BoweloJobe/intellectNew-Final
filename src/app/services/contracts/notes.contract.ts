import type { NoteSubmissionResult } from "../form-flows.service";

export interface NotesService {
  getNotesLibrary(): Promise<NoteSubmissionResult[]>;
}