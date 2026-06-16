import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'

const BCRYPT_ROUNDS = 12

export type AdminBootstrapStatus =
  | 'created'
  | 'already_admin'
  | 'promoted'
  | 'refused_existing_user'

export interface BootstrapAdminInput {
  email: string
  password: string
  name?: string
  allowPromoteExisting?: boolean
}

export interface BootstrapAdminResult {
  status: AdminBootstrapStatus
  email: string
  userId?: string
}

export async function bootstrapAdmin(input: BootstrapAdminInput): Promise<BootstrapAdminResult> {
  const email = normalizeAndValidateEmail(input.email)
  assertStrongAdminPassword(input.password, email)
  const { firstName, lastName } = parseAdminName(input.name)

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  })

  if (existingUser?.role === 'ADMIN') {
    return { status: 'already_admin', email, userId: existingUser.id }
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true, email: true },
  })

  if (existingAdmin && existingAdmin.email.toLowerCase() !== email) {
    throw new Error('An admin account already exists. Use the admin UI or documented role-management process for additional admins.')
  }

  if (existingUser) {
    if (!input.allowPromoteExisting) {
      return { status: 'refused_existing_user', email, userId: existingUser.id }
    }

    const promoted = await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: 'ADMIN', isVerified: true },
      select: { id: true, email: true },
    })
    return { status: 'promoted', email: promoted.email, userId: promoted.id }
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  const created = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
    },
    select: { id: true, email: true },
  })

  return { status: 'created', email: created.email, userId: created.id }
}

function normalizeAndValidateEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.')
  }
  return normalized
}

function parseAdminName(name: string | undefined): { firstName: string; lastName: string } {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (parts.length === 0) {
    return { firstName: 'Initial', lastName: 'Admin' }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Admin' }
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

function assertStrongAdminPassword(password: string, email: string): void {
  if (!password) {
    throw new Error('ADMIN_PASSWORD is required.')
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long.')
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error('ADMIN_PASSWORD must include uppercase, lowercase, number, and symbol characters.')
  }

  const lowerPassword = password.toLowerCase()
  const localPart = email.split('@')[0]
  const weakFragments = ['password', 'admin', 'intellectx', 'changeme', 'default', localPart]
  if (weakFragments.some((fragment) => fragment.length >= 4 && lowerPassword.includes(fragment.toLowerCase()))) {
    throw new Error('ADMIN_PASSWORD must not contain common words, the app name, or the email local part.')
  }
}
