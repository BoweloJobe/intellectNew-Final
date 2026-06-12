function required(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

function optionalRaw(key: string): string | undefined {
  return process.env[key] || undefined
}

const jwtSecret = required('JWT_SECRET')
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long')
}

const validStorageProviders = ['SUPABASE', 'S3', 'LOCAL'] as const
const rawStorageProvider = optionalRaw('STORAGE_PROVIDER')
if (rawStorageProvider && !(validStorageProviders as readonly string[]).includes(rawStorageProvider)) {
  throw new Error(`STORAGE_PROVIDER must be one of: ${validStorageProviders.join(', ')}`)
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development') as 'development' | 'test' | 'production',
  PORT: parseInt(optional('PORT', '4000'), 10),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:5173'),
  // SMTP — all optional; falls back to console-log in development when absent
  SMTP_HOST: optionalRaw('SMTP_HOST'),
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  SMTP_USER: optionalRaw('SMTP_USER'),
  SMTP_PASS: optionalRaw('SMTP_PASS'),
  SMTP_FROM: optional('SMTP_FROM', 'noreply@intellectx.app'),
  // PayPal — optional; mock mode used when absent in development
  PAYPAL_CLIENT_ID: optionalRaw('PAYPAL_CLIENT_ID'),
  PAYPAL_CLIENT_SECRET: optionalRaw('PAYPAL_CLIENT_SECRET'),
  PAYPAL_MODE: optional('PAYPAL_MODE', 'sandbox') as 'sandbox' | 'live',
  // PayPal Subscription billing plan IDs (created in PayPal dashboard)
  PAYPAL_PLAN_ID_MONTHLY: optionalRaw('PAYPAL_PLAN_ID_MONTHLY'),
  PAYPAL_PLAN_ID_ANNUAL: optionalRaw('PAYPAL_PLAN_ID_ANNUAL'),
  // Subscription pricing (display + checkout reference)
  SUBSCRIPTION_MONTHLY_PRICE: optional('SUBSCRIPTION_MONTHLY_PRICE', '9.99'),
  SUBSCRIPTION_ANNUAL_PRICE: optional('SUBSCRIPTION_ANNUAL_PRICE', '99.99'),
  // Storage — optional at boot, but video upload endpoints fail closed unless configured.
  STORAGE_PROVIDER: rawStorageProvider as 'SUPABASE' | 'S3' | 'LOCAL' | undefined,
  STORAGE_BASE_URL: optionalRaw('STORAGE_BASE_URL'),   // e.g. https://xxx.supabase.co  OR  https://s3.amazonaws.com
  STORAGE_BUCKET: optionalRaw('STORAGE_BUCKET'),       // bucket / storage-bucket name
  SUPABASE_URL: optionalRaw('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: optionalRaw('SUPABASE_SERVICE_ROLE_KEY'),
} as const
