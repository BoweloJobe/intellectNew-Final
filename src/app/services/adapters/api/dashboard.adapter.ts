import type { DashboardService } from "../../contracts/dashboard.contract";
import type {
  AdminDashboardData,
  InstructorDashboardData,
  StudentDashboardData,
} from "../../../models/dashboard";
import { httpClient, toApiError } from "../../../api";

type BackendStudentDashboardResponse = { status: string; data: StudentDashboardData };
type BackendInstructorDashboardResponse = { status: string; data: InstructorDashboardData };
type BackendAdminDashboardResponse = { status: string; data: AdminDashboardData };

export class ApiDashboardAdapter implements DashboardService {
  async getStudentDashboardData(): Promise<StudentDashboardData> {
    try {
      const resp = await httpClient.get<BackendStudentDashboardResponse>(
        "/dashboard/student",
      );
      return resp.data;
    } catch (error) {
      throw toApiError(error, { operation: "dashboard.getStudentDashboardData" });
    }
  }

  async getInstructorDashboardData(): Promise<InstructorDashboardData> {
    try {
      const resp = await httpClient.get<BackendInstructorDashboardResponse>(
        "/dashboard/instructor",
      );
      return resp.data;
    } catch (error) {
      throw toApiError(error, { operation: "dashboard.getInstructorDashboardData" });
    }
  }

  async getAdminDashboardData(): Promise<AdminDashboardData> {
    try {
      const resp = await httpClient.get<BackendAdminDashboardResponse>(
        "/dashboard/admin",
      );
      return resp.data;
    } catch (error) {
      throw toApiError(error, { operation: "dashboard.getAdminDashboardData" });
    }
  }
}
