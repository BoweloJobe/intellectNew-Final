import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'

export type NotificationType =
  | 'ENROLLMENT_CONFIRMED'
  | 'COURSE_APPROVED'
  | 'COURSE_REJECTED'
  | 'QUIZ_PASSED'
  | 'QUIZ_FAILED'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_CANCELED'
  | 'SUBSCRIPTION_EXPIRED'

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, title, body, metadata: metadata !== undefined ? JSON.stringify(metadata) : undefined },
  })
}

/**
 * Fire-and-forget wrapper — logs errors but never throws.
 * Use this inside domain services so notifications never block a response.
 */
export function fireNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: Record<string, unknown>,
): void {
  createNotification(userId, type, title, body, metadata).catch((err) =>
    console.error('[Notification] Failed to create:', err),
  )
}

export async function getMyNotifications(userId: string, page = 1, limit = 30) {
  const skip = (page - 1) * Math.min(limit, 100)
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(limit, 100),
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        metadata: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])
  return { notifications, unreadCount }
}

export async function markRead(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } })
  if (!notification) throw new AppError(404, 'Notification not found')
  if (notification.userId !== userId) throw new AppError(403, 'Access denied')
  await prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } })
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } })
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } })
}
