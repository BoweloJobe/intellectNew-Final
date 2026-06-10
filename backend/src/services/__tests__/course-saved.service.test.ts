import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../errors/AppError.js'

const mockPrisma = vi.hoisted(() => ({
  course: {
    findFirst: vi.fn(),
  },
  savedCourse: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import { listSavedCourses, saveCourse, unsaveCourse } from '../course.service.js'

describe('saved course service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('lists only courses saved by the requested user', async () => {
    mockPrisma.savedCourse.findMany.mockResolvedValue([
      { course: { id: 'course-1', title: 'Cell Biology' } },
    ])

    await expect(listSavedCourses('user-1')).resolves.toEqual([
      { id: 'course-1', title: 'Cell Biology' },
    ])
    expect(mockPrisma.savedCourse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          course: { status: 'APPROVED' },
        },
      }),
    )
  })

  it('omits saved courses that are no longer approved', async () => {
    mockPrisma.savedCourse.findMany.mockResolvedValue([])

    await expect(listSavedCourses('user-1')).resolves.toEqual([])
    expect(mockPrisma.savedCourse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          course: { status: 'APPROVED' },
        },
      }),
    )
  })

  it('saves an approved course idempotently', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1' })
    mockPrisma.savedCourse.upsert.mockResolvedValue({})

    await saveCourse('user-1', 'course-1')

    expect(mockPrisma.savedCourse.upsert).toHaveBeenCalledWith({
      where: { userId_courseId: { userId: 'user-1', courseId: 'course-1' } },
      update: {},
      create: { userId: 'user-1', courseId: 'course-1' },
    })
  })

  it('rejects saving a nonexistent or unpublished course', async () => {
    mockPrisma.course.findFirst.mockResolvedValue(null)

    await expect(saveCourse('user-1', 'missing-course')).rejects.toMatchObject(
      new AppError(404, 'Course not found'),
    )
    expect(mockPrisma.savedCourse.upsert).not.toHaveBeenCalled()
  })

  it('unsaves safely and idempotently for the requested user', async () => {
    mockPrisma.savedCourse.deleteMany.mockResolvedValue({ count: 0 })

    await unsaveCourse('user-1', 'course-1')

    expect(mockPrisma.savedCourse.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', courseId: 'course-1' },
    })
  })
})
