import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../errors/AppError.js'

const mockPrisma = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import { listUsers, updateUserRole } from '../admin.service.js'

describe('admin user management service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists users with safe fields only', async () => {
    const users = [
      {
        id: 'user-1',
        email: 'student@example.com',
        firstName: 'Sarah',
        lastName: 'Student',
        role: 'STUDENT',
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
        updatedAt: new Date('2026-06-01T10:00:00.000Z'),
      },
    ]
    mockPrisma.user.findMany.mockResolvedValue(users)

    await expect(listUsers()).resolves.toEqual(users)
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('updates a user role with safe returned fields only', async () => {
    const updatedUser = {
      id: 'user-1',
      email: 'teacher@example.com',
      firstName: 'Ivy',
      lastName: 'Instructor',
      role: 'INSTRUCTOR',
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    }
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    mockPrisma.user.update.mockResolvedValue(updatedUser)

    await expect(updateUserRole('admin-1', 'user-1', 'INSTRUCTOR')).resolves.toEqual(updatedUser)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'INSTRUCTOR' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  it('rejects self-demotion from admin', async () => {
    await expect(updateUserRole('admin-1', 'admin-1', 'STUDENT')).rejects.toMatchObject(
      new AppError(409, 'You cannot remove your own admin access'),
    )
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('returns 404 when the target user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    await expect(updateUserRole('admin-1', 'missing-user', 'ADMIN')).rejects.toMatchObject(
      new AppError(404, 'User not found'),
    )
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })
})
