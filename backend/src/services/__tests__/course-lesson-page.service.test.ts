import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  lesson: {
    findUnique: vi.fn(),
  },
  enrollment: {
    findUnique: vi.fn(),
  },
  courseModule: {
    findMany: vi.fn(),
  },
  lessonWatchProgress: {
    findMany: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))
vi.mock('../notification.service.js', () => ({ fireNotification: vi.fn() }))
vi.mock('../../lib/storage.js', () => ({
  assertLessonVideoStorageKey: vi.fn(),
  buildPublicVideoUrl: vi.fn(),
  generateUploadIntent: vi.fn(),
  verifyStoredVideoExists: vi.fn(),
}))

import { getLessonPageForUser } from '../course.service.js'

const instructor = {
  id: 'instructor-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: null,
}

const lesson = {
  id: 'lesson-1',
  moduleId: 'module-1',
  courseId: 'course-1',
  title: 'Cells',
  description: 'Cell lesson',
  notes: 'Notes',
  videoUrl: 'https://example.com/video',
  videoDurationSecs: 600,
  estimatedMinutes: 10,
  order: 1,
  isFree: false,
  quiz: { id: 'quiz-1' },
  createdAt: new Date('2026-06-01T10:00:00.000Z'),
  updatedAt: new Date('2026-06-01T10:00:00.000Z'),
}

describe('course lesson page service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes saved watch progress for enrolled users', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({
      ...lesson,
      module: {
        id: 'module-1',
        title: 'Basics',
        order: 0,
        course: {
          id: 'course-1',
          title: 'Biology',
          category: 'Biology',
          difficulty: 'BEGINNER',
          thumbnailUrl: null,
          status: 'APPROVED',
          instructorId: 'instructor-1',
          instructor,
        },
      },
    })
    mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enrollment-1' })
    mockPrisma.courseModule.findMany.mockResolvedValue([
      {
        id: 'module-1',
        title: 'Basics',
        order: 0,
        lessons: [lesson],
      },
    ])
    mockPrisma.lessonWatchProgress.findMany.mockResolvedValue([
      {
        lessonId: 'lesson-1',
        watchedSeconds: 180,
        lastPositionSeconds: 90,
        updatedAt: new Date('2026-06-02T10:00:00.000Z'),
      },
    ])

    const result = await getLessonPageForUser('lesson-1', { id: 'student-1', role: 'STUDENT' })

    expect(mockPrisma.lessonWatchProgress.findMany).toHaveBeenCalledWith({
      where: { userId: 'student-1', courseId: 'course-1' },
      select: {
        lessonId: true,
        watchedSeconds: true,
        lastPositionSeconds: true,
        updatedAt: true,
      },
    })
    expect(result.lesson?.watchProgress).toEqual({
      lessonId: 'lesson-1',
      watchedSeconds: 180,
      lastPositionSeconds: 90,
      updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    })
  })
})
