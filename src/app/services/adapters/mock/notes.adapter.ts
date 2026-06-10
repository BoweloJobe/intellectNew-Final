import { notesLibraryMock } from "../../../mocks/notes.mock";
import type { NoteFormInput, NoteSubmissionResult } from "../../form-flows.service";
import type { NotesListParams, NotesService, PaginatedNotesResult } from "../../contracts/notes.contract";
import { withMockDelay } from "../../mock-utils";
import { normalizeRequiredTextInput } from "../../../utils/form-validation";

export class MockNotesAdapter implements NotesService {
  private notes: NoteSubmissionResult[] = [...notesLibraryMock];

  async getNotesLibrary(params?: NotesListParams) {
    const result = await this.listNotes(params);
    return result.items;
  }

  async listNotes(params: NotesListParams = {}): Promise<PaginatedNotesResult> {
    const search = params.search?.trim().toLowerCase();
    const course = params.course?.trim();
    const tag = params.tag?.trim();
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);
    const filteredNotes = this.notes.filter((note) => {
      const matchesSearch =
        !search || note.title.toLowerCase().includes(search) || note.content.toLowerCase().includes(search);
      const matchesCourse = !course || note.course === course;
      const matchesTag = !tag || note.tags.includes(tag);
      const matchesStarred = params.starred === undefined || note.starred === params.starred;

      return matchesSearch && matchesCourse && matchesTag && matchesStarred;
    });
    const total = filteredNotes.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    return withMockDelay({
      items: filteredNotes.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  }

  async saveNote(input: NoteFormInput, existingId?: number): Promise<NoteSubmissionResult> {
    await withMockDelay(null, 650);

    const normalizedTitle = normalizeRequiredTextInput(input.title);
    const normalizedContent = normalizeRequiredTextInput(input.content);
    const normalizedCourse = normalizeRequiredTextInput(input.course);

    if (normalizedContent.length < 20) {
      throw new Error("Add a bit more detail so this note is useful to revisit later.");
    }

    const note = {
      id: existingId ?? Date.now(),
      title: normalizedTitle,
      content: normalizedContent,
      course: normalizedCourse,
      tags: input.tags,
      starred: input.starred,
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };

    this.notes = [note, ...this.notes.filter((item) => item.id !== note.id)];
    return note;
  }

  async deleteNote(id: number): Promise<void> {
    await withMockDelay(null, 250);
    this.notes = this.notes.filter((note) => note.id !== id);
  }
}
