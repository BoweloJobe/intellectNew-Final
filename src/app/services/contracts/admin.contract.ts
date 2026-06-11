import type { AdminUser, AdminUserRole } from "../../models/admin";

export interface AdminService {
  listUsers(): Promise<AdminUser[]>;
  updateUserRole(userId: string, role: AdminUserRole): Promise<AdminUser>;
}
