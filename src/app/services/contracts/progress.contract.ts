import type { ProgressPageData } from "../../models/progress";

export interface ProgressService {
  getProgressPageData(): Promise<ProgressPageData>;
}