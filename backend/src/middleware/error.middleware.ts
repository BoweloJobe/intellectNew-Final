import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError.js'

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  })
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    })
    return
  }

  const isDev = process.env.NODE_ENV === 'development'
  console.error('[Error]', err)

  res.status(500).json({
    status: 'error',
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  })
}
