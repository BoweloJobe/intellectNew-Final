import 'dotenv/config'
import { bootstrapAdmin } from '../services/admin-bootstrap.service.js'
import { prisma } from '../lib/prisma.js'

function readFlag(name: string): string | undefined {
  const prefix = `--${name}=`
  const exact = `--${name}`
  const index = process.argv.findIndex((arg) => arg === exact || arg.startsWith(prefix))
  if (index === -1) return undefined
  const value = process.argv[index]
  if (value.startsWith(prefix)) return value.slice(prefix.length)
  const next = process.argv[index + 1]
  return next && !next.startsWith('--') ? next : undefined
}

function readBooleanFlag(name: string, envKey: string): boolean {
  if (process.argv.includes(`--${name}`)) return true
  const cliValue = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(`--${name}=`.length)
  if (cliValue === 'true') return true
  if (cliValue === 'false') return false
  if (cliValue !== undefined) {
    throw new Error(`--${name} must be "true" or "false" when a value is provided.`)
  }
  const raw = process.env[envKey]
  if (raw === undefined) return false
  if (raw === 'true') return true
  if (raw === 'false') return false
  throw new Error(`${envKey} must be "true" or "false".`)
}

async function main(): Promise<void> {
  const result = await bootstrapAdmin({
    email: readFlag('email') ?? process.env.ADMIN_EMAIL ?? '',
    password: readFlag('password') ?? process.env.ADMIN_PASSWORD ?? '',
    name: readFlag('name') ?? process.env.ADMIN_NAME,
    allowPromoteExisting: readBooleanFlag('promote-existing', 'ADMIN_PROMOTE_EXISTING'),
  })

  switch (result.status) {
    case 'created':
      console.log(`Created admin account for ${result.email}.`)
      return
    case 'already_admin':
      console.log(`User ${result.email} is already an admin. No changes made.`)
      return
    case 'promoted':
      console.log(`Promoted existing user ${result.email} to admin.`)
      return
    case 'refused_existing_user':
      console.error(`User ${result.email} already exists and is not an admin. Re-run with ADMIN_PROMOTE_EXISTING=true or --promote-existing to promote explicitly.`)
      process.exitCode = 1
      return
  }
}

main()
  .catch((err) => {
    console.error(`[Admin bootstrap] ${err instanceof Error ? err.message : String(err)}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
