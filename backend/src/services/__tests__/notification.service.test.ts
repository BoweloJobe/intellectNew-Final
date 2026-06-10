import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  notification: {
    create: vi.fn(),
  },
  notificationPreference: {
    findUnique: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import { createNotification } from '../notification.service.js'

const disabledCourseUpdates = {
  courseUpdates: false,
  quizReminders: true,
  assignmentDeadlines: true,
  communityActivity: false,
  weeklyProgressReport: true,
  emailNotifications: true,
}

const disabledQuizReminders = {
  courseUpdates: true,
  quizReminders: false,
  assignmentDeadlines: true,
  communityActivity: false,
  weeklyProgressReport: true,
  emailNotifications: true,
}

describe('notification service delivery preferences', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('suppresses optional course update notifications when courseUpdates is false', async () => {
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(disabledCourseUpdates)

    await createNotification('user-1', 'COURSE_APPROVED', 'Course approved', 'Your course was approved.')

    expect(mockPrisma.notificationPreference.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(mockPrisma.notification.create).not.toHaveBeenCalled()
  })

  it('suppresses quiz notifications when quizReminders is false', async () => {
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(disabledQuizReminders)

    await createNotification('user-1', 'QUIZ_PASSED', 'Quiz passed', 'You passed the quiz.')

    expect(mockPrisma.notification.create).not.toHaveBeenCalled()
  })

  it('delivers mandatory system notifications even when courseUpdates is false', async () => {
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(disabledCourseUpdates)

    await createNotification('user-1', 'SUBSCRIPTION_EXPIRED', 'Subscription expired', 'Your subscription expired.')

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'SUBSCRIPTION_EXPIRED',
        title: 'Subscription expired',
        body: 'Your subscription expired.',
        metadata: undefined,
      },
    })
  })

  it('delivers notifications by default when no preference row exists', async () => {
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(null)

    await createNotification('user-1', 'COURSE_REJECTED', 'Course needs changes', 'Please update your course.')

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'COURSE_REJECTED',
        title: 'Course needs changes',
        body: 'Please update your course.',
        metadata: undefined,
      },
    })
  })
})
