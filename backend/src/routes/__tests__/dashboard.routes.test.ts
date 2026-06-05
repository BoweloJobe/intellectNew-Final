/**
 * Route-dispatch and empty-state tests for dashboard.routes.ts
 *
 * Covers:
 *  - Instructor: no courses → all-zero stats, empty arrays
 *  - Instructor: draft / pending / approved course status breakdown
 *  - Instructor: enrollments produce distinct student count
 *  - Instructor: courses + quiz attempts → correct aggregation & submissions list
 *  - Instructor: lifecycle (draft → review → approved) reflects correct stats on each load
 *  - Admin: no data → all-zero stats, empty arrays
 *  - Admin: real data → correct aggregation
 *
 * All Prisma calls are mocked; no database connection required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'

// ── Auth stubs ────────────────────────────────────────────────────────────────
vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    ;(req as unknown as { user: { id: string; role: string } }).user = {
      id: 'instructor-1',
      role: 'INSTRUCTOR',
    }
    next()
  },
}))

vi.mock('../../middleware/role.middleware.js', () => ({
  requireRole:
    (..._roles: string[]) =>
    (_req: Request, _res: Response, next: NextFunction) =>
      next(),
}))

// ── Prisma mock ────────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  course: { findMany: vi.fn(), count: vi.fn() },
  lesson: { findMany: vi.fn() },
  lessonProgress: { count: vi.fn() },
  user: { count: vi.fn(), findMany: vi.fn() },
  payment: { aggregate: vi.fn(), findMany: vi.fn() },
  enrollment: { count: vi.fn() },
  notification: { findMany: vi.fn() },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import dashboardRouter from '../dashboard.routes.js'

// ── Test app ──────────────────────────────────────────────────────────────────
function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/dashboard', dashboardRouter)
  return app
}

// ── Shared helper: resolve empty lessons ─────────────────────────────────────
const NO_LESSONS = [] as const

// ─── Instructor dashboard tests ───────────────────────────────────────────────
describe('GET /dashboard/instructor', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    app = makeApp()
  })

  // ── Zero courses ─────────────────────────────────────────────────────────
  it('returns all-zero stats and empty arrays when instructor has no courses', async () => {
    mockPrisma.course.findMany.mockResolvedValue([])
    mockPrisma.lesson.findMany.mockResolvedValue(NO_LESSONS)

    const res = await request(app).get('/dashboard/instructor')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')

    const { stats, engagementData, courses, recentSubmissions } = res.body.data

    const statByLabel = Object.fromEntries(
      (stats as Array<{ label: string; value: string }>).map((s) => [s.label, s.value]),
    )
    expect(statByLabel['Total Students']).toBe('0')
    expect(statByLabel['Published Courses']).toBe('0')
    expect(statByLabel['Courses in Review']).toBe('0')
    expect(statByLabel['Avg Quiz Score']).toBe('—')

    expect(engagementData).toHaveLength(8) // always 8 week buckets
    expect(engagementData.every((b: { students: number }) => b.students === 0)).toBe(true)
    expect(courses).toHaveLength(0)
    expect(recentSubmissions).toHaveLength(0)
  })

  // ── Draft / pending / approved mix ───────────────────────────────────────
  it('counts draft, pending, and approved courses separately — only approved appears in performance list', async () => {
    const now = new Date().toISOString()
    mockPrisma.course.findMany.mockResolvedValue([
      { id: 'draft-1', title: 'Draft Course', status: 'DRAFT', enrollments: [] },
      { id: 'review-1', title: 'Review Course', status: 'PENDING_REVIEW', enrollments: [] },
      {
        id: 'live-1',
        title: 'Live Course',
        status: 'APPROVED',
        enrollments: [{ userId: 'student-1', completedAt: null, enrolledAt: now }],
      },
    ])
    mockPrisma.lesson.findMany.mockResolvedValue(NO_LESSONS)

    const res = await request(app).get('/dashboard/instructor')
    expect(res.status).toBe(200)

    const { stats, courses } = res.body.data
    const statByLabel = Object.fromEntries(
      (stats as Array<{ label: string; value: string }>).map((s) => [s.label, s.value]),
    )

    // Status breakdown stats
    expect(statByLabel['Published Courses']).toBe('1')   // only APPROVED
    expect(statByLabel['Courses in Review']).toBe('1')   // only PENDING_REVIEW
    // Enrolled student from the approved course
    expect(statByLabel['Total Students']).toBe('1')

    // Draft and pending courses never appear in the performance table
    expect(courses).toHaveLength(1)
    expect(courses[0].title).toBe('Live Course')
  })

  // ── Distinct student count across multiple courses ────────────────────────
  it('counts each enrolled student only once even when enrolled in multiple courses', async () => {
    const now = new Date().toISOString()
    // student-1 is enrolled in both published courses
    mockPrisma.course.findMany.mockResolvedValue([
      {
        id: 'course-a',
        title: 'Course A',
        status: 'APPROVED',
        enrollments: [
          { userId: 'student-1', completedAt: null, enrolledAt: now },
          { userId: 'student-2', completedAt: null, enrolledAt: now },
        ],
      },
      {
        id: 'course-b',
        title: 'Course B',
        status: 'APPROVED',
        enrollments: [
          { userId: 'student-1', completedAt: null, enrolledAt: now }, // duplicate
          { userId: 'student-3', completedAt: null, enrolledAt: now },
        ],
      },
    ])
    mockPrisma.lesson.findMany.mockResolvedValue(NO_LESSONS)

    const res = await request(app).get('/dashboard/instructor')
    expect(res.status).toBe(200)

    const statByLabel = Object.fromEntries(
      (res.body.data.stats as Array<{ label: string; value: string }>).map((s) => [s.label, s.value]),
    )
    // 3 unique students, not 4 (student-1 is counted once)
    expect(statByLabel['Total Students']).toBe('3')
  })

  // ── Full aggregation with quiz attempts ───────────────────────────────────
  it('aggregates students, completion, and quiz scores correctly across courses', async () => {
    const now = new Date().toISOString()
    mockPrisma.course.findMany.mockResolvedValue([
      {
        id: 'course-1',
        title: 'Course One',
        status: 'APPROVED',
        enrollments: [
          { userId: 'student-1', completedAt: now, enrolledAt: now },
          { userId: 'student-2', completedAt: null, enrolledAt: now },
        ],
      },
      {
        id: 'course-2',
        title: 'Course Two',
        status: 'APPROVED',
        enrollments: [{ userId: 'student-3', completedAt: null, enrolledAt: now }],
      },
    ])

    mockPrisma.lesson.findMany.mockResolvedValue([
      {
        id: 'lesson-1',
        courseId: 'course-1',
        quiz: {
          id: 'quiz-1',
          title: 'Quiz One',
          attempts: [
            {
              id: 'attempt-1',
              score: 80,
              submittedAt: now,
              user: { firstName: 'Alice', lastName: 'Smith' },
            },
          ],
        },
      },
    ])

    const res = await request(app).get('/dashboard/instructor')
    expect(res.status).toBe(200)

    const { stats, courses, recentSubmissions } = res.body.data
    const statByLabel = Object.fromEntries(
      (stats as Array<{ label: string; value: string }>).map((s) => [s.label, s.value]),
    )

    expect(statByLabel['Total Students']).toBe('3')
    expect(statByLabel['Published Courses']).toBe('2')
    expect(statByLabel['Courses in Review']).toBe('0')
    expect(statByLabel['Avg Quiz Score']).toBe('80%')

    // Course performance sorted by students desc
    expect(courses).toHaveLength(2)
    expect(courses[0].title).toBe('Course One')
    expect(courses[0].students).toBe(2)
    expect(courses[0].completion).toBe(50) // 1 of 2 completed
    expect(courses[0].avgScore).toBe(80)
    expect(courses[1].students).toBe(1)

    // Quiz attempt is surfaced as a graded submission (auto-scored)
    expect(recentSubmissions).toHaveLength(1)
    expect(recentSubmissions[0].student).toBe('Alice Smith')
    expect(recentSubmissions[0].assignment).toBe('Quiz One')
    expect(recentSubmissions[0].status).toBe('graded')
  })

  // ── Lifecycle: draft → review → approved ─────────────────────────────────
  it('reflects correct stats at each stage of the course lifecycle on successive loads', async () => {
    const now = new Date().toISOString()
    mockPrisma.lesson.findMany.mockResolvedValue(NO_LESSONS)

    // Stage 1: course is a draft — not visible in any published/review count
    mockPrisma.course.findMany.mockResolvedValueOnce([
      { id: 'c1', title: 'New Course', status: 'DRAFT', enrollments: [] },
    ])
    const res1 = await request(app).get('/dashboard/instructor')
    const stats1 = Object.fromEntries(
      (res1.body.data.stats as Array<{ label: string; value: string }>).map((s) => [s.label, s.value]),
    )
    expect(stats1['Published Courses']).toBe('0')
    expect(stats1['Courses in Review']).toBe('0')
    expect(res1.body.data.courses).toHaveLength(0)

    // Stage 2: instructor submits for review → appears in "Courses in Review"
    mockPrisma.course.findMany.mockResolvedValueOnce([
      { id: 'c1', title: 'New Course', status: 'PENDING_REVIEW', enrollments: [] },
    ])
    const res2 = await request(app).get('/dashboard/instructor')
    const stats2 = Object.fromEntries(
      (res2.body.data.stats as Array<{ label: string; value: string }>).map((s) => [s.label, s.value]),
    )
    expect(stats2['Published Courses']).toBe('0')
    expect(stats2['Courses in Review']).toBe('1')
    expect(res2.body.data.courses).toHaveLength(0) // still not in performance list

    // Stage 3: admin approves → appears in "Published Courses" + performance list
    mockPrisma.course.findMany.mockResolvedValueOnce([
      {
        id: 'c1',
        title: 'New Course',
        status: 'APPROVED',
        enrollments: [{ userId: 'student-1', completedAt: null, enrolledAt: now }],
      },
    ])
    const res3 = await request(app).get('/dashboard/instructor')
    const stats3 = Object.fromEntries(
      (res3.body.data.stats as Array<{ label: string; value: string }>).map((s) => [s.label, s.value]),
    )
    expect(stats3['Published Courses']).toBe('1')
    expect(stats3['Courses in Review']).toBe('0')
    expect(stats3['Total Students']).toBe('1')
    expect(res3.body.data.courses).toHaveLength(1)
    expect(res3.body.data.courses[0].title).toBe('New Course')
  })
})

// ─── Admin dashboard tests ────────────────────────────────────────────────────
describe('GET /dashboard/admin', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    app = makeApp()
  })

  it('returns all-zero stats and empty arrays when platform has no data', async () => {
    mockPrisma.user.count.mockResolvedValue(0)
    mockPrisma.course.count.mockResolvedValue(0)
    mockPrisma.enrollment.count.mockResolvedValue(0)
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } })
    mockPrisma.payment.findMany.mockResolvedValue([])
    mockPrisma.user.findMany.mockResolvedValue([])
    mockPrisma.notification.findMany.mockResolvedValue([])
    mockPrisma.course.findMany.mockResolvedValue([])

    const res = await request(app).get('/dashboard/admin')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')

    const { stats, revenueData, userGrowth, recentActivities, topCourses } = res.body.data
    const statByLabel = Object.fromEntries(
      (stats as Array<{ label: string; value: string }>).map((s) => [s.label, s.value]),
    )

    expect(statByLabel['Total Users']).toBe('0')
    expect(statByLabel['Total Revenue']).toBe('$0.00')
    expect(statByLabel['Published Courses']).toBe('0')
    expect(statByLabel['Enrollments']).toBe('0')

    expect(revenueData).toHaveLength(12) // always 12 month buckets
    expect(revenueData.every((b: { revenue: number }) => b.revenue === 0)).toBe(true)
    expect(userGrowth).toHaveLength(12)
    expect(userGrowth.every((b: { users: number }) => b.users === 0)).toBe(true)
    expect(recentActivities).toHaveLength(0)
    expect(topCourses).toHaveLength(0)
  })

  it('aggregates users, revenue, top courses, and recent activity when data exists', async () => {
    mockPrisma.user.count.mockResolvedValue(42)
    mockPrisma.course.count.mockResolvedValue(5)
    mockPrisma.enrollment.count.mockResolvedValue(120)
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 999.5 } })
    mockPrisma.payment.findMany.mockResolvedValue([])
    mockPrisma.user.findMany.mockResolvedValue([])
    mockPrisma.notification.findMany.mockResolvedValue([
      {
        id: 'notif-1',
        type: 'ENROLLMENT_CONFIRMED',
        body: 'User enrolled in Course A',
        createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      },
    ])
    mockPrisma.course.findMany.mockResolvedValue([
      {
        id: 'course-1',
        title: 'Top Course',
        _count: { enrollments: 50 },
        payments: [{ amount: 99 }, { amount: 49.5 }],
      },
    ])

    const res = await request(app).get('/dashboard/admin')
    expect(res.status).toBe(200)

    const { stats, recentActivities, topCourses } = res.body.data
    const statByLabel = Object.fromEntries(
      (stats as Array<{ label: string; value: string }>).map((s) => [s.label, s.value]),
    )

    expect(statByLabel['Total Users']).toBe('42')
    expect(statByLabel['Total Revenue']).toBe('$999.50')
    expect(statByLabel['Published Courses']).toBe('5')
    expect(statByLabel['Enrollments']).toBe('120')

    expect(recentActivities).toHaveLength(1)
    expect(recentActivities[0].type).toBe('Enrollment Confirmed')
    expect(recentActivities[0].detail).toBe('User enrolled in Course A')
    expect(recentActivities[0].minutesAgo).toBeGreaterThanOrEqual(4)
    expect(recentActivities[0].minutesAgo).toBeLessThanOrEqual(6)

    expect(topCourses).toHaveLength(1)
    expect(topCourses[0].title).toBe('Top Course')
    expect(topCourses[0].students).toBe(50)
    expect(topCourses[0].revenue).toBe('$148.50')
  })
})
