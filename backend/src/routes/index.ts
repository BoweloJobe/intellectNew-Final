import { Router } from 'express'
import { healthController } from '../controllers/health.controller.js'
import authRouter from './auth.routes.js'
import courseRouter from './course.routes.js'
import adminRouter from './admin.routes.js'
import enrollmentRouter from './enrollment.routes.js'
import quizRouter from './quiz.routes.js'
import paymentRouter from './payment.routes.js'
import notificationRouter from './notification.routes.js'
import subscriptionRouter from './subscription.routes.js'
import dashboardRouter from './dashboard.routes.js'
import communityRouter from './community.routes.js'
import notesRouter from './notes.routes.js'

const router = Router()

router.get('/health', healthController)
router.use('/auth', authRouter)
router.use('/courses', courseRouter)
router.use('/admin', adminRouter)
router.use('/enrollments', enrollmentRouter)
router.use('/content', quizRouter)
router.use('/payments', paymentRouter)
router.use('/notifications', notificationRouter)
router.use('/subscriptions', subscriptionRouter)
router.use('/dashboard', dashboardRouter)
router.use('/community', communityRouter)
router.use('/notes', notesRouter)

export default router
