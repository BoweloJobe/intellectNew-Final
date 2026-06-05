import type { NotesService } from "../../contracts/notes.contract";

// No backend notes endpoint exists yet.
// Return empty rather than throwing so API mode degrades gracefully.
export class ApiNotesAdapter implements NotesService {
  async getNotesLibrary() {
    return [];
  }
}