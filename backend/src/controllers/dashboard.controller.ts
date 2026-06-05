import type { Request, Response, NextFunction } from 'express'
import * as DashboardService from '../services/dashboard.service.js'

// GET /api/dashboard/instructor
export async function getInstructorDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await DashboardService.getInstructorDashboard(req.user!.id)
    res.json({ status: 'ok', data })
  } catch (err) {
    next(err)
  }
}

// GET /api/dashboard/admin
export async function getAdminDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await DashboardService.getAdminDashboard()
    res.json({ status: 'ok', data })
  } catch (err) {
    next(err)
  }
}
