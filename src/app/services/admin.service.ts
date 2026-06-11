import type { AdminUser, AdminUserRole } from "../models/admin";
import { getAdminService } from "./factory/service-registry";

export async function getAdminUsers(): Promise<AdminUser[]> {
  return getAdminService().listUsers();
}

export async function updateAdminUserRole(userId: string, role: AdminUserRole): Promise<AdminUser> {
  return getAdminService().updateUserRole(userId, role);
}
