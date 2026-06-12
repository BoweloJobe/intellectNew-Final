import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import { getPendingCourses } from '../course.service.js'

describe('course moderation queue service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns pending courses with nested modules and lessons for admin review', async () => {
    const pendingCourses = [
      {
        id: 'course-1',
        title: 'Cell Biology',
        description: 'A practical course about cells.',
        category: 'Biology',
        difficulty: 'BEGINNER',
        thumbnailUrl: null,
        estimatedHours: 4,
        price: 49.99,
        status: 'PENDING_REVIEW',
        publishedAt: null,
        createdAt: new Date('2026-06-08T10:00:00.000Z'),
        updatedAt: new Date('2026-06-09T10:00:00.000Z'),
        rejectionReason: null,
        instructor: {
          id: 'instructor-1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          avatarUrl: null,
        },
        modules: [
          {
            id: 'module-1',
            title: 'Basics',
            order: 0,
            lessons: [
              {
                id: 'lesson-1',
                title: 'Cells',
                description: 'Intro',
                notes: 'Notes',
                videoUrl: 'https://example.com/video.mp4',
                videoDurationSecs: 600,
                estimatedMinutes: 10,
                order: 0,
                isFree: true,
                videoProvider: 'URL',
                videoUploadStatus: 'READY',
                createdAt: new Date('2026-06-08T10:00:00.000Z'),
                updatedAt: new Date('2026-06-08T10:00:00.000Z'),
                quiz: {
                  id: 'quiz-1',
                  timeLimitSeconds: 600,
                  questions: [],
                },
              },
            ],
          },
        ],
      },
    ]

    mockPrisma.course.findMany.mockResolvedValue(pendingCourses)

    await expect(getPendingCourses()).resolves.toEqual(pendingCourses)
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PENDING_REVIEW' },
        orderBy: { updatedAt: 'asc' },
        select: expect.objectContaining({
          modules: expect.objectContaining({
            select: expect.objectContaining({
              lessons: expect.objectContaining({
                select: expect.objectContaining({
                  title: true,
                  videoUrl: true,
                  quiz: expect.objectContaining({
                    select: expect.objectContaining({
                      id: true,
                      questions: expect.any(Object),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    )
  })
})
