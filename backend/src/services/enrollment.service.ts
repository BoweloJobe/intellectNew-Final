import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'
import { fireNotification } from './notification.service.js'
import type { UpdateLessonWatchProgressInput } from '../validation/enrollment.validation.js'

export async function enroll(userId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, status: 'APPROVED' },
    select: { id: true, title: true, price: true },
  })
  if (!course) throw new AppError(404, 'Course not found')

  // Free courses only — paid courses must go through /payments/courses/:id/create-order
  if (course.price && course.price > 0) {
    throw new AppError(
      402,
      'This course requires payment. Use POST /api/payments/courses/:courseId/create-order to begin checkout.',
    )
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (existing) throw new AppError(409, 'Already enrolled in this course')

  const enrollment = await prisma.enrollment.create({
    data: { userId, courseId },
    select: { id: true, courseId: true, enrolledAt: true },
  })

  fireNotification(
    userId,
    'ENROLLMENT_CONFIRMED',
    'Enrolled successfully',
    `You are now enrolled in "${course.title}".`,
    { courseId },
  )

  return enrollment
}

export async function getMyEnrollments(userId: string) {
  return prisma.enrollment.findMany({
    where: { userId },
    orderBy: { enrolledAt: 'desc' },
    select: {
      id: true,
      enrolledAt: true,
      completedAt: true,
      course: {
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
          thumbnailUrl: true,
          estimatedHours: true,
          instructor: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { modules: true } },
        },
      },
    },
  })
}

export async function getCourseProgress(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (!enrollment) throw new AppError(403, 'Not enrolled in this course')

  return getCourseProgressSummary(userId, courseId, enrollment.completedAt)
}

export async function markLessonComplete(userId: string, lessonId: string, courseId: string) {
  // Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (!enrollment) throw new AppError(403, 'Not enrolled in this course')

  // Verify lesson belongs to course
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, courseId } })
  if (!lesson) throw new AppError(404, 'Lesson not found in this course')

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, courseId },
    update: {},
  })

  // Auto-complete enrollment if all lessons done
  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { courseId } }),
    prisma.lessonProgress.count({ where: { userId, courseId } }),
  ])

  let courseCompletedAt = enrollment.completedAt
  if (totalLessons > 0 && completedLessons >= totalLessons && !enrollment.completedAt) {
    const updated = await prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { completedAt: new Date() },
      select: { completedAt: true },
    })
    courseCompletedAt = updated.completedAt
  }

  // Return the same shape as getCourseProgress so callers can reconcile immediately
  return getCourseProgressSummary(userId, courseId, courseCompletedAt)
}

async function getCourseProgressSummary(userId: string, courseId: string, completedAt: Date | null) {
  const [modules, progressDetails] = await Promise.all([
    prisma.courseModule.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        order: true,
        lessons: {
          orderBy: { order: 'asc' },
          select: { id: true, title: true, order: true },
        },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, courseId },
      select: { lessonId: true, completedAt: true },
    }),
  ])

  const completedLessonIds = new Set(progressDetails.map((progress) => progress.lessonId))
  const lessons = modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      ...lesson,
      moduleId: module.id,
    })),
  )
  const totalLessons = lessons.length
  const completedLessons = completedLessonIds.size
  const percentage = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100)
  const nextLesson = lessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? null
  const currentModule =
    modules.find((module) => module.lessons.some((lesson) => lesson.id === nextLesson?.id))
    ?? modules.find((module) => module.lessons.some((lesson) => completedLessonIds.has(lesson.id)))
    ?? modules[0]
    ?? null

  return {
    courseId,
    totalLessons,
    completedLessons,
    percentage,
    completedAt,
    nextLessonId: nextLesson?.id ?? null,
    currentModule: currentModule
      ? {
          id: currentModule.id,
          title: currentModule.title,
          totalLessons: currentModule.lessons.length,
          completedLessons: currentModule.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length,
        }
      : null,
    modules: modules.map((module) => ({
      id: module.id,
      title: module.title,
      totalLessons: module.lessons.length,
      completedLessons: module.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length,
    })),
    lessonProgress: progressDetails,
  }
}

export async function updateLessonWatchProgress(
  userId: string,
  lessonId: string,
  input: UpdateLessonWatchProgressInput,
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true },
  })
  if (!lesson) throw new AppError(404, 'Lesson not found')

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.courseId } },
  })
  if (!enrollment) throw new AppError(403, 'Not enrolled in this course')

  const existing = await prisma.lessonWatchProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { watchedSeconds: true },
  })

  const nextWatchedSeconds =
    input.watchedSeconds === undefined
      ? existing?.watchedSeconds ?? 0
      : Math.max(existing?.watchedSeconds ?? 0, Math.floor(input.watchedSeconds))

  const watchProgress = await prisma.lessonWatchProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      courseId: lesson.courseId,
      watchedSeconds: nextWatchedSeconds,
      lastPositionSeconds: Math.floor(input.lastPositionSeconds ?? 0),
    },
    update: {
      watchedSeconds: nextWatchedSeconds,
      ...(input.lastPositionSeconds !== undefined
        ? { lastPositionSeconds: Math.floor(input.lastPositionSeconds) }
        : {}),
    },
    select: {
      lessonId: true,
      courseId: true,
      watchedSeconds: true,
      lastPositionSeconds: true,
      updatedAt: true,
    },
  })

  if (input.completed === true) {
    await markLessonComplete(userId, lessonId, lesson.courseId)
  }

  return watchProgress
}

export async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  return enrollment !== null
}
