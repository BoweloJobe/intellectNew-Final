import { afterEach, describe, expect, it, vi } from 'vitest'

const baseProductionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/intellectx?schema=public',
  JWT_SECRET: 'production-secret-at-least-32-characters',
  FRONTEND_URL: 'https://app.example.com',
  ENABLE_PAYMENTS: 'true',
  PAYPAL_CLIENT_ID: 'paypal-client-id',
  PAYPAL_CLIENT_SECRET: 'paypal-client-secret',
  PAYPAL_MODE: 'live',
  ENABLE_VIDEO_UPLOADS: 'true',
  STORAGE_PROVIDER: 'SUPABASE',
  STORAGE_BUCKET: 'lesson-videos',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'supabase-service-role-key',
  ENABLE_EMAIL_DELIVERY: 'true',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_USER: 'smtp-user',
  SMTP_PASS: 'smtp-pass',
  SMTP_FROM: 'support@example.com',
}

async function importEnv(extraEnv: Record<string, string | undefined>) {
  vi.resetModules()
  process.env = { ...baseProductionEnv }
  for (const [key, value] of Object.entries(extraEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
  return import('./env.js')
}

describe('production env validation', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('fails when production JWT_SECRET is missing', async () => {
    await expect(importEnv({ JWT_SECRET: undefined })).rejects.toThrow('Missing required environment variable: JWT_SECRET')
  })

  it('fails when production DATABASE_URL is missing', async () => {
    await expect(importEnv({ DATABASE_URL: undefined })).rejects.toThrow('Missing required environment variable: DATABASE_URL')
  })

  it('fails when JWT_SECRET is too short', async () => {
    await expect(importEnv({ JWT_SECRET: 'too-short' })).rejects.toThrow('JWT_SECRET must be at least 32 characters long')
  })

  it('fails when PayPal config is missing and payments are enabled', async () => {
    await expect(importEnv({ PAYPAL_CLIENT_ID: undefined })).rejects.toThrow(
      'PAYPAL_CLIENT_ID is required in production when ENABLE_PAYMENTS=true.',
    )
  })

  it('fails when storage config is missing and video uploads are enabled', async () => {
    await expect(importEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined })).rejects.toThrow(
      'SUPABASE_SERVICE_ROLE_KEY is required in production when ENABLE_VIDEO_UPLOADS=true.',
    )
  })

  it('fails when SMTP config is missing and email delivery is enabled', async () => {
    await expect(importEnv({ SMTP_HOST: undefined })).rejects.toThrow(
      'SMTP_HOST is required in production when ENABLE_EMAIL_DELIVERY=true.',
    )
  })

  it('allows development to omit disabled feature configs', async () => {
    const { env } = await importEnv({
      NODE_ENV: 'development',
      ENABLE_PAYMENTS: undefined,
      PAYPAL_CLIENT_ID: undefined,
      PAYPAL_CLIENT_SECRET: undefined,
      ENABLE_VIDEO_UPLOADS: undefined,
      STORAGE_PROVIDER: undefined,
      STORAGE_BUCKET: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      ENABLE_EMAIL_DELIVERY: undefined,
      SMTP_HOST: undefined,
      SMTP_PORT: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      SMTP_FROM: undefined,
    })

    expect(env.ENABLE_PAYMENTS).toBe(false)
    expect(env.ENABLE_VIDEO_UPLOADS).toBe(false)
    expect(env.ENABLE_EMAIL_DELIVERY).toBe(false)
  })

  it('allows test to omit disabled feature configs', async () => {
    const { env } = await importEnv({
      NODE_ENV: 'test',
      ENABLE_PAYMENTS: undefined,
      PAYPAL_CLIENT_ID: undefined,
      PAYPAL_CLIENT_SECRET: undefined,
      ENABLE_VIDEO_UPLOADS: undefined,
      STORAGE_PROVIDER: undefined,
      STORAGE_BUCKET: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      ENABLE_EMAIL_DELIVERY: undefined,
      SMTP_HOST: undefined,
      SMTP_PORT: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      SMTP_FROM: undefined,
    })

    expect(env.NODE_ENV).toBe('test')
  })

  it('does not allow development reset-token logging in production', async () => {
    await expect(importEnv({ ALLOW_DEV_RESET_LINK_LOGGING: 'true' })).rejects.toThrow(
      'ALLOW_DEV_RESET_LINK_LOGGING cannot be enabled in production.',
    )
  })

  it('allows production to explicitly disable a feature without provider config', async () => {
    const { env } = await importEnv({
      ENABLE_PAYMENTS: 'false',
      PAYPAL_CLIENT_ID: undefined,
      PAYPAL_CLIENT_SECRET: undefined,
    })

    expect(env.ENABLE_PAYMENTS).toBe(false)
  })
})
