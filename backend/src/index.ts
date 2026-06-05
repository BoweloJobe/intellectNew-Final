import 'dotenv/config'
import { createApp } from './app/index.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'

async function bootstrap(): Promise<void> {
  // Verify database connectivity before accepting traffic
  await prisma.$connect()
  console.log('[DB] Connected')

  const app = createApp()

  app.listen(env.PORT, () => {
    console.log(`[Server] Running on http://localhost:${env.PORT} (${env.NODE_ENV})`)
  })
}

bootstrap().catch((err) => {
  console.error('[Fatal] Failed to start server:', err)
  process.exit(1)
})
