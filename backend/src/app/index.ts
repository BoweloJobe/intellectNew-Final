import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import apiRouter from '../routes/index.js'
import { notFoundHandler, errorHandler } from '../middleware/error.middleware.js'

// Strict limiter for auth endpoints (login, signup, password-reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

// General API limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

export function createApp(): express.Express {
  const app = express()

  // Security headers
  app.use(helmet())

  // CORS — restricted to the frontend origin
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  )

  // Request logging (dev: concise, production: Apache combined for log aggregators)
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  // Body parsing with size cap (prevents payload-flooding attacks)
  app.use(express.json({ limit: '10kb' }))
  app.use(express.urlencoded({ extended: true, limit: '10kb' }))

  // Rate limiting — apply strict limiter to auth before global router
  app.use('/api/auth', authLimiter)
  app.use('/api', globalLimiter)

  // API routes
  app.use('/api', apiRouter)

  // 404 + error handling (order matters — keep at the bottom)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
