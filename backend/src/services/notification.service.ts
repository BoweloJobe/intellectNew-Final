import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'
import type { NotificationPreferenceInput } from '../validation/notification.validation.js'

export type NotificationType =
  | 'ENROLLMENT_CONFIRMED'
  | 'COURSE_APPROVED'
  | 'COURSE_REJECTED'
  | 'QUIZ_PASSED'
  | 'QUIZ_FAILED'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_CANCELED'
  | 'SUBSCRIPTION_EXPIRED'

export type NotificationPreferenceDto = NotificationPreferenceInput

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceDto = {
  courseUpdates: true,
  quizReminders: true,
  assignmentDeadlines: true,
  communityActivity: false,
  weeklyProgressReport: true,
  emailNotifications: true,
}

function toPreferenceDto(preferences: NotificationPreferenceDto | null): NotificationPreferenceDto {
  if (!preferences) {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }

  return {
    courseUpdates: preferences.courseUpdates,
    quizReminders: preferences.quizReminders,
    assignmentDeadlines: preferences.assignmentDeadlines,
    communityActivity: preferences.communityActivity,
    weeklyProgressReport: preferences.weeklyProgressReport,
    emailNotifications: preferences.emailNotifications,
  }
}

function preferenceAllowsType(preferences: NotificationPreferenceDto, type: NotificationType): boolean {
  switch (type) {
    case 'QUIZ_PASSED':
    case 'QUIZ_FAILED':
      return preferences.quizReminders
    case 'COURSE_APPROVED':
    case 'COURSE_REJECTED':
      return preferences.courseUpdates
    default:
      return true
  }
}

async function getNotificationPreferencesForDelivery(userId: string): Promise<NotificationPreferenceDto> {
  const preferences = await prisma.notificationPreference.findUnique({ where: { userId } })
  return toPreferenceDto(preferences)
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const preferences = await getNotificationPreferencesForDelivery(userId)
  if (!preferenceAllowsType(preferences, type)) {
    return
  }

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

export async function getMyNotificationPreferences(userId: string): Promise<NotificationPreferenceDto> {
  const preferences = await prisma.notificationPreference.findUnique({ where: { userId } })
  return toPreferenceDto(preferences)
}

export async function saveMyNotificationPreferences(
  userId: string,
  input: NotificationPreferenceInput,
): Promise<NotificationPreferenceDto> {
  const preferences = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...input },
    update: input,
  })

  return toPreferenceDto(preferences)
}
