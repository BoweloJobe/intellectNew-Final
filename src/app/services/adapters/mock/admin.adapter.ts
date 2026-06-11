import type { AdminUser, AdminUserRole } from "../../../models/admin";
import type { AdminService } from "../../contracts/admin.contract";

function unavailable(): never {
  throw new Error("User management requires API mode.");
}

export class MockAdminAdapter implements AdminService {
  async listUsers(): Promise<AdminUser[]> {
    unavailable();
  }

  async updateUserRole(_userId: string, _role: AdminUserRole): Promise<AdminUser> {
    unavailable();
  }
}
