import type {
  AdminDashboardData,
  InstructorDashboardData,
  StudentDashboardData,
} from "../../models/dashboard";

export interface DashboardService {
  getStudentDashboardData(): Promise<StudentDashboardData>;
  getAdminDashboardData(): Promise<AdminDashboardData>;
  getInstructorDashboardData(): Promise<InstructorDashboardData>;
}