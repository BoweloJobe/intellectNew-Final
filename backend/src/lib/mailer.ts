import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

function createTransport(): nodemailer.Transporter {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  }

  // Dev fallback — prints email to stdout instead of sending
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

  if (!env.SMTP_HOST || !env.SMTP_USER) {
    // No real SMTP configured — log to console in development
    console.log('[Mailer] SMTP not configured — email suppressed')
    console.log('[Mailer] To:', message.to)
    console.log('[Mailer] Subject:', message.subject)
    console.log('[Mailer] Body:', message.text ?? message.html)
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
