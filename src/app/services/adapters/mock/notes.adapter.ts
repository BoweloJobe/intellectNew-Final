import { notesLibraryMock } from "../../../mocks/notes.mock";
import type { NotesService } from "../../contracts/notes.contract";
import { withMockDelay } from "../../mock-utils";

export class MockNotesAdapter implements NotesService {
  async getNotesLibrary() {
    return withMockDelay(notesLibraryMock);
  }
}