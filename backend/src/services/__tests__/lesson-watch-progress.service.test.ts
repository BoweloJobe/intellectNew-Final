import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../errors/AppError.js'

const mockPrisma = vi.hoisted(() => ({
  enrollment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  lesson: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  lessonProgress: {
    upsert: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  lessonWatchProgress: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))
vi.mock('../../services/notification.service.js', () => ({ fireNotification: vi.fn() }))

import { updateLessonWatchProgress } from '../enrollment.service.js'

describe('lesson watch progress service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects missing lessons', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(null)

    await expect(updateLessonWatchProgress('user-1', 'lesson-1', { watchedSeconds: 10 }))
      .rejects.toMatchObject(new AppError(404, 'Lesson not found'))
  })

  it('rejects users who are not enrolled in the lesson course', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({ id: 'lesson-1', courseId: 'course-1' })
    mockPrisma.enrollment.findUnique.mockResolvedValue(null)

    await expect(updateLessonWatchProgress('user-1', 'lesson-1', { watchedSeconds: 10 }))
      .rejects.toMatchObject(new AppError(403, 'Not enrolled in this course'))
  })

  it('creates watch progress for an enrolled user', async () => {
    const updatedAt = new Date()
    mockPrisma.lesson.findUnique.mockResolvedValue({ id: 'lesson-1', courseId: 'course-1' })
    mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enrollment-1', completedAt: null })
    mockPrisma.lessonWatchProgress.findUnique.mockResolvedValue(null)
    mockPrisma.lessonWatchProgress.upsert.mockResolvedValue({
      lessonId: 'lesson-1',
      courseId: 'course-1',
      watchedSeconds: 30,
      lastPositionSeconds: 12,
      updatedAt,
    })

    await expect(updateLessonWatchProgress('user-1', 'lesson-1', {
      watchedSeconds: 30,
      lastPositionSeconds: 12,
    })).resolves.toEqual({
      lessonId: 'lesson-1',
      courseId: 'course-1',
      watchedSeconds: 30,
      lastPositionSeconds: 12,
      updatedAt,
    })

    expect(mockPrisma.lessonWatchProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        userId: 'user-1',
        lessonId: 'lesson-1',
        courseId: 'course-1',
        watchedSeconds: 30,
        lastPositionSeconds: 12,
      }),
    }))
  })

  it('does not decrease watchedSeconds on update', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({ id: 'lesson-1', courseId: 'course-1' })
    mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enrollment-1', completedAt: null })
    mockPrisma.lessonWatchProgress.findUnique.mockResolvedValue({ watchedSeconds: 120 })
    mockPrisma.lessonWatchProgress.upsert.mockResolvedValue({
      lessonId: 'lesson-1',
      courseId: 'course-1',
      watchedSeconds: 120,
      lastPositionSeconds: 20,
      updatedAt: new Date(),
    })

    await updateLessonWatchProgress('user-1', 'lesson-1', {
      watchedSeconds: 60,
      lastPositionSeconds: 20,
    })

    expect(mockPrisma.lessonWatchProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({
        watchedSeconds: 120,
        lastPositionSeconds: 20,
      }),
    }))
  })

  it('delegates completion to the existing lesson completion flow', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({ id: 'lesson-1', courseId: 'course-1' })
    mockPrisma.enrollment.findUnique
      .mockResolvedValueOnce({ id: 'enrollment-1', completedAt: null })
      .mockResolvedValueOnce({ id: 'enrollment-1', completedAt: null })
    mockPrisma.lessonWatchProgress.findUnique.mockResolvedValue(null)
    mockPrisma.lessonWatchProgress.upsert.mockResolvedValue({
      lessonId: 'lesson-1',
      courseId: 'course-1',
      watchedSeconds: 30,
      lastPositionSeconds: 30,
      updatedAt: new Date(),
    })
    mockPrisma.lesson.findFirst.mockResolvedValue({ id: 'lesson-1', courseId: 'course-1' })
    mockPrisma.lessonProgress.upsert.mockResolvedValue({})
    mockPrisma.lesson.count.mockResolvedValue(1)
    mockPrisma.lessonProgress.count.mockResolvedValue(1)
    mockPrisma.enrollment.update.mockResolvedValue({ completedAt: new Date() })
    mockPrisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 'lesson-1', completedAt: new Date() }])

    await updateLessonWatchProgress('user-1', 'lesson-1', {
      watchedSeconds: 30,
      lastPositionSeconds: 30,
      completed: true,
    })

    expect(mockPrisma.lessonProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_lessonId: { userId: 'user-1', lessonId: 'lesson-1' } },
    }))
  })
})
