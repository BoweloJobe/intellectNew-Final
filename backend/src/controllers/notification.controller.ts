import type { Request, Response, NextFunction } from 'express'
import * as NotificationService from '../services/notification.service.js'
import { validate } from '../lib/validate.js'
import { notificationPreferenceSchema } from '../validation/notification.validation.js'

// GET /api/notifications/my
export async function getMyNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const page = Number(req.query['page']) || 1
    const limit = Number(req.query['limit']) || 30
    const result = await NotificationService.getMyNotifications(userId, page, limit)
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}

// GET /api/notifications/unread-count
export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const count = await NotificationService.getUnreadCount(userId)
    res.status(200).json({ data: { unreadCount: count } })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/notifications/:id/read
export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    await NotificationService.markRead(req.params['id']!, userId)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

// POST /api/notifications/read-all
export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    await NotificationService.markAllRead(userId)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

// GET /api/notifications/preferences
export async function getMyPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const preferences = await NotificationService.getMyNotificationPreferences(req.user!.id)
    res.status(200).json({ data: { preferences } })
  } catch (err) {
    next(err)
  }
}

// PUT /api/notifications/preferences
export async function saveMyPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validate(notificationPreferenceSchema, req.body)
    const preferences = await NotificationService.saveMyNotificationPreferences(req.user!.id, input)
    res.status(200).json({ data: { preferences } })
  } catch (err) {
    next(err)
  }
}
