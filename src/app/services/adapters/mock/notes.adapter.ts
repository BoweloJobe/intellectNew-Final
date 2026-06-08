import { notesLibraryMock } from "../../../mocks/notes.mock";
import type { NoteFormInput, NoteSubmissionResult } from "../../form-flows.service";
import type { NotesService } from "../../contracts/notes.contract";
import { withMockDelay } from "../../mock-utils";
import { normalizeRequiredTextInput } from "../../../utils/form-validation";

export class MockNotesAdapter implements NotesService {
  private notes: NoteSubmissionResult[] = [...notesLibraryMock];

  async getNotesLibrary() {
    return withMockDelay([...this.notes]);
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
