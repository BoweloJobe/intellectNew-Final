import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as DashboardController from '../controllers/dashboard.controller.js'

const router = Router()

router.get(
  '/student',
  requireAuth,
  DashboardController.getStudentDashboard,
)

// GET /api/dashboard/instructor — instructor/admin only
router.get(
  '/instructor',
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  DashboardController.getInstructorDashboard,
)

// GET /api/dashboard/admin — admin only
router.get(
  '/admin',
  requireAuth,
  requireRole('ADMIN'),
  DashboardController.getAdminDashboard,
)

export default router
