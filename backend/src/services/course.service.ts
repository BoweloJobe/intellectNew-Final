import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'
import { fireNotification } from './notification.service.js'
import { generateUploadIntent } from '../lib/storage.js'
import type {
  CreateCourseInput,
  UpdateCourseInput,
  CreateModuleInput,
  UpdateModuleInput,
  CreateLessonInput,
  UpdateLessonInput,
  AttachLessonVideoInput,
} from '../validation/course.validation.js'

// ─── Selectors ───────────────────────────────────────────────────────────────

// Public/student-facing lesson fields (no internal storage keys)
const lessonSelect = {
  id: true,
  title: true,
  description: true,
  notes: true,
  videoUrl: true,
  videoDurationSecs: true,
  estimatedMinutes: true,
  order: true,
  isFree: true,
  createdAt: true,
  updatedAt: true,
} as const

// Instructor-facing: includes video upload status fields, still omits raw storageKey
const instructorLessonSelect = {
  id: true,
  title: true,
  description: true,
  notes: true,
  videoUrl: true,
  videoDurationSecs: true,
  estimatedMinutes: true,
  order: true,
  isFree: true,
  videoProvider: true,
  videoUploadStatus: true,
  createdAt: true,
  updatedAt: true,
} as const

const lessonPageLessonSelect = {
  id: true,
  moduleId: true,
  courseId: true,
  title: true,
  description: true,
  notes: true,
  videoUrl: true,
  videoDurationSecs: true,
  estimatedMinutes: true,
  order: true,
  isFree: true,
  createdAt: true,
  updatedAt: true,
  quiz: { select: { id: true } },
} as const

const moduleWithLessonsSelect = {
  id: true,
  title: true,
  order: true,
  lessons: {
    orderBy: { order: 'asc' as const },
    select: lessonSelect,
  },
} as const

const instructorModuleWithLessonsSelect = {
  id: true,
  title: true,
  order: true,
  lessons: {
    orderBy: { order: 'asc' as const },
    select: instructorLessonSelect,
  },
} as const

const coursePublicSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  difficulty: true,
  thumbnailUrl: true,
  estimatedHours: true,
  price: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  instructor: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
} as const

// ─── Instructor: Course management ───────────────────────────────────────────

export async function createCourse(instructorId: string, input: CreateCourseInput) {
  return prisma.course.create({
    data: { ...input, instructorId },
    select: coursePublicSelect,
  })
}

export async function updateCourse(
  courseId: string,
  instructorId: string,
  input: UpdateCourseInput,
) {
  await assertCourseOwnership(courseId, instructorId)
  return prisma.course.update({
    where: { id: courseId },
    data: input,
    select: coursePublicSelect,
  })
}

export async function submitCourseForReview(courseId: string, instructorId: string) {
  const course = await assertCourseOwnership(courseId, instructorId)
  if (course.status !== 'DRAFT' && course.status !== 'REJECTED') {
    throw new AppError(409, 'Course can only be submitted from DRAFT or REJECTED status')
  }
  // Require at least one lesson so reviewers are not presented with empty courses
  const lessonCount = await prisma.lesson.count({ where: { courseId } })
  if (lessonCount === 0) {
    throw new AppError(422, 'Add at least one lesson before submitting for review')
  }
  return prisma.course.update({
    where: { id: courseId },
    data: { status: 'PENDING_REVIEW', rejectionReason: null },
    select: coursePublicSelect,
  })
}

export async function getMyCourses(instructorId: string) {
  return prisma.course.findMany({
    where: { instructorId },
    orderBy: { updatedAt: 'desc' },
    select: {
      ...coursePublicSelect,
      rejectionReason: true,
      modules: {
        orderBy: { order: 'asc' },
        select: instructorModuleWithLessonsSelect,
      },
    },
  })
}

export async function getMyCourseDetail(courseId: string, instructorId: string) {
  const course = await assertCourseOwnership(courseId, instructorId)
  return getCourseWithContent(course.id, { instructorView: true })
}

export async function deleteCourse(courseId: string, instructorId: string) {
  const course = await assertCourseOwnership(courseId, instructorId)
  // Guard: approved courses with enrollments must not be hard-deleted
  if (course.status === 'APPROVED') {
    const enrollmentCount = await prisma.enrollment.count({ where: { courseId } })
    if (enrollmentCount > 0) {
      throw new AppError(409, 'Cannot delete a published course that has active enrollments')
    }
  }
  // Cascade on CourseModule → Lesson is configured in schema (onDelete: Cascade)
  await prisma.course.delete({ where: { id: courseId } })
}

export async function requestLessonVideoUpload(lessonId: string, instructorId: string) {
  await assertLessonOwnership(lessonId, instructorId)
  const intent = generateUploadIntent(lessonId)
  // Mark the lesson as having a pending upload so the UI can reflect state
  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      videoStorageKey:   intent.storageKey,
      videoProvider:     intent.provider,
      videoUploadStatus: 'PENDING',
    },
  })
  return intent
}

export async function attachLessonVideo(
  lessonId: string,
  instructorId: string,
  input: AttachLessonVideoInput,
) {
  await assertLessonOwnership(lessonId, instructorId)
  return prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...input,
      videoUploadStatus: input.videoUploadStatus ?? 'READY',
    },
    select: instructorLessonSelect,
  })
}

// ─── Instructor: Module management ───────────────────────────────────────────

export async function getLessonPageForUser(lessonId: string, user: { id: string; role: string }) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      ...lessonPageLessonSelect,
      module: {
        select: {
          id: true,
          title: true,
          order: true,
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true,
              thumbnailUrl: true,
              status: true,
              instructorId: true,
              instructor: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
        },
      },
    },
  })

  if (!lesson) throw new AppError(404, 'Lesson not found')

  const course = lesson.module.course
  const isAdmin = user.role === 'ADMIN'
  const isInstructorOwner = course.instructorId === user.id
  const isPublished = course.status === 'APPROVED'
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: lesson.courseId } },
    select: { id: true },
  })
  const isEnrolled = enrollment !== null
  const canReadFullLesson = isAdmin || isInstructorOwner || isEnrolled || (isPublished && lesson.isFree)

  if (!canReadFullLesson) {
    throw new AppError(403, 'Lesson is locked')
  }

  const modules = await prisma.courseModule.findMany({
    where: { courseId: lesson.courseId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      order: true,
      lessons: {
        orderBy: { order: 'asc' },
        select: lessonPageLessonSelect,
      },
    },
  })

  const canReadAllCourseLessons = isAdmin || isInstructorOwner || isEnrolled
  const mapLesson = (
    candidate: {
      id: string
      courseId: string
      moduleId: string
      title: string
      description: string | null
      notes: string | null
      videoUrl: string | null
      videoDurationSecs: number | null
      estimatedMinutes: number | null
      order: number
      isFree: boolean
      quiz: { id: string } | null
      createdAt: Date
      updatedAt: Date
    },
    module: { id: string; title: string; order: number },
  ) => {
    const canReadCandidate = canReadAllCourseLessons || (isPublished && candidate.isFree)

    return {
      id: candidate.id,
      courseId: candidate.courseId,
      moduleId: module.id,
      moduleTitle: module.title,
      title: candidate.title,
      description: canReadCandidate ? candidate.description : null,
      notes: canReadCandidate ? candidate.notes : null,
      videoUrl: canReadCandidate ? candidate.videoUrl : null,
      videoDurationSecs: candidate.videoDurationSecs,
      estimatedMinutes: candidate.estimatedMinutes,
      order: candidate.order,
      isFree: candidate.isFree,
      quizId: canReadCandidate ? candidate.quiz?.id ?? null : null,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      course: {
        id: course.id,
        title: course.title,
        category: course.category,
        difficulty: course.difficulty,
        thumbnailUrl: course.thumbnailUrl,
        instructor: course.instructor,
      },
    }
  }

  const courseLessons = modules.flatMap((module) =>
    module.lessons.map((candidate) => mapLesson(candidate, module)),
  )
  const resolvedLesson = courseLessons.find((candidate) => candidate.id === lesson.id)

  return {
    lesson: resolvedLesson,
    courseLessons,
    furtherLessons: courseLessons.filter(
      (candidate) => candidate.id !== lesson.id && candidate.moduleId === lesson.moduleId,
    ),
  }
}

export async function createModule(
  courseId: string,
  instructorId: string,
  input: CreateModuleInput,
) {
  await assertCourseOwnership(courseId, instructorId)
  return prisma.courseModule.create({
    data: { courseId, title: input.title, order: input.order },
  })
}

export async function updateModule(
  moduleId: string,
  instructorId: string,
  input: UpdateModuleInput,
) {
  await assertModuleOwnership(moduleId, instructorId)
  return prisma.courseModule.update({
    where: { id: moduleId },
    data: input,
  })
}

export async function deleteModule(moduleId: string, instructorId: string) {
  const module = await assertModuleOwnership(moduleId, instructorId)
  // Guard: if any student has completed a lesson inside this module, refuse
  const progressCount = await prisma.lessonProgress.count({
    where: { lesson: { moduleId } },
  })
  if (progressCount > 0) {
    throw new AppError(409, 'Cannot delete a module that has student lesson progress')
  }
  await prisma.courseModule.delete({ where: { id: module.id } })
}

// ─── Instructor: Lesson management ───────────────────────────────────────────

export async function createLesson(
  moduleId: string,
  courseId: string,
  instructorId: string,
  input: CreateLessonInput,
) {
  await assertCourseOwnership(courseId, instructorId)
  await assertModuleBelongsToCourse(moduleId, courseId)
  return prisma.lesson.create({
    data: { ...input, moduleId, courseId },
  })
}

export async function updateLesson(
  lessonId: string,
  instructorId: string,
  input: UpdateLessonInput,
) {
  await assertLessonOwnership(lessonId, instructorId)
  return prisma.lesson.update({
    where: { id: lessonId },
    data: input,
  })
}

export async function deleteLesson(lessonId: string, instructorId: string) {
  await assertLessonOwnership(lessonId, instructorId)
  const progressCount = await prisma.lessonProgress.count({ where: { lessonId } })
  if (progressCount > 0) {
    throw new AppError(409, 'Cannot delete a lesson that has student progress')
  }
  await prisma.lesson.delete({ where: { id: lessonId } })
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getPendingCourses() {
  return prisma.course.findMany({
    where: { status: 'PENDING_REVIEW' },
    orderBy: { updatedAt: 'asc' },
    select: {
      ...coursePublicSelect,
      _count: { select: { modules: true } },
    },
  })
}

export async function approveCourse(courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new AppError(404, 'Course not found')
  if (course.status !== 'PENDING_REVIEW') {
    throw new AppError(409, 'Course is not pending review')
  }
  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { status: 'APPROVED', publishedAt: new Date(), rejectionReason: null },
    select: coursePublicSelect,
  })
  fireNotification(
    course.instructorId,
    'COURSE_APPROVED',
    'Course approved',
    `Your course "${course.title}" has been approved and is now live.`,
    { courseId },
  )
  return updated
}

export async function rejectCourse(courseId: string, reason: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new AppError(404, 'Course not found')
  if (course.status !== 'PENDING_REVIEW') {
    throw new AppError(409, 'Course is not pending review')
  }
  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { status: 'REJECTED', rejectionReason: reason },
    select: coursePublicSelect,
  })
  fireNotification(
    course.instructorId,
    'COURSE_REJECTED',
    'Course needs changes',
    `Your course "${course.title}" was not approved. Reason: ${reason}`,
    { courseId, reason },
  )
  return updated
}

// ─── Public / Student ────────────────────────────────────────────────────────

export async function listApprovedCourses(params: {
  category?: string
  difficulty?: string
  search?: string
}) {
  return prisma.course.findMany({
    where: {
      status: 'APPROVED',
      ...(params.category && { category: params.category }),
      ...(params.difficulty && { difficulty: params.difficulty as never }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search } },
          { description: { contains: params.search } },
        ],
      }),
    },
    orderBy: { publishedAt: 'desc' },
    select: coursePublicSelect,
  })
}

export async function listSavedCourses(userId: string) {
  const savedCourses = await prisma.savedCourse.findMany({
    where: {
      userId,
      course: { status: 'APPROVED' },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      course: {
        select: coursePublicSelect,
      },
    },
  })

  return savedCourses.map((saved) => saved.course)
}

export async function saveCourse(userId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, status: 'APPROVED' },
    select: { id: true },
  })

  if (!course) {
    throw new AppError(404, 'Course not found')
  }

  await prisma.savedCourse.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {},
    create: { userId, courseId },
  })
}

export async function unsaveCourse(userId: string, courseId: string) {
  await prisma.savedCourse.deleteMany({
    where: { userId, courseId },
  })
}

export async function getApprovedCourse(courseId: string, userId?: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, status: 'APPROVED' },
  })
  if (!course) throw new AppError(404, 'Course not found')

  // Enrolled users get full lesson content; others get public-only view
  let isEnrolled = false
  if (userId) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
    isEnrolled = enrollment !== null
  }

  return getCourseWithContent(courseId, { publicOnly: !isEnrolled })
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function getCourseWithContent(
  courseId: string,
  opts?: { publicOnly?: boolean; instructorView?: boolean },
) {
  const moduleSelector = opts?.instructorView
    ? instructorModuleWithLessonsSelect
    : moduleWithLessonsSelect

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      ...coursePublicSelect,
      rejectionReason: true,
      modules: {
        orderBy: { order: 'asc' },
        select: moduleSelector,
      },
    },
  })

  if (!course || !opts?.publicOnly) return course

  // Non-enrolled view: expose free lesson content, gate premium lesson content
  return {
    ...course,
    modules: course.modules.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(lesson => ({
        ...lesson,
        videoUrl: lesson.isFree ? lesson.videoUrl : null,
        notes: lesson.isFree ? lesson.notes : null,
      })),
    })),
  }
}

async function assertCourseOwnership(courseId: string, instructorId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new AppError(404, 'Course not found')
  if (course.instructorId !== instructorId) throw new AppError(403, 'Access denied')
  return course
}

async function assertModuleOwnership(moduleId: string, instructorId: string) {
  const module = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: { course: { select: { instructorId: true } } },
  })
  if (!module) throw new AppError(404, 'Module not found')
  if (module.course.instructorId !== instructorId) throw new AppError(403, 'Access denied')
  return module
}

async function assertLessonOwnership(lessonId: string, instructorId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { select: { instructorId: true } } } } },
  })
  if (!lesson) throw new AppError(404, 'Lesson not found')
  if (lesson.module.course.instructorId !== instructorId) throw new AppError(403, 'Access denied')
  return lesson
}

async function assertModuleBelongsToCourse(moduleId: string, courseId: string) {
  const module = await prisma.courseModule.findFirst({
    where: { id: moduleId, courseId },
  })
  if (!module) throw new AppError(404, 'Module not found in this course')
  return module
}
