import { httpClient, toApiError } from "../../../api";
import type { AdminUser, AdminUserRole } from "../../../models/admin";
import type { AdminService } from "../../contracts/admin.contract";

type AdminUsersResponse = { status: string; data: { users: AdminUser[] } };
type AdminUserResponse = { status: string; data: { user: AdminUser } };

export class ApiAdminAdapter implements AdminService {
  async listUsers(): Promise<AdminUser[]> {
    try {
      const response = await httpClient.get<AdminUsersResponse>("/admin/users");
      return response.data.users;
    } catch (error) {
      throw toApiError(error, { operation: "admin.listUsers" });
    }
  }

  async updateUserRole(userId: string, role: AdminUserRole): Promise<AdminUser> {
    try {
      const response = await httpClient.patch<AdminUserResponse, { role: AdminUserRole }>(
        `/admin/users/${encodeURIComponent(userId)}/role`,
        { body: { role } },
      );
      return response.data.user;
    } catch (error) {
      throw toApiError(error, { operation: "admin.updateUserRole" });
    }
  }
}
