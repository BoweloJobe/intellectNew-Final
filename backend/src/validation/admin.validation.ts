import { z } from 'zod'

export const adminUserRoleSchema = z.object({
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']),
})

export type AdminUserRoleInput = z.infer<typeof adminUserRoleSchema>
