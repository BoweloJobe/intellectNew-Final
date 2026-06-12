import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { AppError } from '../errors/AppError.js'

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
}

export function canLogDevResetLinks(): boolean {
  return env.NODE_ENV !== 'production' && env.ALLOW_DEV_RESET_LINK_LOGGING
}

function createTransport(): nodemailer.Transporter {
  if (isEmailDeliveryConfigured()) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  }

  // Non-production fallback for tests/local development. It never logs message
  // contents unless ALLOW_DEV_RESET_LINK_LOGGING=true and NODE_ENV is not production.
  return nodemailer.createTransport({ jsonTransport: true })
}

const transporter = createTransport()

interface SendMailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const message = {
    from: env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  }

  if (!isEmailDeliveryConfigured()) {
    if (env.NODE_ENV === 'production') {
      throw new AppError(503, 'Email delivery is not configured')
    }
    console.warn('[Mailer] SMTP not configured; email suppressed.')
    console.warn('[Mailer] To:', message.to)
    console.warn('[Mailer] Subject:', message.subject)
    if (canLogDevResetLinks()) {
      console.warn('[Mailer][development-only] Body:', message.text ?? message.html)
    }
    return
  }

  await transporter.sendMail(message)
}

export function passwordResetHtml(resetUrl: string): string {
  return `
    <p>You requested a password reset for your IntellectX account.</p>
    <p><a href="${resetUrl}">Click here to reset your password</a></p>
    <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
  `
}
