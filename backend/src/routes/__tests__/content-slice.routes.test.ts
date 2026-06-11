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
import express, { type Request, type Response, type NextFunction, type RequestHandler } from 'express'

// ── Auth stub ────────────────────────────────────────────────────────────────
vi.mock('../../middleware/auth.middleware.js', () => ({
  optionalAuth: (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers.authorization === 'Bearer valid-student-token') {
      ;(req as unknown as { user: { id: string; role: string } }).user = {
        id: 'student-1',
        role: 'STUDENT',
      }
    }
    next()
  },
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization
    const user =
      token === 'Bearer valid-student-token'
        ? { id: 'student-1', role: 'STUDENT' }
        : token === 'Bearer valid-admin-token'
          ? { id: 'admin-1', role: 'ADMIN' }
          : token === 'Bearer valid-owner-token'
            ? { id: 'instructor-1', role: 'INSTRUCTOR' }
            : { id: 'user-1', role: 'INSTRUCTOR' }
    ;(req as unknown as { user: { id: string; role: string } }).user = user
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
  course: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  courseModule: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
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
  lessonWatchProgress: {
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

beforeEach(() => {
  mockPrisma.lessonWatchProgress.findMany.mockResolvedValue([])
})

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

function fakeApprovedCourseWithContent() {
  return {
    id: 'course-1',
    title: 'Approved Course',
    description: 'Public course',
    price: 0,
    category: 'Programming',
    difficulty: 'BEGINNER',
    thumbnail: null,
    status: 'APPROVED',
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    instructor: { id: 'instructor-1', name: 'Instructor' },
    rejectionReason: null,
    modules: [
      {
        id: 'module-1',
        title: 'Module 1',
        order: 1,
        lessons: [
          {
            id: 'free-lesson',
            title: 'Free Lesson',
            description: 'Preview',
            type: 'VIDEO',
            duration: 10,
            order: 1,
            isFree: true,
            videoUrl: 'https://video.example/free',
            notes: 'free notes',
            videoUploadStatus: 'READY',
          },
          {
            id: 'premium-lesson',
            title: 'Premium Lesson',
            description: 'Paid content',
            type: 'VIDEO',
            duration: 20,
            order: 2,
            isFree: false,
            videoUrl: 'https://video.example/premium',
            notes: 'premium notes',
            videoUploadStatus: 'READY',
          },
        ],
      },
    ],
  }
}

describe('GET /courses/:id public detail', () => {
  let app: express.Express

  beforeEach(() => {
    app = makeApp()
    vi.clearAllMocks()
    mockPrisma.course.findFirst.mockResolvedValue(fakeCourse({ status: 'APPROVED' }))
    mockPrisma.course.findUnique.mockResolvedValue(fakeApprovedCourseWithContent())
  })

  it('keeps anonymous course detail public and locks premium lesson content', async () => {
    const res = await request(app).get('/courses/course-1')

    expect(res.status).toBe(200)
    expect(mockPrisma.enrollment.findUnique).not.toHaveBeenCalled()
    const lessons = res.body.data.course.modules[0].lessons
    expect(lessons[0].videoUrl).toBe('https://video.example/free')
    expect(lessons[0].notes).toBe('free notes')
    expect(lessons[1].videoUrl).toBeNull()
    expect(lessons[1].notes).toBeNull()
  })

  it('passes optional authenticated user through so enrolled students receive full content', async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enrollment-1' })

    const res = await request(app)
      .get('/courses/course-1')
      .set('Authorization', 'Bearer valid-student-token')

    expect(res.status).toBe(200)
    expect(mockPrisma.enrollment.findUnique).toHaveBeenCalledWith({
      where: { userId_courseId: { userId: 'student-1', courseId: 'course-1' } },
    })
    const lessons = res.body.data.course.modules[0].lessons
    expect(lessons[1].videoUrl).toBe('https://video.example/premium')
    expect(lessons[1].notes).toBe('premium notes')
  })

  it('keeps authenticated but non-enrolled users on the public-only content path', async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/courses/course-1')
      .set('Authorization', 'Bearer valid-student-token')

    expect(res.status).toBe(200)
    const lessons = res.body.data.course.modules[0].lessons
    expect(lessons[1].videoUrl).toBeNull()
    expect(lessons[1].notes).toBeNull()
  })
})

function fakeLessonPageLesson(overrides = {}) {
  return {
    id: 'lesson-1',
    moduleId: 'module-1',
    courseId: 'course-1',
    title: 'Lesson 1',
    description: 'Lesson description',
    notes: 'Lesson notes',
    videoUrl: 'https://video.example/lesson-1',
    videoDurationSecs: 600,
    estimatedMinutes: 10,
    order: 1,
    isFree: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    quiz: { id: 'quiz-1' },
    ...overrides,
  }
}

function fakeLessonPageRecord(overrides = {}) {
  return {
    ...fakeLessonPageLesson(),
    module: {
      id: 'module-1',
      title: 'Module 1',
      order: 1,
      course: {
        id: 'course-1',
        title: 'Approved Course',
        category: 'Programming',
        difficulty: 'BEGINNER',
        thumbnailUrl: null,
        status: 'APPROVED',
        instructorId: 'instructor-1',
        instructor: { id: 'instructor-1', firstName: 'Ada', lastName: 'Lovelace', avatarUrl: null },
      },
    },
    ...overrides,
  }
}

function fakeLessonPageModules(lessons = [fakeLessonPageLesson()]) {
  return [
    {
      id: 'module-1',
      title: 'Module 1',
      order: 1,
      lessons,
    },
  ]
}

describe('GET /content/lessons/:lessonId', () => {
  let app: express.Express

  beforeEach(() => {
    app = makeApp()
    vi.clearAllMocks()
    mockPrisma.lessonWatchProgress.findMany.mockResolvedValue([])
  })

  it('allows an enrolled student to fetch a locked lesson with content', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(fakeLessonPageRecord())
    mockPrisma.enrollment.findUnique.mockResolvedValue({ id: 'enroll-1' })
    mockPrisma.courseModule.findMany.mockResolvedValue(fakeLessonPageModules())

    const res = await request(app)
      .get('/content/lessons/lesson-1')
      .set('Authorization', 'Bearer valid-student-token')

    expect(res.status).toBe(200)
    expect(res.body.data.lesson.videoUrl).toBe('https://video.example/lesson-1')
    expect(res.body.data.lesson.notes).toBe('Lesson notes')
    expect(res.body.data.lesson.quizId).toBe('quiz-1')
  })

  it('blocks a non-enrolled user from a locked lesson', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(fakeLessonPageRecord())
    mockPrisma.enrollment.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/content/lessons/lesson-1')
      .set('Authorization', 'Bearer valid-student-token')

    expect(res.status).toBe(403)
    expect(mockPrisma.courseModule.findMany).not.toHaveBeenCalled()
  })

  it('allows a free preview lesson for an authenticated non-enrolled user', async () => {
    const freeLesson = fakeLessonPageLesson({ id: 'free-lesson', isFree: true })
    mockPrisma.lesson.findUnique.mockResolvedValue(fakeLessonPageRecord({
      ...freeLesson,
      module: fakeLessonPageRecord().module,
    }))
    mockPrisma.enrollment.findUnique.mockResolvedValue(null)
    mockPrisma.courseModule.findMany.mockResolvedValue(fakeLessonPageModules([freeLesson]))

    const res = await request(app)
      .get('/content/lessons/free-lesson')
      .set('Authorization', 'Bearer valid-student-token')

    expect(res.status).toBe(200)
    expect(res.body.data.lesson.videoUrl).toBe('https://video.example/lesson-1')
  })

  it('does not expose quizId for locked neighboring lessons to authenticated non-enrolled users', async () => {
    // Setup: free lesson is being viewed, but a neighboring premium lesson exists with a quiz
    const freeLesson = fakeLessonPageLesson({ id: 'free-lesson', isFree: true, quiz: { id: 'quiz-free' } })
    const premiumLesson = fakeLessonPageLesson({ id: 'premium-lesson', isFree: false, quiz: { id: 'quiz-prem' } })

    // The DB will return the free lesson as the requested record
    mockPrisma.lesson.findUnique.mockResolvedValueOnce(
      fakeLessonPageRecord({ ...freeLesson, module: fakeLessonPageRecord().module }),
    )

    // Not enrolled
    mockPrisma.enrollment.findUnique.mockResolvedValue(null)

    // courseModule.findMany returns both lessons in the module so courseLessons contains neighbor data
    mockPrisma.courseModule.findMany.mockResolvedValueOnce(fakeLessonPageModules([freeLesson, premiumLesson]))

    const res = await request(app)
      .get('/content/lessons/free-lesson')
      .set('Authorization', 'Bearer valid-student-token')

    expect(res.status).toBe(200)
    // The viewed (free) lesson may expose its quizId
    expect(res.body.data.lesson.quizId).toBe('quiz-free')
    // The neighboring premium lesson must NOT expose its quizId to a non-enrolled user
    const neighbor = res.body.data.courseLessons.find((c: any) => c.id === 'premium-lesson')
    expect(neighbor).toBeDefined()
    expect(neighbor.quizId).toBeNull()
  })

  it('returns 401 for unauthenticated requests to protected lesson endpoint', async () => {
    // Import the real requireAuth (bypass the test's vi.mock) to verify unauthenticated behavior
    const realAuth = await vi.importActual('../../middleware/auth.middleware.js')
    const { requireAuth } = realAuth as { requireAuth: RequestHandler }
    const expressApp = express()
    expressApp.get('/test/lessons/:id', requireAuth, (req: Request, res: Response) => res.json({ ok: true }))

    const res = await request(expressApp).get('/test/lessons/lesson-1')
    expect(res.status).toBe(401)
  })

  it('allows the instructor owner to fetch their lesson', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(fakeLessonPageRecord())
    mockPrisma.enrollment.findUnique.mockResolvedValue(null)
    mockPrisma.courseModule.findMany.mockResolvedValue(fakeLessonPageModules())

    const res = await request(app)
      .get('/content/lessons/lesson-1')
      .set('Authorization', 'Bearer valid-owner-token')

    expect(res.status).toBe(200)
    expect(res.body.data.lesson.videoUrl).toBe('https://video.example/lesson-1')
  })

  it('allows admin to fetch any lesson', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(fakeLessonPageRecord())
    mockPrisma.enrollment.findUnique.mockResolvedValue(null)
    mockPrisma.courseModule.findMany.mockResolvedValue(fakeLessonPageModules())

    const res = await request(app)
      .get('/content/lessons/lesson-1')
      .set('Authorization', 'Bearer valid-admin-token')

    expect(res.status).toBe(200)
    expect(res.body.data.lesson.videoUrl).toBe('https://video.example/lesson-1')
  })

  it('returns 404 when lesson does not exist', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/content/lessons/missing-lesson')
      .set('Authorization', 'Bearer valid-student-token')

    expect(res.status).toBe(404)
  })
})

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
