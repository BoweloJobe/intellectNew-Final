import { afterEach, describe, expect, it, vi } from 'vitest'

const mockSendMail = vi.hoisted(() => vi.fn())
const mockCreateTransport = vi.hoisted(() => vi.fn(() => ({ sendMail: mockSendMail })))

vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
  createTransport: mockCreateTransport,
}))

const baseEnv = {
  DATABASE_URL: 'file:./test.db',
  JWT_SECRET: 'test-secret-at-least-32-characters-long',
  FRONTEND_URL: 'https://app.example.test',
}

async function importMailer(extraEnv: Record<string, string | undefined>) {
  vi.resetModules()
  process.env = { ...process.env, ...baseEnv }
  for (const [key, value] of Object.entries(extraEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
  return import('./mailer.js')
}

describe('mailer reset-link logging safety', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('does not log reset links by default when SMTP is missing in development', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { sendMail } = await importMailer({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      ALLOW_DEV_RESET_LINK_LOGGING: undefined,
    })

    await sendMail({
      to: 'student@example.com',
      subject: 'Reset',
      html: '<a href="https://app.example.test/reset-password?token=secret">Reset</a>',
      text: 'https://app.example.test/reset-password?token=secret',
    })

    const output = warnSpy.mock.calls.flat().join(' ')
    expect(output).toContain('SMTP not configured')
    expect(output).not.toContain('secret')
    expect(output).not.toContain('/reset-password?token=')
  })

  it('allows explicit development-only reset link logging outside production', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { sendMail } = await importMailer({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      ALLOW_DEV_RESET_LINK_LOGGING: 'true',
    })

    await sendMail({
      to: 'student@example.com',
      subject: 'Reset',
      html: '<a href="https://app.example.test/reset-password?token=secret">Reset</a>',
      text: 'https://app.example.test/reset-password?token=secret',
    })

    const output = warnSpy.mock.calls.flat().join(' ')
    expect(output).toContain('[development-only] Body')
    expect(output).toContain('/reset-password?token=secret')
  })

  it('fails closed without logging reset links when SMTP is missing in production', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const { sendMail } = await importMailer({
      NODE_ENV: 'production',
      SMTP_HOST: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      ALLOW_DEV_RESET_LINK_LOGGING: 'true',
    })

    await expect(sendMail({
      to: 'student@example.com',
      subject: 'Reset',
      html: '<a href="https://app.example.test/reset-password?token=secret">Reset</a>',
      text: 'https://app.example.test/reset-password?token=secret',
    })).rejects.toMatchObject({
      statusCode: 503,
      message: 'Email delivery is not configured',
    })

    expect(warnSpy).not.toHaveBeenCalled()
    expect(logSpy).not.toHaveBeenCalled()
  })

  it('sends through configured SMTP without console reset-link output', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { sendMail } = await importMailer({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
      SMTP_FROM: 'support@example.com',
    })

    await sendMail({
      to: 'student@example.com',
      subject: 'Reset',
      html: '<a href="https://app.example.test/reset-password?token=secret">Reset</a>',
      text: 'https://app.example.test/reset-password?token=secret',
    })

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'student@example.com',
      subject: 'Reset',
    }))
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
