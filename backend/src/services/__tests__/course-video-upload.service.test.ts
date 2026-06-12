import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../errors/AppError.js'

const mockPrisma = vi.hoisted(() => ({
  lesson: {
    findUnique: vi.fn(),
    update: vi.fn(),
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

import { attachLessonVideo, requestLessonVideoUpload } from '../course.service.js'

function lessonRecord(overrides = {}) {
  return {
    id: 'lesson-1',
    courseId: 'course-1',
    moduleId: 'module-1',
    module: {
      course: { instructorId: 'instructor-1' },
    },
    ...overrides,
  }
}

const uploadInput = {
  filename: 'intro.mp4',
  mimeType: 'video/mp4' as const,
  fileSizeBytes: 1024,
}

describe('course video upload service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPrisma.lesson.findUnique.mockResolvedValue(lessonRecord())
    mockPrisma.lesson.update.mockResolvedValue(lessonRecord())
    mockStorage.generateUploadIntent.mockResolvedValue({
      storageKey: 'courses/course-1/modules/module-1/lessons/lesson-1/video.mp4',
      uploadUrl: 'https://storage.example/upload',
      uploadMethod: 'PUT',
      uploadHeaders: { 'content-type': 'video/mp4' },
      provider: 'SUPABASE',
      expiresAt: new Date('2026-06-12T10:00:00.000Z').toISOString(),
    })
    mockStorage.buildPublicVideoUrl.mockReturnValue('https://storage.example/public/video.mp4')
  })

  it('requires instructor owner or admin access before requesting upload', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(lessonRecord({
      module: { course: { instructorId: 'other-instructor' } },
    }))

    await expect(requestLessonVideoUpload(
      'course-1',
      'module-1',
      'lesson-1',
      { id: 'instructor-1', role: 'INSTRUCTOR' },
      uploadInput,
    )).rejects.toMatchObject(new AppError(403, 'Access denied'))
    expect(mockStorage.generateUploadIntent).not.toHaveBeenCalled()
  })

  it('rejects course/module/lesson mismatches before requesting upload', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(lessonRecord({ moduleId: 'module-2' }))

    await expect(requestLessonVideoUpload(
      'course-1',
      'module-1',
      'lesson-1',
      { id: 'instructor-1', role: 'INSTRUCTOR' },
      uploadInput,
    )).rejects.toMatchObject(new AppError(404, 'Lesson not found in this course module'))
    expect(mockStorage.generateUploadIntent).not.toHaveBeenCalled()
  })

  it('marks a lesson pending when provider upload details are created', async () => {
    const intent = await requestLessonVideoUpload(
      'course-1',
      'module-1',
      'lesson-1',
      { id: 'instructor-1', role: 'INSTRUCTOR' },
      uploadInput,
    )

    expect(intent.provider).toBe('SUPABASE')
    expect(mockStorage.generateUploadIntent).toHaveBeenCalledWith({
      courseId: 'course-1',
      moduleId: 'module-1',
      lessonId: 'lesson-1',
      ...uploadInput,
    })
    expect(mockPrisma.lesson.update).toHaveBeenCalledWith({
      where: { id: 'lesson-1' },
      data: {
        videoStorageKey: 'courses/course-1/modules/module-1/lessons/lesson-1/video.mp4',
        videoProvider: 'SUPABASE',
        videoUploadStatus: 'PENDING',
      },
    })
  })

  it('propagates explicit storage-missing errors', async () => {
    mockStorage.generateUploadIntent.mockRejectedValue(new AppError(503, 'Video upload is not configured yet.'))

    await expect(requestLessonVideoUpload(
      'course-1',
      'module-1',
      'lesson-1',
      { id: 'instructor-1', role: 'INSTRUCTOR' },
      uploadInput,
    )).rejects.toMatchObject(new AppError(503, 'Video upload is not configured yet.'))
    expect(mockPrisma.lesson.update).not.toHaveBeenCalled()
  })

  it('rejects invalid or unverified storage keys before attaching', async () => {
    mockStorage.assertLessonVideoStorageKey.mockImplementation(() => {
      throw new AppError(400, 'Invalid video storage key for this lesson')
    })

    await expect(attachLessonVideo(
      'course-1',
      'module-1',
      'lesson-1',
      { id: 'instructor-1', role: 'INSTRUCTOR' },
      { videoStorageKey: 'courses/other/video.mp4' },
    )).rejects.toMatchObject(new AppError(400, 'Invalid video storage key for this lesson'))
    expect(mockStorage.verifyStoredVideoExists).not.toHaveBeenCalled()
    expect(mockPrisma.lesson.update).not.toHaveBeenCalled()
  })

  it('verifies provider object existence before attaching video metadata', async () => {
    await attachLessonVideo(
      'course-1',
      'module-1',
      'lesson-1',
      { id: 'admin-1', role: 'ADMIN' },
      { videoStorageKey: 'courses/course-1/modules/module-1/lessons/lesson-1/video.mp4' },
    )

    expect(mockStorage.verifyStoredVideoExists).toHaveBeenCalledWith(
      'courses/course-1/modules/module-1/lessons/lesson-1/video.mp4',
    )
    expect(mockPrisma.lesson.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lesson-1' },
      data: expect.objectContaining({
        videoProvider: 'SUPABASE',
        videoUrl: 'https://storage.example/public/video.mp4',
        videoUploadStatus: 'READY',
      }),
    }))
  })
})
