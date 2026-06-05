import { Request, Response } from 'express'

export function healthController(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'intellectx-api',
  })
}
