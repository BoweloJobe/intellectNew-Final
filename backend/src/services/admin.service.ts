import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'

const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

export type AdminSafeUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAt: Date
  updatedAt: Date
}

export async function listUsers(): Promise<AdminSafeUser[]> {
  return prisma.user.findMany({
    select: safeUserSelect,
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateUserRole(
  currentAdminId: string,
  userId: string,
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN',
): Promise<AdminSafeUser> {
  if (currentAdminId === userId && role !== 'ADMIN') {
    throw new AppError(409, 'You cannot remove your own admin access')
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })

  if (!existing) {
    throw new AppError(404, 'User not found')
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: safeUserSelect,
  })
}
