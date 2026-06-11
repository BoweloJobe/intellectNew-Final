export type AdminUserRole = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminUserRole;
  createdAt: string;
  updatedAt: string;
}
