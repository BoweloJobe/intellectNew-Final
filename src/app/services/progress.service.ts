import type { ProgressPageData } from "../models/progress";
import { getProgressService } from "./factory/service-registry";

export async function getProgressPageData(): Promise<ProgressPageData> {
  return getProgressService().getProgressPageData();
}
