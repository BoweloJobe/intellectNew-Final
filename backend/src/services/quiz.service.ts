import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'
import { fireNotification } from './notification.service.js'
import { getMySubscription } from './subscription.service.js'
import { parseKeywords, gradeKeywords } from '../lib/keyword-grader.js'
import type {
  CreateQuizInput,
  UpdateQuizInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  CreateStandaloneQuizInput,
  SubmitAttemptInput,
} from '../validation/quiz.validation.js'

const ATTEMPT_STATUS_IN_PROGRESS = 'IN_PROGRESS'
const ATTEMPT_STATUS_SUBMITTED = 'SUBMITTED'
const ATTEMPT_STATUS_EXPIRED = 'EXPIRED'
const APPROVED_COURSE_READ_ONLY_MESSAGE =
  'Approved courses are read-only. Create a revision before changing live content.'

// ─── Shared selectors ─────────────────────────────────────────────────────────

/** Full quiz shape for instructors — includes correct answers */
const quizInstructorSelect = {
  id: true,
  lessonId: true,
  instructorId: true,
  title: true,
  description: true,
  passingScore: true,
  timeLimitSeconds: true,
  isPremium: true,
  category: true,
  createdAt: true,
  updatedAt: true,
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
}

/** Student-safe quiz shape — correct answers stripped */
const quizStudentSelect = {
  id: true,
  lessonId: true,
  title: true,
  description: true,
  passingScore: true,
  timeLimitSeconds: true,
  isPremium: true,
  category: true,
  difficulty: true,
  questions: {
    orderBy: { order: 'asc' as const },
    select: {
      id: true,
      text: true,
      order: true,
      questionType: true,
      options: {
        orderBy: { order: 'asc' as const },
        select: { id: true, text: true, order: true },
      },
    },
  },
}

// ─── Ownership helpers ────────────────────────────────────────────────────────

async function assertLessonOwnership(lessonId: string, instructorId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: { select: { instructorId: true, status: true } } } } },
  })
  if (!lesson) throw new AppError(404, 'Lesson not found')
  if (lesson.module.course.instructorId !== instructorId) throw new AppError(403, 'Access denied')
  return lesson
}

async function assertQuizOwnership(quizId: string, instructorId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      lesson: {
        include: { module: { include: { course: { select: { instructorId: true, status: true } } } } },
      },
    },
  })
  if (!quiz) throw new AppError(404, 'Quiz not found')

  // Standalone quizzes: ownership tracked via instructorId field directly
  if (quiz.lessonId === null) {
    if (quiz.instructorId !== instructorId) throw new AppError(403, 'Access denied')
    return quiz
  }

  // Lesson-bound quizzes: ownership via course
  if (!quiz.lesson || quiz.lesson.module.course.instructorId !== instructorId) {
    throw new AppError(403, 'Access denied')
  }
  return quiz
}

function assertCourseMutable(status: string) {
  if (status !== 'DRAFT' && status !== 'REJECTED') {
    throw new AppError(409, APPROVED_COURSE_READ_ONLY_MESSAGE)
  }
}

// ─── Instructor: Quiz authoring ───────────────────────────────────────────────

export async function createQuiz(lessonId: string, instructorId: string, input: CreateQuizInput) {
  const lesson = await assertLessonOwnership(lessonId, instructorId)
  assertCourseMutable(lesson.module.course.status)

  const existing = await prisma.quiz.findUnique({ where: { lessonId } })
  if (existing) throw new AppError(409, 'This lesson already has a quiz')

  return prisma.quiz.create({
    data: { lessonId, ...input },
    select: quizInstructorSelect,
  })
}

export async function createStandaloneQuiz(
  instructorId: string,
  input: CreateStandaloneQuizInput,
) {
  const { questions, ...quizData } = input
  return prisma.quiz.create({
    data: {
      instructorId,
      ...quizData,
      questions: {
        create: questions.map((q, idx) => {
          if (q.questionType === 'SHORT_ANSWER') {
            return {
              text: q.text,
              explanation: q.explanation,
              questionType: 'SHORT_ANSWER',
              answerKey: q.answerKey,
              order: idx,
            }
          }
          // MCQ — questionType is 'MCQ', options are required and validated
          return {
            text: q.text,
            explanation: q.explanation,
            questionType: 'MCQ',
            order: idx,
            options: {
              create: q.options.map((o, oidx) => ({
                text: o.text,
                isCorrect: o.isCorrect,
                order: oidx,
              })),
            },
          }
        }),
      },
    },
    select: quizInstructorSelect,
  })
}

export async function updateQuiz(quizId: string, instructorId: string, input: UpdateQuizInput) {
  const quiz = await assertQuizOwnership(quizId, instructorId)
  if (quiz.lessonId !== null && quiz.lesson) {
    assertCourseMutable(quiz.lesson.module.course.status)
  }
  return prisma.quiz.update({
    where: { id: quizId },
    data: input,
    select: quizInstructorSelect,
  })
}

export async function getQuizForInstructor(lessonId: string, instructorId: string) {
  await assertLessonOwnership(lessonId, instructorId)
  const quiz = await prisma.quiz.findUnique({
    where: { lessonId },
    select: quizInstructorSelect,
  })
  if (!quiz) throw new AppError(404, 'No quiz for this lesson')
  return quiz
}

export async function addQuestion(
  quizId: string,
  instructorId: string,
  input: CreateQuestionInput,
) {
  const quiz = await assertQuizOwnership(quizId, instructorId)
  if (quiz.lessonId !== null && quiz.lesson) {
    assertCourseMutable(quiz.lesson.module.course.status)
  }

  const questionType = input.questionType ?? 'MCQ'
  const options = input.options ?? []
  return prisma.quizQuestion.create({
    data: {
      quizId,
      text: input.text,
      explanation: input.explanation,
      order: input.order,
      questionType,
      answerKey: questionType === 'SHORT_ANSWER' ? input.answerKey : undefined,
      ...(questionType === 'MCQ'
        ? {
            options: {
              createMany: {
                data: options.map((o) => ({ text: o.text, isCorrect: o.isCorrect, order: o.order })),
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      text: true,
      explanation: true,
      order: true,
      questionType: true,
      answerKey: true,
      options: { orderBy: { order: 'asc' }, select: { id: true, text: true, isCorrect: true, order: true } },
    },
  })
}

export async function updateQuestion(
  questionId: string,
  instructorId: string,
  input: UpdateQuestionInput,
) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: {
      quiz: {
        include: {
          lesson: {
            include: { module: { include: { course: { select: { instructorId: true, status: true } } } } },
          },
        },
      },
    },
  })
  if (!question) throw new AppError(404, 'Question not found')

  const quiz = question.quiz
  if (quiz.lessonId === null) {
    if (quiz.instructorId !== instructorId) throw new AppError(403, 'Access denied')
  } else {
    if (!quiz.lesson || quiz.lesson.module.course.instructorId !== instructorId) {
      throw new AppError(403, 'Access denied')
    }
    assertCourseMutable(quiz.lesson.module.course.status)
  }

  return prisma.quizQuestion.update({ where: { id: questionId }, data: input })
}

export async function deleteQuestion(questionId: string, instructorId: string) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: {
      quiz: {
        include: {
          lesson: {
            include: { module: { include: { course: { select: { instructorId: true, status: true } } } } },
          },
        },
      },
    },
  })
  if (!question) throw new AppError(404, 'Question not found')

  const quiz = question.quiz
  if (quiz.lessonId === null) {
    if (quiz.instructorId !== instructorId) throw new AppError(403, 'Access denied')
  } else {
    if (!quiz.lesson || quiz.lesson.module.course.instructorId !== instructorId) {
      throw new AppError(403, 'Access denied')
    }
    assertCourseMutable(quiz.lesson.module.course.status)
  }

  await prisma.quizQuestion.delete({ where: { id: questionId } })
}

// ─── Student: fetch and submit ────────────────────────────────────────────────

export async function getQuizForStudent(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  })
  if (!lesson) throw new AppError(404, 'Lesson not found')

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.courseId } },
  })
  if (!enrollment) throw new AppError(403, 'Not enrolled in this course')

  const quiz = await prisma.quiz.findUnique({
    where: { lessonId },
    select: quizStudentSelect,
  })
  if (!quiz) throw new AppError(404, 'No quiz for this lesson')
  return quiz
}

export async function getQuizById(quizId: string, userId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: quizStudentSelect,
  })
  if (!quiz) throw new AppError(404, 'Quiz not found')

  // Lesson-bound quizzes require course enrollment
  if (quiz.lessonId !== null) {
    const quizWithCourse = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { lesson: { select: { courseId: true } } },
    })
    if (!quizWithCourse?.lesson) throw new AppError(404, 'Quiz not found')
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: quizWithCourse.lesson.courseId } },
    })
    if (!enrollment) throw new AppError(403, 'Not enrolled in this course')
  } else if (quiz.isPremium) {
    // Standalone premium quizzes require an active subscription
    const sub = await getMySubscription(userId)
    if (!sub.isPremium) throw new AppError(403, 'A Pro subscription is required to access this quiz')
  }

  return quiz
}

async function assertStudentQuizAccess(quiz: {
  lessonId: string | null
  lesson: { courseId: string } | null
  isPremium: boolean
}, userId: string): Promise<void> {
  if (quiz.lessonId !== null) {
    if (!quiz.lesson) throw new AppError(404, 'Quiz not found')
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: quiz.lesson.courseId } },
    })
    if (!enrollment) throw new AppError(403, 'Not enrolled in this course')
    return
  }

  if (quiz.isPremium) {
    const sub = await getMySubscription(userId)
    if (!sub.isPremium) throw new AppError(403, 'A Pro subscription is required to access this quiz')
  }
}

export async function startAttempt(quizId: string, userId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      lessonId: true,
      timeLimitSeconds: true,
      isPremium: true,
      lesson: { select: { courseId: true } },
    },
  })
  if (!quiz) throw new AppError(404, 'Quiz not found')

  await assertStudentQuizAccess(quiz, userId)

  const startedAt = new Date()
  const expiresAt = quiz.timeLimitSeconds
    ? new Date(startedAt.getTime() + quiz.timeLimitSeconds * 1000)
    : null

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId,
      score: 0,
      passed: false,
      status: ATTEMPT_STATUS_IN_PROGRESS,
      startedAt,
      ...(expiresAt ? { expiresAt } : {}),
    },
    select: {
      id: true,
      quizId: true,
      status: true,
      startedAt: true,
      expiresAt: true,
    },
  })

  return {
    attemptId: attempt.id,
    quizId: attempt.quizId,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
    serverTime: startedAt.toISOString(),
    timeLimitSeconds: quiz.timeLimitSeconds,
  }
}

export async function submitAttempt(
  quizId: string,
  userId: string,
  input: SubmitAttemptInput,
) {
  // Load all questions with their correct options, type, and answerKey
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { options: { select: { id: true, isCorrect: true } } },
      },
      lesson: { select: { courseId: true } },
    },
  })
  if (!quiz) throw new AppError(404, 'Quiz not found')

  await assertStudentQuizAccess(quiz, userId)

  let existingAttempt: {
    id: string
    quizId: string
    userId: string
    status: string
    expiresAt: Date | null
  } | null = null

  if (input.attemptId) {
    existingAttempt = await prisma.quizAttempt.findUnique({
      where: { id: input.attemptId },
      select: { id: true, quizId: true, userId: true, status: true, expiresAt: true },
    })

    if (!existingAttempt || existingAttempt.quizId !== quizId || existingAttempt.userId !== userId) {
      throw new AppError(404, 'Quiz attempt not found')
    }

    if (existingAttempt.status === ATTEMPT_STATUS_SUBMITTED) {
      throw new AppError(409, 'Quiz attempt already submitted')
    }

    if (existingAttempt.status === ATTEMPT_STATUS_EXPIRED) {
      throw new AppError(409, 'Quiz attempt expired')
    }

    if (existingAttempt.expiresAt && Date.now() > existingAttempt.expiresAt.getTime()) {
      await prisma.quizAttempt.update({
        where: { id: existingAttempt.id },
        data: { status: ATTEMPT_STATUS_EXPIRED },
      })
      throw new AppError(409, 'Quiz attempt expired')
    }
  } else if (quiz.timeLimitSeconds) {
    throw new AppError(400, 'Start a quiz attempt before submitting this timed quiz')
  }

  if (input.answers.length !== quiz.questions.length) {
    throw new AppError(400, `Expected ${quiz.questions.length} answers, got ${input.answers.length}`)
  }

  // Build lookup maps keyed by questionId
  const questionMap = new Map(quiz.questions.map((q) => [q.id, q]))

  // Validate all submitted questionIds belong to this quiz
  for (const answer of input.answers) {
    if (!questionMap.has(answer.questionId)) {
      throw new AppError(400, `Question ${answer.questionId} does not belong to this quiz`)
    }
  }

  // MCQ: map questionId → correct optionId
  const correctMap = new Map<string, string>()
  for (const q of quiz.questions) {
    if (q.questionType !== 'SHORT_ANSWER') {
      const correct = q.options.find((o: { id: string; isCorrect: boolean }) => o.isCorrect)
      if (correct) correctMap.set(q.id, correct.id)
    }
  }

  // Grade each answer using marks-based system
  // MCQ question     = 1 mark available; 1 mark if correct option selected
  // SHORT_ANSWER     = N marks available (N = keyword count); 1 mark per matched keyword
  let totalMarksEarned = 0
  let totalMarksAvailable = 0

  const gradedAnswers: Array<{
    questionId: string
    selectedOptionId: string | null
    textAnswer: string | null
    isCorrect: boolean
    marksAwarded: number
  }> = []

  for (const answer of input.answers) {
    const question = questionMap.get(answer.questionId)!

    if (question.questionType === 'SHORT_ANSWER') {
      if (!Object.prototype.hasOwnProperty.call(answer, 'textAnswer')) {
        throw new AppError(400, `Question ${answer.questionId} requires textAnswer`)
      }
      if (answer.selectedOptionId !== undefined) {
        throw new AppError(400, `Question ${answer.questionId} is short-answer and must not use selectedOptionId`)
      }

      const textAnswer = answer.textAnswer ?? ''
      const keywords = parseKeywords(question.answerKey)
      // If no keywords defined the question is worth 1 mark but is always ungraded (0 earned)
      const maxMarks = keywords.length > 0 ? keywords.length : 1
      const earned = keywords.length > 0
        ? gradeKeywords(textAnswer, keywords).marksAwarded
        : 0

      totalMarksEarned += earned
      totalMarksAvailable += maxMarks

      gradedAnswers.push({
        questionId: answer.questionId,
        selectedOptionId: null,
        textAnswer,
        isCorrect: earned > 0,
        marksAwarded: earned,
      })
    } else {
      if (!Object.prototype.hasOwnProperty.call(answer, 'selectedOptionId')) {
        throw new AppError(400, `Question ${answer.questionId} requires selectedOptionId`)
      }
      if (answer.textAnswer !== undefined) {
        throw new AppError(400, `Question ${answer.questionId} is multiple-choice and must not use textAnswer`)
      }

      // MCQ
      const selectedOptionId = answer.selectedOptionId ?? ''
      const isCorrect = Boolean(selectedOptionId) && correctMap.get(answer.questionId) === selectedOptionId
      const earned = isCorrect ? 1 : 0

      totalMarksEarned += earned
      totalMarksAvailable += 1

      gradedAnswers.push({
        questionId: answer.questionId,
        selectedOptionId: selectedOptionId || null,
        textAnswer: null,
        isCorrect,
        marksAwarded: earned,
      })
    }
  }

  const score = Math.round((totalMarksEarned / Math.max(totalMarksAvailable, 1)) * 100)
  const passed = score >= quiz.passingScore

  // Build explanation map for result enrichment
  const explanationMap = new Map<string, string>()
  for (const q of quiz.questions) {
    explanationMap.set(q.id, q.explanation ?? '')
  }

  const attemptSelect = {
    id: true,
    score: true,
    passed: true,
    submittedAt: true,
    status: true,
    startedAt: true,
    expiresAt: true,
    answers: {
      select: {
        questionId: true,
        selectedOptionId: true,
        textAnswer: true,
        isCorrect: true,
        marksAwarded: true,
      },
    },
  } as const

  const attempt = existingAttempt
    ? await prisma.quizAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          score,
          passed,
          status: ATTEMPT_STATUS_SUBMITTED,
          submittedAt: new Date(),
          answers: {
            createMany: { data: gradedAnswers },
          },
        },
        select: attemptSelect,
      })
    : await prisma.quizAttempt.create({
        data: {
          quizId,
          userId,
          score,
          passed,
          status: ATTEMPT_STATUS_SUBMITTED,
          answers: {
            createMany: { data: gradedAnswers },
          },
        },
        select: attemptSelect,
      })

  // Enrich each answer with question-type-specific grading details
  const enrichedAnswers = attempt.answers.map((a) => {
    const question = questionMap.get(a.questionId)!

    if (question.questionType === 'SHORT_ANSWER') {
      const keywords = parseKeywords(question.answerKey)
      const maxMarks = keywords.length > 0 ? keywords.length : 1
      const { matchedKeywords } = keywords.length > 0
        ? gradeKeywords(a.textAnswer ?? '', keywords)
        : { matchedKeywords: [] as string[] }

      return {
        questionId: a.questionId,
        questionType: 'SHORT_ANSWER' as const,
        selectedOptionId: null as null,
        textAnswer: a.textAnswer,
        isCorrect: a.isCorrect,
        marksAwarded: a.marksAwarded,
        maxMarks,
        matchedKeywords,
        correctOptionId: '',
        explanation: explanationMap.get(a.questionId) ?? '',
      }
    }

    return {
      questionId: a.questionId,
      questionType: 'MCQ' as const,
      selectedOptionId: a.selectedOptionId,
      textAnswer: null as null,
      isCorrect: a.isCorrect,
      marksAwarded: a.marksAwarded,
      maxMarks: 1,
      matchedKeywords: [] as string[],
      correctOptionId: correctMap.get(a.questionId) ?? '',
      explanation: explanationMap.get(a.questionId) ?? '',
    }
  })

  const result = {
    ...attempt,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
    submittedAt: attempt.submittedAt.toISOString(),
    answers: enrichedAnswers,
    totalQuestions: quiz.questions.length,
    marksEarned: totalMarksEarned,
    marksTotal: totalMarksAvailable,
    passingScore: quiz.passingScore,
  }

  fireNotification(
    userId,
    passed ? 'QUIZ_PASSED' : 'QUIZ_FAILED',
    passed ? 'Quiz passed!' : 'Quiz failed',
    passed
      ? `You scored ${score}% and passed the quiz.`
      : `You scored ${score}%. The passing score is ${quiz.passingScore}%. Try again!`,
    { quizId, score, passed },
  )

  return result
}


export async function getMyAttempts(quizId: string, userId: string) {
  return prisma.quizAttempt.findMany({
    where: { quizId, userId, status: ATTEMPT_STATUS_SUBMITTED },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      score: true,
      passed: true,
      submittedAt: true,
    },
  })
}

/** All quizzes available to a student: enrolled-course quizzes + free standalone quizzes */
export async function getStudentAvailableQuizzes(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: { courseId: true },
  })

  const enrolledCourseIds = enrollments.map((e) => e.courseId)

  // Check if student has a premium subscription
  const sub = await getMySubscription(userId)
  const hasPremium = sub.isPremium

  // Lesson-bound quizzes from enrolled courses
  const lessonQuizzes = enrolledCourseIds.length > 0
    ? await prisma.quiz.findMany({
        where: { lesson: { courseId: { in: enrolledCourseIds } } },
        select: {
          id: true,
          title: true,
          timeLimitSeconds: true,
          isPremium: true,
          category: true,
          lesson: {
            select: {
              id: true,
              title: true,
              module: {
                select: {
                  course: {
                    select: { id: true, category: true, difficulty: true },
                  },
                },
              },
            },
          },
          _count: { select: { questions: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
    : []

  // Standalone quizzes: accessible to everyone (free) or only premium users
  const standaloneQuizzes = await prisma.quiz.findMany({
    where: {
      lessonId: null,
      // Return free ones always; return premium ones only if student has premium
      ...(hasPremium ? {} : { isPremium: false }),
    },
    select: {
      id: true,
      title: true,
      timeLimitSeconds: true,
      isPremium: true,
      category: true,
      difficulty: true,
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return [...lessonQuizzes, ...standaloneQuizzes]
}

/** Most recent quiz attempt per quiz for the student */
export async function getStudentAttemptHistory(userId: string) {
  return prisma.quizAttempt.findMany({
    where: { userId, status: ATTEMPT_STATUS_SUBMITTED },
    orderBy: { submittedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      quizId: true,
      score: true,
      passed: true,
      submittedAt: true,
      quiz: {
        select: {
          title: true,
          category: true,
          _count: { select: { questions: true } },
          lesson: {
            select: {
              module: {
                select: {
                  course: { select: { category: true } },
                },
              },
            },
          },
        },
      },
    },
  })
}
