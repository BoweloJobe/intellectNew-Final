import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as AuthController from '../controllers/auth.controller.js'

const router = Router()

router.post('/signup', AuthController.signup)
router.post('/login', AuthController.login)
router.get('/me', requireAuth, AuthController.getMe)
router.post('/logout', requireAuth, AuthController.logout)
router.post('/forgot-password/request', AuthController.requestPasswordReset)
router.post('/forgot-password/reset', AuthController.resetPassword)

export default router
