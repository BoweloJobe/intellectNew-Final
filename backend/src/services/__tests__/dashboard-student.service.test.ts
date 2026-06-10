import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  enrollment: {
    findMany: vi.fn(),
  },
  lessonProgress: {
    findMany: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import { getStudentDashboard } from '../dashboard.service.js'

describe('student dashboard service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns safe defaults for an empty dashboard', async () => {
    mockPrisma.enrollment.findMany.mockResolvedValue([])

    const result = await getStudentDashboard('student-1')

    expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'student-1' } }),
    )
    expect(result).toEqual({
      stats: [
        { label: 'Courses Enrolled', value: '0', key: 'courses-enrolled' },
        { label: 'Completed', value: '0', key: 'completed' },
        { label: 'Study Hours', value: '0', key: 'study-hours' },
        { label: 'Current Streak', value: '0', key: 'current-streak' },
      ],
      continueLearning: [],
      upcomingQuizzes: [],
      recommendations: [],
    })
  })

  it('aggregates enrollments and progress for the requested student', async () => {
    mockPrisma.enrollment.findMany.mockResolvedValue([
      {
        courseId: 'course-1',
        completedAt: null,
        course: {
          id: 'course-1',
          title: 'Cell Biology',
          estimatedHours: 4,
          modules: [
            {
              lessons: [
                { id: 'lesson-1', title: 'Cells' },
                { id: 'lesson-2', title: 'Membranes' },
              ],
            },
          ],
        },
      },
      {
        courseId: 'course-2',
        completedAt: new Date(),
        course: {
          id: 'course-2',
          title: 'Genetics',
          estimatedHours: 5,
          modules: [{ lessons: [{ id: 'lesson-3', title: 'DNA' }] }],
        },
      },
    ])
    mockPrisma.lessonProgress.findMany.mockResolvedValue([
      { courseId: 'course-1', lessonId: 'lesson-1', completedAt: new Date() },
      { courseId: 'course-2', lessonId: 'lesson-3', completedAt: new Date() },
    ])

    const result = await getStudentDashboard('student-1')

    expect(mockPrisma.lessonProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'student-1', courseId: { in: ['course-1', 'course-2'] } },
      }),
    )
    expect(result.stats).toEqual([
      { label: 'Courses Enrolled', value: '2', key: 'courses-enrolled' },
      { label: 'Completed', value: '1', key: 'completed' },
      { label: 'Study Hours', value: '1', key: 'study-hours' },
      { label: 'Current Streak', value: '1', key: 'current-streak' },
    ])
    expect(result.continueLearning).toEqual([
      {
        courseId: 'course-1',
        resumeLessonId: 'lesson-2',
        title: 'Cell Biology',
        progress: 50,
        lesson: 'Membranes',
        duration: '4h total',
      },
    ])
  })
})
