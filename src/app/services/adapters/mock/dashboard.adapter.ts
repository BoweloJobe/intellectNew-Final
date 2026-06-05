import {
  adminDashboardMock,
  instructorDashboardMock,
  studentDashboardMock,
} from "../../../mocks/dashboard.mock";
import type { DashboardService } from "../../contracts/dashboard.contract";
import { withMockDelay } from "../../mock-utils";

export class MockDashboardAdapter implements DashboardService {
  async getStudentDashboardData() {
    return withMockDelay(studentDashboardMock);
  }

  async getAdminDashboardData() {
    return withMockDelay(adminDashboardMock);
  }

  async getInstructorDashboardData() {
    return withMockDelay(instructorDashboardMock);
  }
}