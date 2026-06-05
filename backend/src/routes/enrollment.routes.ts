import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as EnrollmentController from '../controllers/enrollment.controller.js'

const router = Router()

// All enrollment routes require auth
router.use(requireAuth)

router.post('/courses/:courseId/enroll', EnrollmentController.enroll)
router.get('/my', EnrollmentController.getMyEnrollments)
router.get('/courses/:courseId/progress', EnrollmentController.getCourseProgress)
router.post('/lessons/:lessonId/complete', EnrollmentController.markLessonComplete)

export default router
