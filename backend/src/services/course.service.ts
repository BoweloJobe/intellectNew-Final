import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'
import { fireNotification } from './notification.service.js'
import {
  assertLessonVideoStorageKey,
  buildPublicVideoUrl,
  generateUploadIntent,
  verifyStoredVideoExists,
} from '../lib/storage.js'
import type {
  CreateCourseInput,
  UpdateCourseInput,
  CreateModuleInput,
  UpdateModuleInput,
  CreateLessonInput,
  UpdateLessonInput,
  CreateStandaloneLessonInput,
  RequestLessonVideoUploadInput,
  AttachLessonVideoInput,
} from '../validation/course.validation.js'

const STANDALONE_MODULE_TITLE = 'Standalone lessons'
const APPROVED_COURSE_READ_ONLY_MESSAGE =
  'Approved courses are read-only. Create a revision before changing live content.'

type SubmissionLessonCandidate = {
  title: string | null
  description: string | null
  notes: string | null
  videoUrl: string | null
  videoUploadStatus: string | null
  quiz: { questions: Array<{ id: string }> } | null
}

type SubmissionModuleCandidate = {
  lessons: SubmissionLessonCandidate[]
}

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
  quiz: {
    select: {
      id: true,
      timeLimitSeconds: true,
    },
  },
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
  quiz: {
    select: {
      id: true,
      timeLimitSeconds: true,
      questions: {
        orderBy: { order: 'asc' as const },
        select: {
          id: true,
          text: true,
          explanation: true,
          order: true,
          questionType: true,
          answerKey: true,
          options: {
            orderBy: { order: 'asc' as const },
            select: { id: true, text: true, isCorrect: true, order: true },
          },
        },
      },
    },
  },
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
  modules: {
    orderBy: { order: 'asc' as const },
    select: {
      id: true,
      title: true,
      order: true,
      _count: { select: { lessons: true } },
    },
  },
} as const

/** Admin moderation queue: full module/lesson/quiz detail for review decisions */
const courseModerationQueueSelect = {
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
  updatedAt: true,
  rejectionReason: true,
  instructor: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
  modules: {
    orderBy: { order: 'asc' as const },
    select: instructorModuleWithLessonsSelect,
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
  const course = await assertCourseOwnership(courseId, instructorId)
  assertCourseMutable(course.status)
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
  await assertCourseReadyForReview(course, courseId)
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

type CourseAuthoringUser = { id: string; role: string }

export async function requestLessonVideoUpload(
  courseId: string,
  moduleId: string,
  lessonId: string,
  user: CourseAuthoringUser,
  input: RequestLessonVideoUploadInput,
) {
  const lesson = await assertLessonAuthoringAccess(courseId, moduleId, lessonId, user)
  assertCourseMutable(lesson.module.course.status)
  const intent = await generateUploadIntent({
    courseId,
    moduleId,
    lessonId,
    filename: input.filename,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
  })
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
  courseId: string,
  moduleId: string,
  lessonId: string,
  user: CourseAuthoringUser,
  input: AttachLessonVideoInput,
) {
  const lesson = await assertLessonAuthoringAccess(courseId, moduleId, lessonId, user)
  assertCourseMutable(lesson.module.course.status)
  assertLessonVideoStorageKey(input.videoStorageKey, { courseId, moduleId, lessonId })
  await verifyStoredVideoExists(input.videoStorageKey)
  const videoUrl = buildPublicVideoUrl(input.videoStorageKey)

  return prisma.lesson.update({
    where: { id: lessonId },
    data: {
      videoStorageKey: input.videoStorageKey,
      videoProvider: 'SUPABASE',
      videoUrl,
      videoDurationSecs: input.videoDurationSecs,
      videoUploadStatus: 'READY',
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
  const watchProgress = canReadAllCourseLessons
    ? await prisma.lessonWatchProgress.findMany({
      where: { userId: user.id, courseId: lesson.courseId },
      select: {
        lessonId: true,
        watchedSeconds: true,
        lastPositionSeconds: true,
        updatedAt: true,
      },
    })
    : []
  const watchProgressByLessonId = new Map(watchProgress.map((item) => [item.lessonId, item]))
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
      watchProgress: canReadCandidate ? watchProgressByLessonId.get(candidate.id) ?? null : null,
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
  const course = await assertCourseOwnership(courseId, instructorId)
  assertCourseMutable(course.status)
  return prisma.courseModule.create({
    data: { courseId, title: input.title, order: input.order },
  })
}

export async function updateModule(
  moduleId: string,
  instructorId: string,
  input: UpdateModuleInput,
) {
  const module = await assertModuleOwnership(moduleId, instructorId)
  assertCourseMutable(module.course.status)
  return prisma.courseModule.update({
    where: { id: moduleId },
    data: input,
  })
}

export async function deleteModule(moduleId: string, instructorId: string) {
  const module = await assertModuleOwnership(moduleId, instructorId)
  assertCourseMutable(module.course.status)
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
  const course = await assertCourseOwnership(courseId, instructorId)
  assertCourseMutable(course.status)
  await assertModuleBelongsToCourse(moduleId, courseId)
  return prisma.lesson.create({
    data: { ...input, moduleId, courseId },
  })
}

export async function createStandaloneLesson(
  courseId: string,
  user: CourseAuthoringUser,
  input: CreateStandaloneLessonInput,
) {
  const course = await assertCourseAuthoringAccess(courseId, user)
  assertCourseMutable(course.status)

  let module = await prisma.courseModule.findFirst({
    where: { courseId, title: STANDALONE_MODULE_TITLE },
    select: { id: true },
  })

  if (!module) {
    const moduleCount = await prisma.courseModule.count({ where: { courseId } })
    module = await prisma.courseModule.create({
      data: {
        courseId,
        title: STANDALONE_MODULE_TITLE,
        order: moduleCount,
      },
      select: { id: true },
    })
  }

  const lessonCount = await prisma.lesson.count({
    where: { courseId, moduleId: module.id },
  })

  await prisma.lesson.create({
    data: {
      courseId,
      moduleId: module.id,
      title: input.title?.trim() || 'New lesson',
      order: lessonCount,
      estimatedMinutes: 20,
      isFree: false,
    },
  })

  return getCourseWithContent(courseId, { instructorView: true })
}

export async function updateLesson(
  lessonId: string,
  instructorId: string,
  input: UpdateLessonInput,
) {
  const lesson = await assertLessonOwnership(lessonId, instructorId)
  assertCourseMutable(lesson.module.course.status)
  return prisma.lesson.update({
    where: { id: lessonId },
    data: input,
  })
}

export async function deleteLesson(lessonId: string, instructorId: string) {
  const lesson = await assertLessonOwnership(lessonId, instructorId)
  assertCourseMutable(lesson.module.course.status)
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
    select: courseModerationQueueSelect,
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

function assertCourseMutable(status: string) {
  if (status !== 'DRAFT' && status !== 'REJECTED') {
    throw new AppError(409, APPROVED_COURSE_READ_ONLY_MESSAGE)
  }
}

function hasMeaningfulText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function lessonHasMeaningfulLearningContent(lesson: SubmissionLessonCandidate): boolean {
  return (
    hasMeaningfulText(lesson.videoUrl)
    || lesson.videoUploadStatus === 'READY'
    || hasMeaningfulText(lesson.notes)
    || hasMeaningfulText(lesson.description)
    || ((lesson.quiz?.questions.length ?? 0) > 0)
  )
}

async function assertCourseReadyForReview(
  course: { title?: string | null; description?: string | null },
  courseId: string,
) {
  if (!hasMeaningfulText(course.title)) {
    throw new AppError(422, 'Add a course title before submitting for review')
  }

  if (!hasMeaningfulText(course.description)) {
    throw new AppError(422, 'Add a course description before submitting for review')
  }

  const modules = await prisma.courseModule.findMany({
    where: { courseId },
    select: {
      id: true,
      lessons: {
        select: {
          id: true,
          title: true,
          description: true,
          notes: true,
          videoUrl: true,
          videoUploadStatus: true,
          quiz: {
            select: {
              questions: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  })

  if (modules.length === 0) {
    throw new AppError(422, 'Add at least one module before submitting for review')
  }

  const lessons = (modules as SubmissionModuleCandidate[]).flatMap((module) => module.lessons)
  const hasLessonWithMeaningfulTitle = lessons.some((lesson) => hasMeaningfulText(lesson.title))
  if (!hasLessonWithMeaningfulTitle) {
    throw new AppError(422, 'Add a meaningful lesson title before submitting for review')
  }

  const hasMeaningfulLearningContent = lessons.some(lessonHasMeaningfulLearningContent)
  if (!hasMeaningfulLearningContent) {
    throw new AppError(
      422,
      'Add lesson learning content before submitting: attach a ready video, add notes or a description, or create a quiz question',
    )
  }
}

async function assertCourseAuthoringAccess(courseId: string, user: CourseAuthoringUser) {
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new AppError(404, 'Course not found')
  if (user.role !== 'ADMIN' && course.instructorId !== user.id) {
    throw new AppError(403, 'Access denied')
  }
  return course
}

async function assertModuleOwnership(moduleId: string, instructorId: string) {
  const module = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: { course: { select: { instructorId: true, status: true } } },
  })
  if (!module) throw new AppError(404, 'Module not found')
  if (module.course.instructorId !== instructorId) throw new AppError(403, 'Access denied')
  return module
}

async function assertLessonOwnership(lessonId: string, instructorId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { select: { instructorId: true, status: true } } } } },
  })
  if (!lesson) throw new AppError(404, 'Lesson not found')
  if (lesson.module.course.instructorId !== instructorId) throw new AppError(403, 'Access denied')
  return lesson
}

async function assertLessonAuthoringAccess(
  courseId: string,
  moduleId: string,
  lessonId: string,
  user: CourseAuthoringUser,
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { select: { instructorId: true, status: true } } } } },
  })
  if (!lesson) throw new AppError(404, 'Lesson not found')
  if (lesson.courseId !== courseId || lesson.moduleId !== moduleId) {
    throw new AppError(404, 'Lesson not found in this course module')
  }
  if (user.role !== 'ADMIN' && lesson.module.course.instructorId !== user.id) {
    throw new AppError(403, 'Access denied')
  }
  return lesson
}

async function assertModuleBelongsToCourse(moduleId: string, courseId: string) {
  const module = await prisma.courseModule.findFirst({
    where: { id: moduleId, courseId },
  })
  if (!module) throw new AppError(404, 'Module not found in this course')
  return module
}
