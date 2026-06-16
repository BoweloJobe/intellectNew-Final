import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  course: {
    findUnique: vi.fn(),
  },
  courseModule: {
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  lesson: {
    count: vi.fn(),
    create: vi.fn(),
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

import { createStandaloneLesson } from '../course.service.js'

const baseCourse = {
  id: 'course-1',
  title: 'Biology',
  description: 'Course description',
  category: 'Biology',
  difficulty: 'BEGINNER',
  thumbnailUrl: null,
  estimatedHours: null,
  price: 0,
  status: 'DRAFT',
  publishedAt: null,
  createdAt: new Date('2026-06-01T09:00:00.000Z'),
  instructorId: 'instructor-1',
  instructor: {
    id: 'instructor-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    avatarUrl: null,
  },
  rejectionReason: null,
}

describe('course standalone lesson service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.course.findUnique
      .mockResolvedValueOnce(baseCourse)
      .mockResolvedValueOnce({ ...baseCourse, modules: [] })
    mockPrisma.courseModule.findFirst.mockResolvedValue(null)
    mockPrisma.courseModule.count.mockResolvedValue(1)
    mockPrisma.courseModule.create.mockResolvedValue({ id: 'module-standalone' })
    mockPrisma.lesson.count.mockResolvedValue(0)
    mockPrisma.lesson.create.mockResolvedValue({ id: 'lesson-1' })
  })

  it('adds a standalone lesson to a draft course by creating the default module', async () => {
    await createStandaloneLesson(
      'course-1',
      { id: 'instructor-1', role: 'INSTRUCTOR' },
      { title: 'New lesson' },
    )

    expect(mockPrisma.courseModule.create).toHaveBeenCalledWith({
      data: {
        courseId: 'course-1',
        title: 'Standalone lessons',
        order: 1,
      },
      select: { id: true },
    })
    expect(mockPrisma.lesson.create).toHaveBeenCalledWith({
      data: {
        courseId: 'course-1',
        moduleId: 'module-standalone',
        title: 'New lesson',
        order: 0,
        estimatedMinutes: 20,
        isFree: false,
      },
    })
  })

  it('allows admins to add standalone lessons without being course owner', async () => {
    mockPrisma.course.findUnique
      .mockReset()
      .mockResolvedValueOnce({ ...baseCourse, instructorId: 'instructor-1' })
      .mockResolvedValueOnce({ ...baseCourse, modules: [] })
    mockPrisma.courseModule.findFirst.mockResolvedValue({ id: 'module-standalone' })

    await expect(createStandaloneLesson(
      'course-1',
      { id: 'admin-1', role: 'ADMIN' },
      {},
    )).resolves.toBeTruthy()
    expect(mockPrisma.courseModule.create).not.toHaveBeenCalled()
  })

  it('blocks unrelated instructors', async () => {
    await expect(createStandaloneLesson(
      'course-1',
      { id: 'other-instructor', role: 'INSTRUCTOR' },
      {},
    )).rejects.toMatchObject({ statusCode: 403, message: 'Access denied' })
    expect(mockPrisma.lesson.create).not.toHaveBeenCalled()
  })
})
