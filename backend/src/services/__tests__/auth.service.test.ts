import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../errors/AppError.js'

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  passwordResetToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const mockSendMail = vi.hoisted(() => vi.fn())

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))
vi.mock('../../lib/mailer.js', () => ({
  sendMail: mockSendMail,
  passwordResetHtml: (resetUrl: string) => `<a href="${resetUrl}">Reset</a>`,
}))

import { changePassword, getMe, requestPasswordReset, resetPassword, updateProfile } from '../auth.service.js'

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

describe('auth password reset service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => ops)
    process.env.NODE_ENV = 'development'
  })

  it('stores only a hash of the raw reset token while sending the raw token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
    })
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.passwordResetToken.create.mockResolvedValue({})

    const result = await requestPasswordReset({ email: 'student@example.com' })
    const rawToken = result.resetToken

    expect(rawToken).toEqual(expect.any(String))
    expect(rawToken).toHaveLength(64)
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        token: sha256Hex(rawToken!),
        expiresAt: expect.any(Date),
      }),
    })
    expect(mockPrisma.passwordResetToken.create.mock.calls[0][0].data.token).not.toBe(rawToken)
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'student@example.com',
        text: expect.stringContaining(rawToken!),
      }),
    )
  })

  it('resets the password when the raw submitted token matches the stored token hash', async () => {
    const rawToken = 'raw-reset-token'
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      token: sha256Hex(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    })
    mockPrisma.user.update.mockResolvedValue({})
    mockPrisma.passwordResetToken.update.mockResolvedValue({})

    await resetPassword({ token: rawToken, password: 'new-password-123' })

    expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { token: sha256Hex(rawToken) },
    })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: expect.any(String) },
    })
    expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { usedAt: expect.any(Date) },
    })
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('fails when the raw submitted token does not match a stored hash', async () => {
    const rawToken = 'invalid-reset-token'
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null)

    await expect(resetPassword({ token: rawToken, password: 'new-password-123' })).rejects.toMatchObject(
      new AppError(400, 'Reset token is invalid or has expired'),
    )
    expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { token: sha256Hex(rawToken) },
    })
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('keeps expired token behavior unchanged', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      token: sha256Hex('expired-token'),
      expiresAt: new Date(Date.now() - 60_000),
      usedAt: null,
    })

    await expect(resetPassword({ token: 'expired-token', password: 'new-password-123' })).rejects.toMatchObject(
      new AppError(400, 'Reset token is invalid or has expired'),
    )
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('updates a user profile and keeps the same email when provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'STUDENT',
      avatarUrl: null,
      isVerified: true,
      createdAt: new Date(),
    })
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      firstName: 'Sara',
      lastName: 'Jameson',
      role: 'STUDENT',
      avatarUrl: null,
      bio: 'Biology student',
      institution: 'Example University',
      isVerified: true,
      createdAt: new Date(),
    })

    const result = await updateProfile('user-1', {
      firstName: 'Sara',
      lastName: 'Jameson',
      email: 'student@example.com',
      bio: 'Biology student',
      institution: 'Example University',
    })

    expect(result).toEqual(
      expect.objectContaining({
        id: 'user-1',
        email: 'student@example.com',
        firstName: 'Sara',
        lastName: 'Jameson',
        bio: 'Biology student',
        institution: 'Example University',
      }),
    )
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        firstName: 'Sara',
        lastName: 'Jameson',
        bio: 'Biology student',
        institution: 'Example University',
      },
    })
  })

  it('returns profile fields from getMe', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'STUDENT',
      avatarUrl: null,
      bio: 'Biology student',
      institution: 'Example University',
      isVerified: true,
      createdAt: new Date(),
    })

    const result = await getMe('user-1')

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } })
    expect(result).toEqual(expect.objectContaining({
      bio: 'Biology student',
      institution: 'Example University',
    }))
  })

  it('rejects profile updates that attempt to change email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'STUDENT',
      avatarUrl: null,
      isVerified: true,
      createdAt: new Date(),
    })

    await expect(
      updateProfile('user-1', {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'new-email@example.com',
        bio: 'Bio content',
        institution: 'Example University',
      }),
    ).rejects.toMatchObject(
      new AppError(
        400,
        'Email cannot be changed from this settings page. Please use the dedicated email change workflow.',
      ),
    )
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('rejects password change when current password is wrong', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: await bcrypt.hash('password123', 4),
    })

    await expect(
      changePassword('user-1', {
        currentPassword: 'wrong-password',
        newPassword: 'new-password-123',
      }),
    ).rejects.toMatchObject(new AppError(400, 'Current password is incorrect'))
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('rejects password change when new password matches current password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: await bcrypt.hash('password123', 4),
    })

    await expect(
      changePassword('user-1', {
        currentPassword: 'password123',
        newPassword: 'password123',
      }),
    ).rejects.toMatchObject(new AppError(400, 'New password must be different from current password'))
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('updates password hash after a valid password change', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: await bcrypt.hash('password123', 4),
    })
    mockPrisma.user.update.mockResolvedValue({})

    await changePassword('user-1', {
      currentPassword: 'password123',
      newPassword: 'new-password-123',
    })

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: expect.any(String) },
    })
    const nextHash = mockPrisma.user.update.mock.calls[0][0].data.passwordHash
    await expect(bcrypt.compare('password123', nextHash)).resolves.toBe(false)
    await expect(bcrypt.compare('new-password-123', nextHash)).resolves.toBe(true)
  })
})
