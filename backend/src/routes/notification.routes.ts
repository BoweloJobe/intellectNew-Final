import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as NotificationController from '../controllers/notification.controller.js'

const router = Router()

// GET /api/notifications/my
router.get('/my', requireAuth, NotificationController.getMyNotifications)

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, NotificationController.getUnreadCount)

// GET /api/notifications/preferences
router.get('/preferences', requireAuth, NotificationController.getMyPreferences)

// PUT /api/notifications/preferences
router.put('/preferences', requireAuth, NotificationController.saveMyPreferences)

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, NotificationController.markAllRead)

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, NotificationController.markRead)

export default router
