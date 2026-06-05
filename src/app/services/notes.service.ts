import type { NoteSubmissionResult } from "./form-flows.service";
import { getNotesService } from "./factory/service-registry";

export async function getNotesLibrary(): Promise<NoteSubmissionResult[]> {
  return getNotesService().getNotesLibrary();
}
