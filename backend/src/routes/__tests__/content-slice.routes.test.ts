/**
 * Integration-level route tests for the full content vertical slice:
 *
 *  deleteModule  — ownership, progress guard
 *  deleteLesson  — ownership, progress guard
 *  submitForReview — empty-course guard (0 lessons)
 *  quiz student  — enrollment check on GET lesson/quiz and POST attempt
 *
 * All Prisma calls are mocked so no database connection is required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'

// ── Auth stub ────────────────────────────────────────────────────────────────
vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    ;(req as unknown as { user: { id: string; role: string } }).user = {
      id: 'user-1',
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

// ── Prisma mock (hoisted so vi.mock factories can reference it) ───────────────
const mockPrisma = vi.hoisted(() => ({
  course: { findUnique: vi.fn(), update: vi.fn() },
  courseModule: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  },
  lesson: {
    findUnique: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  },
  lessonProgress: {
    count: vi.fn(),
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  enrollment: { findUnique: vi.fn() },
  quiz: { findUnique: vi.fn(), create: vi.fn() },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

vi.mock('../../services/notification.service.js', () => ({
  fireNotification: vi.fn(),
}))

vi.mock('../../lib/storage.js', () => ({
  generateUploadIntent: vi.fn(() => ({
    storageKey: 'key',
    provider: 'LOCAL',
    uploadUrl: 'http://localhost',
  })),
}))

import courseRouter from '../course.routes.js'
import quizRouter from '../quiz.routes.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/courses', courseRouter)
  app.use('/content', quizRouter)
  return app
}

function fakeCourse(overrides = {}) {
  return { id: 'course-1', instructorId: 'user-1', status: 'DRAFT', title: 'Test', ...overrides }
}

function fakeModule(overrides = {}) {
  return {
    id: 'module-1',
    courseId: 'course-1',
    course: { instructorId: 'user-1' },
    ...overrides,
  }
}

function fakeLesson(overrides = {}) {
  return {
    id: 'lesson-1',
    moduleId: 'module-1',
    courseId: 'course-1',
    module: { course: { instructorId: 'user-1' } },
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// deleteModule
// ═══════════════════════════════════════════════════════════════════════════
describe('DELETE /courses/:courseId/modules/:moduleId', () => {
  let app: express.Express

  beforeEach(() => {
    app = makeApp()
    vi.clearAllMocks()
  })

  it('204 when module is owned and has no student progress', async () => {
    mockPrisma.courseModule.findUnique.mockResolvedValue(fakeModule())
    mockPrisma.lessonProgress.count.mockResolvedValue(0)
    mockPrisma.courseModule.delete.mockResolvedValue({})

    const res = await request(app).delete('/courses/course-1/modules/module-1')
    expect(res.status).toBe(204)
  })

  it('403 when module belongs to a different instructor', async () => {
    mockPrisma.courseModule.findUnique.mockResolvedValue(
      fakeModule({ course: { instructorId: 'other-instructor' } }),
    )

    const res = await request(app).delete('/courses/course-1/modules/module-1')
    expect(res.status).toBe(403)
  })

  it('404 when module does not exist', async () => {
    mockPrisma.courseModule.findUnique.mockResolvedValue(null)

    const res = await request(app).delete('/courses/course-1/modules/nonexistent')
    expect(res.status).toBe(404)
  })

  it('409 when module has student lesson progress', async () => {
    mockPrisma.courseModule.findUnique.mockResolvedValue(fakeModule())
    mockPrisma.lessonProgress.count.mockResolvedValue(3) // students have progress

    const res = await request(app).delete('/courses/course-1/modules/module-1')
    expect(res.status).toBe(409)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// deleteLesson
// ═══════════════════════════════════════════════════════════════════════════
describe('DELETE /courses/:courseId/modules/:moduleId/lessons/:lessonId', () => {
  let app: express.Express

  beforeEach(() => {
    app = makeApp()
    vi.clearAllMocks()
  })

  it('204 when lesson is owned and has no progress', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(fakeLesson())
    mockPrisma.lessonProgress.count.mockResolvedValue(0)
    mockPrisma.lesson.delete.mockResolvedValue({})

    const res = await request(app).delete(
      '/courses/course-1/modules/module-1/lessons/lesson-1',
    )
    expect(res.status).toBe(204)
  })

  it('403 when lesson belongs to a different instructor', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(
      fakeLesson({ module: { course: { instructorId: 'other' } } }),
    )

    const res = await request(app).delete(
      '/courses/course-1/modules/module-1/lessons/lesson-1',
    )
    expect(res.status).toBe(403)
  })

  it('404 when lesson does not exist', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(null)

    const res = await request(app).delete(
      '/courses/course-1/modules/module-1/lessons/nonexistent',
    )
    expect(res.status).toBe(404)
  })

  it('409 when lesson has student progress', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(fakeLesson())
    mockPrisma.lessonProgress.count.mockResolvedValue(2)

    const res = await request(app).delete(
      '/courses/course-1/modules/module-1/lessons/lesson-1',
    )
    expect(res.status).toBe(409)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// submitForReview — empty-course guard
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /courses/:id/submit', () => {
  let app: express.Express

  beforeEach(() => {
    app = makeApp()
    vi.clearAllMocks()
  })

  it('422 when course has no lessons', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(fakeCourse({ status: 'DRAFT' }))
    mockPrisma.lesson.count.mockResolvedValue(0)

    const res = await request(app).post('/courses/course-1/submit')
    expect(res.status).toBe(422)
  })

  it('200 when course has at least one lesson', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(fakeCourse({ status: 'DRAFT' }))
    mockPrisma.lesson.count.mockResolvedValue(1)
    mockPrisma.course.update.mockResolvedValue({
      ...fakeCourse({ status: 'PENDING_REVIEW' }),
      instructor: { id: 'user-1', firstName: 'A', lastName: 'B', avatarUrl: null },
    })

    const res = await request(app).post('/courses/course-1/submit')
    expect(res.status).toBe(200)
    expect(res.body.data.course.status).toBe('PENDING_REVIEW')
  })

  it('409 when course is not in DRAFT or REJECTED status', async () => {
    mockPrisma.course.findUnique.mockResolvedValue(fakeCourse({ status: 'APPROVED' }))

    const res = await request(app).post('/courses/course-1/submit')
    expect(res.status).toBe(409)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Quiz student routes — enrollment checks
// ═══════════════════════════════════════════════════════════════════════════
describe('GET /content/lessons/:lessonId/quiz — enrollment check', () => {
  let app: express.Express

  beforeEach(() => {
    app = makeApp()
    vi.clearAllMocks()
  })

  it('403 when student is not enrolled in the course', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({ courseId: 'course-1' })
    mockPrisma.enrollment.findUnique.mockResolvedValue(null) // not enrolled

    const res = await request(app).get('/content/lessons/lesson-1/quiz')
    expect(res.status).toBe(403)
  })

  it('200 with quiz data when student is enrolled', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({ courseId: 'course-1' })
    mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enroll-1' })
    mockPrisma.quiz.findUnique.mockResolvedValue({
      id: 'quiz-1',
      lessonId: 'lesson-1',
      title: 'Quiz',
      description: null,
      passingScore: 70,
      questions: [],
    })

    const res = await request(app).get('/content/lessons/lesson-1/quiz')
    expect(res.status).toBe(200)
    expect(res.body.data.quiz.id).toBe('quiz-1')
  })
})

describe('GET /content/quizzes/:quizId — enrollment check', () => {
  let app: express.Express

  beforeEach(() => {
    app = makeApp()
    vi.clearAllMocks()
  })

  it('403 when student is not enrolled', async () => {
    mockPrisma.quiz.findUnique
      // first call: student-safe quiz lookup
      .mockResolvedValueOnce({
        id: 'quiz-1',
        lessonId: 'lesson-1',
        title: 'Q',
        description: null,
        passingScore: 70,
        questions: [],
      })
      // second call: lesson-bound course lookup for enrollment check
      .mockResolvedValueOnce({ id: 'quiz-1', lesson: { courseId: 'course-1' } })
    mockPrisma.enrollment.findUnique.mockResolvedValue(null)

    const res = await request(app).get('/content/quizzes/quiz-1')
    expect(res.status).toBe(403)
  })

  it('200 when student is enrolled', async () => {
    mockPrisma.quiz.findUnique
      .mockResolvedValueOnce({
        id: 'quiz-1',
        lessonId: 'lesson-1',
        title: 'Q',
        description: null,
        passingScore: 70,
        questions: [],
      }) // student-safe quiz lookup
      .mockResolvedValueOnce({ id: 'quiz-1', lesson: { courseId: 'course-1' } }) // enrollment check
    mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enroll-1' })

    const res = await request(app).get('/content/quizzes/quiz-1')
    expect(res.status).toBe(200)
  })
})
