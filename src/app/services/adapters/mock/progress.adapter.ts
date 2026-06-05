import { progressPageMock } from "../../../mocks/progress.mock";
import type { ProgressService } from "../../contracts/progress.contract";
import { withMockDelay } from "../../mock-utils";

export class MockProgressAdapter implements ProgressService {
  async getProgressPageData() {
    return withMockDelay(progressPageMock);
  }
}