import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import { bootstrapAdmin } from '../admin-bootstrap.service.js'

const strongPassword = 'Secur3!Launch!2026'

describe('admin bootstrap service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.findFirst.mockResolvedValue(null)
  })

  it('fails when email is missing', async () => {
    await expect(bootstrapAdmin({
      email: '',
      password: strongPassword,
    })).rejects.toThrow('ADMIN_EMAIL must be a valid email address.')
  })

  it('fails when email is invalid', async () => {
    await expect(bootstrapAdmin({
      email: 'not-an-email',
      password: strongPassword,
    })).rejects.toThrow('ADMIN_EMAIL must be a valid email address.')
  })

  it('fails when password is weak', async () => {
    await expect(bootstrapAdmin({
      email: 'ops@example.com',
      password: 'password',
    })).rejects.toThrow('ADMIN_PASSWORD must be at least 12 characters long.')
  })

  it('creates a new admin with a hashed password', async () => {
    mockPrisma.user.create.mockResolvedValue({ id: 'admin-1', email: 'ops@example.com' })

    const result = await bootstrapAdmin({
      email: 'OPS@Example.com',
      password: strongPassword,
      name: 'Olivia Operator',
    })

    expect(result).toEqual({ status: 'created', email: 'ops@example.com', userId: 'admin-1' })
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'ops@example.com',
        firstName: 'Olivia',
        lastName: 'Operator',
        role: 'ADMIN',
        isVerified: true,
        passwordHash: expect.any(String),
      }),
      select: { id: true, email: true },
    })
    const passwordHash = mockPrisma.user.create.mock.calls[0][0].data.passwordHash
    expect(passwordHash).not.toBe(strongPassword)
    await expect(bcrypt.compare(strongPassword, passwordHash)).resolves.toBe(true)
  })

  it('is idempotent when the existing user is already admin', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'ops@example.com',
      role: 'ADMIN',
    })

    await expect(bootstrapAdmin({
      email: 'ops@example.com',
      password: strongPassword,
    })).resolves.toEqual({ status: 'already_admin', email: 'ops@example.com', userId: 'admin-1' })

    expect(mockPrisma.user.create).not.toHaveBeenCalled()
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('does not promote an existing non-admin unless explicitly allowed', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      role: 'STUDENT',
    })

    await expect(bootstrapAdmin({
      email: 'student@example.com',
      password: strongPassword,
    })).resolves.toEqual({
      status: 'refused_existing_user',
      email: 'student@example.com',
      userId: 'user-1',
    })

    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('promotes an existing non-admin only when explicitly allowed', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      role: 'STUDENT',
    })
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
    })

    await expect(bootstrapAdmin({
      email: 'student@example.com',
      password: strongPassword,
      allowPromoteExisting: true,
    })).resolves.toEqual({
      status: 'promoted',
      email: 'student@example.com',
      userId: 'user-1',
    })

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'ADMIN', isVerified: true },
      select: { id: true, email: true },
    })
  })

  it('refuses to create another admin when an admin already exists', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'admin-1',
      email: 'existing-admin@example.com',
    })

    await expect(bootstrapAdmin({
      email: 'new-admin@example.com',
      password: strongPassword,
    })).rejects.toThrow('An admin account already exists.')

    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })
})
