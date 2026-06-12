/**
 * Backend unit-level route tests for the lesson completion flow.
 *
 * These tests verify:
 *  - POST /enrollments/lessons/:lessonId/complete returns the full course
 *    progress shape (not just a bare lessonProgress object).
 *  - The percentage field is accurately computed.
 *  - Re-completing an already-completed lesson is idempotent.
 *  - The response includes the correct lessonProgress array size.
 *  - Completing all lessons marks the course completedAt.
 *
 * Middleware (requireAuth) is stubbed. The Prisma client is mocked so no
 * database connection is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { type Request, type Response, type NextFunction } from "express";

// ── Middleware stubs ──────────────────────────────────────────────────────────
vi.mock("../../middleware/auth.middleware.js", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    (req as unknown as { user: { id: string } }).user = { id: "user-1" };
    next();
  },
}));

// ── Validation stub ───────────────────────────────────────────────────────────
vi.mock("../../lib/validate.js", () => ({
  validate: (_schema: unknown, body: unknown) => body,
}));

// ── Prisma mock ───────────────────────────────────────────────────────────────
// vi.mock calls are hoisted before const declarations, so we must use
// vi.hoisted() to make mockPrisma available inside the factory.
const mockPrisma = vi.hoisted(() => ({
  enrollment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  lesson: {
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  courseModule: {
    findMany: vi.fn(),
  },
  lessonProgress: {
    upsert: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("../../lib/prisma.js", () => ({ prisma: mockPrisma }));

// ── Notification stub ─────────────────────────────────────────────────────────
vi.mock("../../services/notification.service.js", () => ({
  fireNotification: vi.fn(),
}));

import enrollmentRouter from "../enrollment.routes.js";

// ── Test suite ────────────────────────────────────────────────────────────────
describe("POST /enrollments/lessons/:lessonId/complete", () => {
  let app: express.Express;

  function baseEnrollment(overrides = {}) {
    return {
      id: "enroll-1",
      userId: "user-1",
      courseId: "course-1",
      enrolledAt: new Date(),
      completedAt: null,
      ...overrides,
    };
  }

  function baseLessonProgress(n: number, lessonIds: string[]) {
    return lessonIds.map((lessonId) => ({
      lessonId,
      completedAt: new Date().toISOString(),
    }));
  }

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/enrollments", enrollmentRouter);
    vi.clearAllMocks();
  });

  it("returns full course progress after marking a lesson complete", async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue(baseEnrollment());
    mockPrisma.lesson.findFirst.mockResolvedValue({ id: "lesson-1", courseId: "course-1" });
    mockPrisma.lessonProgress.upsert.mockResolvedValue({});
    mockPrisma.lesson.count.mockResolvedValue(4);
    mockPrisma.lessonProgress.count.mockResolvedValue(2);
    mockPrisma.courseModule.findMany.mockResolvedValue([
      {
        id: "module-1",
        title: "Foundations",
        order: 0,
        lessons: [
          { id: "lesson-0", title: "Intro", order: 0 },
          { id: "lesson-1", title: "Cells", order: 1 },
          { id: "lesson-2", title: "DNA", order: 2 },
          { id: "lesson-3", title: "Lab", order: 3 },
        ],
      },
    ]);
    mockPrisma.lessonProgress.findMany.mockResolvedValue(
      baseLessonProgress(2, ["lesson-0", "lesson-1"]),
    );

    const res = await request(app)
      .post("/enrollments/lessons/lesson-1/complete")
      .send({ courseId: "course-1" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    // Must return courseProgress (full shape), not bare progress
    const cp = res.body.data.courseProgress;
    expect(cp).toBeDefined();
    expect(cp.courseId).toBe("course-1");
    expect(cp.totalLessons).toBe(4);
    expect(cp.completedLessons).toBe(2);
    expect(cp.percentage).toBe(50);
    expect(cp.nextLessonId).toBe("lesson-2");
    expect(cp.currentModule).toEqual({
      id: "module-1",
      title: "Foundations",
      totalLessons: 4,
      completedLessons: 2,
    });
    expect(cp.modules).toEqual([
      {
        id: "module-1",
        title: "Foundations",
        totalLessons: 4,
        completedLessons: 2,
      },
    ]);
    expect(cp.lessonProgress).toHaveLength(2);
    expect(cp.completedAt).toBeNull();
  });

  it("percentage is 100 when all lessons are completed", async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue(baseEnrollment());
    mockPrisma.lesson.findFirst.mockResolvedValue({ id: "lesson-4", courseId: "course-1" });
    mockPrisma.lessonProgress.upsert.mockResolvedValue({});
    mockPrisma.lesson.count.mockResolvedValue(4);
    mockPrisma.lessonProgress.count.mockResolvedValue(4); // all done
    const completedAt = new Date();
    mockPrisma.enrollment.update.mockResolvedValue({ completedAt });
    mockPrisma.courseModule.findMany.mockResolvedValue([
      {
        id: "module-1",
        title: "Foundations",
        order: 0,
        lessons: [
          { id: "l1", title: "One", order: 0 },
          { id: "l2", title: "Two", order: 1 },
          { id: "l3", title: "Three", order: 2 },
          { id: "l4", title: "Four", order: 3 },
        ],
      },
    ]);
    mockPrisma.lessonProgress.findMany.mockResolvedValue(
      baseLessonProgress(4, ["l1", "l2", "l3", "l4"]),
    );

    const res = await request(app)
      .post("/enrollments/lessons/lesson-4/complete")
      .send({ courseId: "course-1" });

    expect(res.status).toBe(200);
    const cp = res.body.data.courseProgress;
    expect(cp.percentage).toBe(100);
    expect(cp.completedAt).not.toBeNull();
  });

  it("is idempotent — re-completing a lesson does not inflate the count", async () => {
    // completedLessons stays at 2 even though we're submitting the same lessonId again
    mockPrisma.enrollment.findUnique.mockResolvedValue(baseEnrollment());
    mockPrisma.lesson.findFirst.mockResolvedValue({ id: "lesson-1", courseId: "course-1" });
    mockPrisma.lessonProgress.upsert.mockResolvedValue({}); // upsert does nothing on conflict
    mockPrisma.lesson.count.mockResolvedValue(4);
    mockPrisma.lessonProgress.count.mockResolvedValue(2); // still 2
    mockPrisma.courseModule.findMany.mockResolvedValue([
      {
        id: "module-1",
        title: "Foundations",
        order: 0,
        lessons: [
          { id: "lesson-0", title: "Intro", order: 0 },
          { id: "lesson-1", title: "Cells", order: 1 },
          { id: "lesson-2", title: "DNA", order: 2 },
          { id: "lesson-3", title: "Lab", order: 3 },
        ],
      },
    ]);
    mockPrisma.lessonProgress.findMany.mockResolvedValue(
      baseLessonProgress(2, ["lesson-0", "lesson-1"]),
    );

    const res = await request(app)
      .post("/enrollments/lessons/lesson-1/complete")
      .send({ courseId: "course-1" });

    expect(res.status).toBe(200);
    const cp = res.body.data.courseProgress;
    expect(cp.completedLessons).toBe(2);
    expect(cp.percentage).toBe(50);
  });

  it("returns 403 when user is not enrolled", async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/enrollments/lessons/lesson-x/complete")
      .send({ courseId: "course-1" });

    expect(res.status).toBe(403);
  });

  it("returns 404 when lesson does not belong to the course", async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue(baseEnrollment());
    mockPrisma.lesson.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/enrollments/lessons/wrong-lesson/complete")
      .send({ courseId: "course-1" });

    expect(res.status).toBe(404);
  });

  it("returns progress with next lesson and module summary", async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue(baseEnrollment());
    mockPrisma.courseModule.findMany.mockResolvedValue([
      {
        id: "module-1",
        title: "Foundations",
        order: 0,
        lessons: [
          { id: "lesson-1", title: "Intro", order: 0 },
          { id: "lesson-2", title: "Cells", order: 1 },
        ],
      },
      {
        id: "module-2",
        title: "Practice",
        order: 1,
        lessons: [
          { id: "lesson-3", title: "Lab", order: 0 },
        ],
      },
    ]);
    mockPrisma.lessonProgress.findMany.mockResolvedValue(
      baseLessonProgress(1, ["lesson-1"]),
    );

    const res = await request(app)
      .get("/enrollments/courses/course-1/progress");

    expect(res.status).toBe(200);
    expect(res.body.data.progress).toMatchObject({
      courseId: "course-1",
      totalLessons: 3,
      completedLessons: 1,
      percentage: 33,
      nextLessonId: "lesson-2",
      currentModule: {
        id: "module-1",
        title: "Foundations",
        totalLessons: 2,
        completedLessons: 1,
      },
    });
  });
});
