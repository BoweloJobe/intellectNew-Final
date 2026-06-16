import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  course: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  courseModule: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  lesson: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  lessonProgress: {
    count: vi.fn(),
  },
}))

const mockStorage = vi.hoisted(() => ({
  assertLessonVideoStorageKey: vi.fn(),
  buildPublicVideoUrl: vi.fn(),
  generateUploadIntent: vi.fn(),
  verifyStoredVideoExists: vi.fn(),
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))
vi.mock('../notification.service.js', () => ({ fireNotification: vi.fn() }))
vi.mock('../../lib/storage.js', () => mockStorage)

import {
  attachLessonVideo,
  createLesson,
  createModule,
  createStandaloneLesson,
  deleteLesson,
  deleteModule,
  requestLessonVideoUpload,
  updateCourse,
  updateLesson,
  updateModule,
} from '../course.service.js'

const READ_ONLY_MESSAGE = 'Approved courses are read-only. Create a revision before changing live content.'

function course(status = 'APPROVED', instructorId = 'instructor-1') {
  return {
    id: 'course-1',
    instructorId,
    title: 'Live Biology',
    description: 'A live course',
    category: 'Biology',
    difficulty: 'BEGINNER',
    thumbnailUrl: null,
    estimatedHours: null,
    price: 0,
    status,
    publishedAt: status === 'APPROVED' ? new Date('2026-06-01T00:00:00.000Z') : null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  }
}

function moduleRecord(status = 'APPROVED', instructorId = 'instructor-1') {
  return {
    id: 'module-1',
    courseId: 'course-1',
    title: 'Module',
    order: 0,
    course: { instructorId, status },
  }
}

function lessonRecord(status = 'APPROVED', instructorId = 'instructor-1') {
  return {
    id: 'lesson-1',
    courseId: 'course-1',
    moduleId: 'module-1',
    title: 'Lesson',
    module: {
      course: { instructorId, status },
    },
  }
}

function expectReadOnly(promise: Promise<unknown>) {
  return expect(promise).rejects.toMatchObject({ statusCode: 409, message: READ_ONLY_MESSAGE })
}

describe('approved course read-only policy', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPrisma.course.findUnique.mockResolvedValue(course())
    mockPrisma.course.update.mockResolvedValue(course('DRAFT'))
    mockPrisma.courseModule.findUnique.mockResolvedValue(moduleRecord())
    mockPrisma.courseModule.findFirst.mockResolvedValue({ id: 'module-1' })
    mockPrisma.courseModule.count.mockResolvedValue(0)
    mockPrisma.courseModule.create.mockResolvedValue(moduleRecord('DRAFT'))
    mockPrisma.courseModule.update.mockResolvedValue(moduleRecord('DRAFT'))
    mockPrisma.lesson.findUnique.mockResolvedValue(lessonRecord())
    mockPrisma.lesson.create.mockResolvedValue(lessonRecord('DRAFT'))
    mockPrisma.lesson.update.mockResolvedValue(lessonRecord('DRAFT'))
    mockPrisma.lessonProgress.count.mockResolvedValue(0)
    mockStorage.generateUploadIntent.mockResolvedValue({
      storageKey: 'courses/course-1/modules/module-1/lessons/lesson-1/video.mp4',
      uploadUrl: 'https://storage.example/upload',
      uploadMethod: 'PUT',
      uploadHeaders: { 'content-type': 'video/mp4' },
      provider: 'SUPABASE',
      expiresAt: '2026-06-16T00:15:00.000Z',
    })
    mockStorage.buildPublicVideoUrl.mockReturnValue('https://storage.example/video.mp4')
  })

  it('instructor cannot update approved course metadata', async () => {
    await expectReadOnly(updateCourse('course-1', 'instructor-1', { title: 'Changed' }))
    expect(mockPrisma.course.update).not.toHaveBeenCalled()
  })

  it('instructor cannot add module to approved course', async () => {
    await expectReadOnly(createModule('course-1', 'instructor-1', { title: 'New module', order: 1 }))
    expect(mockPrisma.courseModule.create).not.toHaveBeenCalled()
  })

  it('instructor cannot update or delete module in approved course', async () => {
    await expectReadOnly(updateModule('module-1', 'instructor-1', { title: 'Changed' }))
    await expectReadOnly(deleteModule('module-1', 'instructor-1'))
    expect(mockPrisma.courseModule.update).not.toHaveBeenCalled()
    expect(mockPrisma.courseModule.delete).not.toHaveBeenCalled()
  })

  it('instructor cannot add lesson to approved course', async () => {
    await expectReadOnly(createLesson('module-1', 'course-1', 'instructor-1', {
      title: 'New lesson',
      order: 0,
    }))
    expect(mockPrisma.lesson.create).not.toHaveBeenCalled()
  })

  it('instructor cannot add standalone lesson to approved course', async () => {
    await expectReadOnly(createStandaloneLesson('course-1', { id: 'instructor-1', role: 'INSTRUCTOR' }, {
      title: 'Standalone',
    }))
    expect(mockPrisma.lesson.create).not.toHaveBeenCalled()
  })

  it('instructor cannot update or delete lesson in approved course', async () => {
    await expectReadOnly(updateLesson('lesson-1', 'instructor-1', { title: 'Changed' }))
    await expectReadOnly(deleteLesson('lesson-1', 'instructor-1'))
    expect(mockPrisma.lesson.update).not.toHaveBeenCalled()
    expect(mockPrisma.lesson.delete).not.toHaveBeenCalled()
  })

  it('instructor cannot request or attach video for approved course lesson', async () => {
    await expectReadOnly(requestLessonVideoUpload(
      'course-1',
      'module-1',
      'lesson-1',
      { id: 'instructor-1', role: 'INSTRUCTOR' },
      { filename: 'video.mp4', mimeType: 'video/mp4', fileSizeBytes: 1000 },
    ))
    await expectReadOnly(attachLessonVideo(
      'course-1',
      'module-1',
      'lesson-1',
      { id: 'instructor-1', role: 'INSTRUCTOR' },
      { videoStorageKey: 'courses/course-1/modules/module-1/lessons/lesson-1/video.mp4' },
    ))
    expect(mockStorage.generateUploadIntent).not.toHaveBeenCalled()
    expect(mockStorage.verifyStoredVideoExists).not.toHaveBeenCalled()
  })

  it('draft and rejected course mutations still work', async () => {
    mockPrisma.course.findUnique.mockResolvedValueOnce(course('DRAFT'))
    await expect(createModule('course-1', 'instructor-1', { title: 'Draft module', order: 0 }))
      .resolves.toMatchObject({ id: 'module-1' })

    mockPrisma.course.findUnique.mockResolvedValueOnce(course('REJECTED'))
    await expect(updateCourse('course-1', 'instructor-1', { title: 'Fixed course' }))
      .resolves.toMatchObject({ id: 'course-1' })

    expect(mockPrisma.courseModule.create).toHaveBeenCalled()
    expect(mockPrisma.course.update).toHaveBeenCalled()
  })

  it('non-owner still gets forbidden, not conflict', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(course('APPROVED', 'other-instructor'))

    await expect(updateCourse('course-1', 'instructor-1', { title: 'Changed' }))
      .rejects.toMatchObject({ statusCode: 403, message: 'Access denied' })
    expect(mockPrisma.course.update).not.toHaveBeenCalled()
  })
})
