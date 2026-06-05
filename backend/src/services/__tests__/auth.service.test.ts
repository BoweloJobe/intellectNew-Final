import crypto from 'node:crypto'
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

import { requestPasswordReset, resetPassword } from '../auth.service.js'

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
})
