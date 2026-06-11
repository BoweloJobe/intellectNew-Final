import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as AdminController from '../controllers/admin.controller.js'
import * as PaymentController from '../controllers/payment.controller.js'
import * as SubscriptionController from '../controllers/subscription.controller.js'

const router = Router()
const isAdmin = [requireAuth, requireRole('ADMIN')]

router.get('/users', ...isAdmin, AdminController.listUsers)
router.patch('/users/:id/role', ...isAdmin, AdminController.updateUserRole)
router.get('/courses/queue', ...isAdmin, AdminController.getQueue)
router.post('/courses/:id/approve', ...isAdmin, AdminController.approveCourse)
router.post('/courses/:id/reject', ...isAdmin, AdminController.rejectCourse)
router.get('/payments', ...isAdmin, PaymentController.getPayments)
router.get('/subscriptions', ...isAdmin, SubscriptionController.listSubscriptions)
router.post('/subscriptions/:id/activate', ...isAdmin, SubscriptionController.adminActivateSubscription)

export default router
