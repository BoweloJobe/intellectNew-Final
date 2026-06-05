import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import type { User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/token.js'
import { sendMail, passwordResetHtml } from '../lib/mailer.js'
import { AppError } from '../errors/AppError.js'
import { env } from '../config/env.js'
import type { UserProfile, AuthResponse } from '../types/auth.types.js'
import type {
  SignupInput,
  LoginInput,
  RequestResetInput,
  ResetPasswordInput,
} from '../validation/auth.validation.js'

const BCRYPT_ROUNDS = 12
const RESET_TOKEN_EXPIRES_HOURS = 1

function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  }
}

export async function signup(input: SignupInput): Promise<AuthResponse> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) throw new AppError(409, 'An account with this email already exists')

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  // Only STUDENT and INSTRUCTOR are self-assignable roles; ADMIN cannot be
  // self-assigned — any other value (including absence) defaults to STUDENT.
  const role = input.role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT'
  const user = await prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      role,
    },
  })

  const token = signToken({ id: user.id, email: user.email, role: user.role })
  return { token, user: toUserProfile(user) }
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  // Constant-time response for wrong email or wrong password
  if (!user) throw new AppError(401, 'Invalid email or password')

  const valid = await bcrypt.compare(input.password, user.passwordHash)
  if (!valid) throw new AppError(401, 'Invalid email or password')

  const token = signToken({ id: user.id, email: user.email, role: user.role })
  return { token, user: toUserProfile(user) }
}

export async function getMe(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError(404, 'User not found')
  return toUserProfile(user)
}

export async function requestPasswordReset(
  input: RequestResetInput,
): Promise<{ message: string; resetToken?: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } })

  // Always return the same message to prevent email enumeration
  if (!user) {
    return { message: 'If an account with that email exists, a reset link has been sent.' }
  }

  // Invalidate any previous unused tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`
  await sendMail({
    to: user.email,
    subject: 'Reset your IntellectX password',
    html: passwordResetHtml(resetUrl),
    text: `Reset your password here: ${resetUrl} (expires in 1 hour)`,
  })

  const isDev = process.env.NODE_ENV === 'development'
  return {
    message: 'If an account with that email exists, a reset link has been sent.',
    ...(isDev && { resetToken: token }),
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token: input.token },
  })

  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    throw new AppError(400, 'Reset token is invalid or has expired')
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ])
}
