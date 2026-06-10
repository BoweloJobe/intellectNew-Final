import type { NoteFormInput, NoteSubmissionResult } from "../form-flows.service";

export type NotesListParams = {
  search?: string;
  course?: string;
  tag?: string;
  starred?: boolean;
  page?: number;
  pageSize?: number;
};

export type PaginatedNotesResult = {
  items: NoteSubmissionResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export interface NotesService {
  getNotesLibrary(params?: NotesListParams): Promise<NoteSubmissionResult[]>;
  listNotes(params?: NotesListParams): Promise<PaginatedNotesResult>;
  saveNote(input: NoteFormInput, existingId?: number): Promise<NoteSubmissionResult>;
  deleteNote(id: number): Promise<void>;
}
