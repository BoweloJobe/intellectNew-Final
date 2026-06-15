import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  course: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  courseModule: {
    findMany: vi.fn(),
  },
  lesson: {
    count: vi.fn(),
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

import { submitCourseForReview } from '../course.service.js'

const baseCourse = {
  id: 'course-1',
  instructorId: 'instructor-1',
  title: 'Cell Biology',
  description: 'A practical course about cells.',
  category: 'Biology',
  difficulty: 'BEGINNER',
  thumbnailUrl: null,
  estimatedHours: null,
  price: 0,
  status: 'DRAFT',
  publishedAt: null,
  createdAt: new Date('2026-06-01T09:00:00.000Z'),
  updatedAt: new Date('2026-06-01T09:00:00.000Z'),
}

function lesson(overrides = {}) {
  return {
    id: 'lesson-1',
    title: 'Cell structure',
    description: null,
    notes: null,
    videoUrl: null,
    videoUploadStatus: null,
    quiz: null,
    ...overrides,
  }
}

function moduleWithLessons(lessons = [lesson({ description: 'Learn the parts of a cell.' })]) {
  return [{ id: 'module-1', lessons }]
}

function updatedCourse(overrides = {}) {
  return {
    ...baseCourse,
    status: 'PENDING_REVIEW',
    instructor: { id: 'instructor-1', firstName: 'Ada', lastName: 'Lovelace', avatarUrl: null },
    modules: [],
    ...overrides,
  }
}

function setupSubmit({
  course = baseCourse,
  lessonCount = 1,
  modules = moduleWithLessons(),
} = {}) {
  mockPrisma.course.findUnique.mockResolvedValue(course)
  mockPrisma.lesson.count.mockResolvedValue(lessonCount)
  mockPrisma.courseModule.findMany.mockResolvedValue(modules)
  mockPrisma.course.update.mockResolvedValue(updatedCourse())
}

describe('course submit quality validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSubmit()
  })

  it('rejects courses with zero lessons', async () => {
    setupSubmit({ lessonCount: 0 })

    await expect(submitCourseForReview('course-1', 'instructor-1'))
      .rejects.toMatchObject({ statusCode: 422, message: 'Add at least one lesson before submitting for review' })
    expect(mockPrisma.course.update).not.toHaveBeenCalled()
  })

  it('rejects a course when no lesson has a meaningful title', async () => {
    setupSubmit({
      modules: moduleWithLessons([
        lesson({ title: '   ', description: 'This text is real content.' }),
      ]),
    })

    await expect(submitCourseForReview('course-1', 'instructor-1'))
      .rejects.toMatchObject({ statusCode: 422, message: 'Add a meaningful lesson title before submitting for review' })
    expect(mockPrisma.course.update).not.toHaveBeenCalled()
  })

  it('rejects a course with lessons but no meaningful learning content', async () => {
    setupSubmit({ modules: moduleWithLessons([lesson()]) })

    await expect(submitCourseForReview('course-1', 'instructor-1'))
      .rejects.toMatchObject({
        statusCode: 422,
        message: 'Add lesson learning content before submitting: attach a ready video, add notes or a description, or create a quiz question',
      })
    expect(mockPrisma.course.update).not.toHaveBeenCalled()
  })

  it('allows a course with a video lesson to submit', async () => {
    setupSubmit({
      modules: moduleWithLessons([
        lesson({ videoUrl: 'https://example.com/video.mp4', videoUploadStatus: 'READY' }),
      ]),
    })

    await expect(submitCourseForReview('course-1', 'instructor-1')).resolves.toMatchObject({
      status: 'PENDING_REVIEW',
    })
    expect(mockPrisma.course.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'PENDING_REVIEW', rejectionReason: null },
    }))
  })

  it('allows a course with text lesson content to submit', async () => {
    setupSubmit({
      modules: moduleWithLessons([
        lesson({ notes: 'These notes explain the cell membrane.' }),
      ]),
    })

    await expect(submitCourseForReview('course-1', 'instructor-1')).resolves.toMatchObject({
      status: 'PENDING_REVIEW',
    })
  })

  it('allows a course with a quiz-only lesson to submit', async () => {
    setupSubmit({
      modules: moduleWithLessons([
        lesson({ quiz: { questions: [{ id: 'question-1' }] } }),
      ]),
    })

    await expect(submitCourseForReview('course-1', 'instructor-1')).resolves.toMatchObject({
      status: 'PENDING_REVIEW',
    })
  })

  it('allows a rejected course to resubmit after content is fixed', async () => {
    setupSubmit({
      course: { ...baseCourse, status: 'REJECTED' },
      modules: moduleWithLessons([
        lesson({ description: 'The fixed lesson now explains the core topic.' }),
      ]),
    })

    await expect(submitCourseForReview('course-1', 'instructor-1')).resolves.toMatchObject({
      status: 'PENDING_REVIEW',
    })
    expect(mockPrisma.course.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'PENDING_REVIEW', rejectionReason: null },
    }))
  })

  it('still blocks non-owners before submission quality validation', async () => {
    setupSubmit({ course: { ...baseCourse, instructorId: 'other-instructor' } })

    await expect(submitCourseForReview('course-1', 'instructor-1'))
      .rejects.toMatchObject({ statusCode: 403, message: 'Access denied' })
    expect(mockPrisma.lesson.count).not.toHaveBeenCalled()
    expect(mockPrisma.course.update).not.toHaveBeenCalled()
  })
})
