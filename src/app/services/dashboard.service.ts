import type {
  AdminDashboardData,
  InstructorDashboardData,
  StudentDashboardData,
} from "../models/dashboard";
import { getDashboardService } from "./factory/service-registry";

export async function getStudentDashboardData(): Promise<StudentDashboardData> {
  return getDashboardService().getStudentDashboardData();
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  return getDashboardService().getAdminDashboardData();
}

export async function getInstructorDashboardData(): Promise<InstructorDashboardData> {
  return getDashboardService().getInstructorDashboardData();
}
