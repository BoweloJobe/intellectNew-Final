type NodeEnv = 'development' | 'test' | 'production'
type StorageProvider = 'SUPABASE' | 'S3' | 'LOCAL'
type PayPalMode = 'sandbox' | 'live'
type EnvSource = NodeJS.ProcessEnv

function required(source: EnvSource, key: string): string {
  const value = source[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function requiredWhen(source: EnvSource, key: string, reason: string): string {
  const value = source[key]
  if (!value) {
    throw new Error(`${key} is required ${reason}.`)
  }
  return value
}

function optional(source: EnvSource, key: string, fallback: string): string {
  return source[key] ?? fallback
}

function optionalRaw(source: EnvSource, key: string): string | undefined {
  return source[key] || undefined
}

function parseNodeEnv(source: EnvSource): NodeEnv {
  const nodeEnv = optional(source, 'NODE_ENV', 'development')
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be one of: development, test, production')
  }
  return nodeEnv as NodeEnv
}

function parseBooleanFlag(source: EnvSource, key: string, fallback: boolean): boolean {
  const raw = optionalRaw(source, key)
  if (raw === undefined) return fallback
  if (raw === 'true') return true
  if (raw === 'false') return false
  throw new Error(`${key} must be "true" or "false"`)
}

function parseInteger(value: string, key: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} must be a valid integer`)
  }
  return parsed
}

const validStorageProviders = ['SUPABASE', 'S3', 'LOCAL'] as const

export function createEnv(source: EnvSource = process.env) {
  const NODE_ENV = parseNodeEnv(source)
  const isProduction = NODE_ENV === 'production'
  const jwtSecret = required(source, 'JWT_SECRET')
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
  }

  const ENABLE_PAYMENTS = parseBooleanFlag(source, 'ENABLE_PAYMENTS', isProduction)
  const ENABLE_VIDEO_UPLOADS = parseBooleanFlag(source, 'ENABLE_VIDEO_UPLOADS', isProduction)
  const ENABLE_EMAIL_DELIVERY = parseBooleanFlag(source, 'ENABLE_EMAIL_DELIVERY', isProduction)
  const allowDevResetLinkLogging = parseBooleanFlag(source, 'ALLOW_DEV_RESET_LINK_LOGGING', false)

  if (NODE_ENV === 'production' && allowDevResetLinkLogging) {
    throw new Error('ALLOW_DEV_RESET_LINK_LOGGING cannot be enabled in production.')
  }

  const rawStorageProvider = optionalRaw(source, 'STORAGE_PROVIDER')
  if (rawStorageProvider && !(validStorageProviders as readonly string[]).includes(rawStorageProvider)) {
    throw new Error(`STORAGE_PROVIDER must be one of: ${validStorageProviders.join(', ')}`)
  }

  const rawPayPalMode = optional(source, 'PAYPAL_MODE', 'sandbox')
  if (!['sandbox', 'live'].includes(rawPayPalMode)) {
    throw new Error('PAYPAL_MODE must be one of: sandbox, live')
  }

  if (ENABLE_PAYMENTS) {
    requiredWhen(source, 'PAYPAL_CLIENT_ID', 'in production when ENABLE_PAYMENTS=true')
    requiredWhen(source, 'PAYPAL_CLIENT_SECRET', 'in production when ENABLE_PAYMENTS=true')
  }

  if (ENABLE_VIDEO_UPLOADS) {
    requiredWhen(source, 'STORAGE_PROVIDER', 'in production when ENABLE_VIDEO_UPLOADS=true')
    requiredWhen(source, 'STORAGE_BUCKET', 'in production when ENABLE_VIDEO_UPLOADS=true')
    requiredWhen(source, 'SUPABASE_URL', 'in production when ENABLE_VIDEO_UPLOADS=true')
    requiredWhen(source, 'SUPABASE_SERVICE_ROLE_KEY', 'in production when ENABLE_VIDEO_UPLOADS=true')
    if (source.STORAGE_PROVIDER !== 'SUPABASE') {
      throw new Error('STORAGE_PROVIDER must be SUPABASE when ENABLE_VIDEO_UPLOADS=true.')
    }
  }

  if (ENABLE_EMAIL_DELIVERY) {
    requiredWhen(source, 'SMTP_HOST', 'in production when ENABLE_EMAIL_DELIVERY=true')
    requiredWhen(source, 'SMTP_PORT', 'in production when ENABLE_EMAIL_DELIVERY=true')
    requiredWhen(source, 'SMTP_USER', 'in production when ENABLE_EMAIL_DELIVERY=true')
    requiredWhen(source, 'SMTP_PASS', 'in production when ENABLE_EMAIL_DELIVERY=true')
    requiredWhen(source, 'SMTP_FROM', 'in production when ENABLE_EMAIL_DELIVERY=true')
    requiredWhen(source, 'FRONTEND_URL', 'in production when ENABLE_EMAIL_DELIVERY=true')
  }

  return {
    NODE_ENV,
    PORT: parseInteger(optional(source, 'PORT', '4000'), 'PORT'),
    DATABASE_URL: required(source, 'DATABASE_URL'),
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: optional(source, 'JWT_EXPIRES_IN', '7d'),
    FRONTEND_URL: optional(source, 'FRONTEND_URL', 'http://localhost:5173'),
    ENABLE_PAYMENTS,
    ENABLE_VIDEO_UPLOADS,
    ENABLE_EMAIL_DELIVERY,
    SMTP_HOST: optionalRaw(source, 'SMTP_HOST'),
    SMTP_PORT: source.SMTP_PORT ? parseInteger(source.SMTP_PORT, 'SMTP_PORT') : 587,
    SMTP_USER: optionalRaw(source, 'SMTP_USER'),
    SMTP_PASS: optionalRaw(source, 'SMTP_PASS'),
    SMTP_FROM: optional(source, 'SMTP_FROM', 'noreply@intellectx.app'),
    ALLOW_DEV_RESET_LINK_LOGGING: allowDevResetLinkLogging,
    PAYPAL_CLIENT_ID: optionalRaw(source, 'PAYPAL_CLIENT_ID'),
    PAYPAL_CLIENT_SECRET: optionalRaw(source, 'PAYPAL_CLIENT_SECRET'),
    PAYPAL_MODE: rawPayPalMode as PayPalMode,
    PAYPAL_PLAN_ID_MONTHLY: optionalRaw(source, 'PAYPAL_PLAN_ID_MONTHLY'),
    PAYPAL_PLAN_ID_ANNUAL: optionalRaw(source, 'PAYPAL_PLAN_ID_ANNUAL'),
    SUBSCRIPTION_MONTHLY_PRICE: optional(source, 'SUBSCRIPTION_MONTHLY_PRICE', '9.99'),
    SUBSCRIPTION_ANNUAL_PRICE: optional(source, 'SUBSCRIPTION_ANNUAL_PRICE', '99.99'),
    STORAGE_PROVIDER: rawStorageProvider as StorageProvider | undefined,
    STORAGE_BASE_URL: optionalRaw(source, 'STORAGE_BASE_URL'),
    STORAGE_BUCKET: optionalRaw(source, 'STORAGE_BUCKET'),
    SUPABASE_URL: optionalRaw(source, 'SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: optionalRaw(source, 'SUPABASE_SERVICE_ROLE_KEY'),
  } as const
}

export const env = createEnv()
