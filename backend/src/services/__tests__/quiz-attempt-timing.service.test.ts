import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../errors/AppError.js'

const mockPrisma = vi.hoisted(() => ({
  enrollment: { findUnique: vi.fn() },
  lesson: { findUnique: vi.fn() },
  quiz: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  quizAttempt: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))
vi.mock('../../services/notification.service.js', () => ({ fireNotification: vi.fn() }))
vi.mock('../../services/subscription.service.js', () => ({
  getMySubscription: vi.fn(async () => ({ isPremium: true })),
}))

import { createQuiz, getQuizById, startAttempt, submitAttempt, updateQuiz } from '../quiz.service.js'

const now = new Date('2026-06-10T12:00:00.000Z')

const quizWithOneQuestion = {
  id: 'quiz-1',
  lessonId: null,
  timeLimitSeconds: 60,
  isPremium: false,
  lesson: null,
  passingScore: 70,
  questions: [
    {
      id: 'question-1',
      questionType: 'MCQ',
      answerKey: null,
      explanation: 'Because it is correct.',
      options: [
        { id: 'option-1', isCorrect: true },
        { id: 'option-2', isCorrect: false },
      ],
    },
  ],
}

const quizWithShortAnswerQuestion = {
  id: 'quiz-1',
  lessonId: null,
  timeLimitSeconds: 60,
  isPremium: false,
  lesson: null,
  passingScore: 70,
  questions: [
    {
      id: 'question-1',
      questionType: 'SHORT_ANSWER',
      answerKey: 'photosynthesis, chlorophyll',
      explanation: 'Photosynthesis depends on chlorophyll.',
      options: [],
    },
  ],
}

describe('quiz attempt timing service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    vi.resetAllMocks()
  })

  it('saves a lesson quiz time limit for instructor-authored quizzes', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({
      id: 'lesson-1',
      module: { course: { instructorId: 'instructor-1' } },
    })
    mockPrisma.quiz.findUnique.mockResolvedValue(null)
    mockPrisma.quiz.create.mockResolvedValue({
      id: 'quiz-1',
      lessonId: 'lesson-1',
      title: 'Timed lesson quiz',
      description: null,
      passingScore: 70,
      timeLimitSeconds: 600,
      questions: [],
    })

    await createQuiz('lesson-1', 'instructor-1', {
      title: 'Timed lesson quiz',
      timeLimitSeconds: 600,
    })

    expect(mockPrisma.quiz.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        lessonId: 'lesson-1',
        title: 'Timed lesson quiz',
        timeLimitSeconds: 600,
      }),
    }))
  })

  it('allows instructors to clear an existing quiz time limit', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue({
      id: 'quiz-1',
      lessonId: null,
      instructorId: 'instructor-1',
    })
    mockPrisma.quiz.update.mockResolvedValue({
      id: 'quiz-1',
      timeLimitSeconds: null,
      questions: [],
    })

    await updateQuiz('quiz-1', 'instructor-1', { timeLimitSeconds: null })

    expect(mockPrisma.quiz.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'quiz-1' },
      data: { timeLimitSeconds: null },
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts an attempt and returns timing metadata for timed quizzes', async () => {
    const expiresAt = new Date('2026-06-10T12:01:00.000Z')
    mockPrisma.quiz.findUnique.mockResolvedValue({
      id: 'quiz-1',
      lessonId: null,
      timeLimitSeconds: 60,
      isPremium: false,
      lesson: null,
    })
    mockPrisma.quizAttempt.create.mockResolvedValue({
      id: 'attempt-1',
      quizId: 'quiz-1',
      status: 'IN_PROGRESS',
      startedAt: now,
      expiresAt,
    })

    await expect(startAttempt('quiz-1', 'user-1')).resolves.toEqual({
      attemptId: 'attempt-1',
      quizId: 'quiz-1',
      status: 'IN_PROGRESS',
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      serverTime: now.toISOString(),
      timeLimitSeconds: 60,
    })

    expect(mockPrisma.quizAttempt.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        quizId: 'quiz-1',
        userId: 'user-1',
        score: 0,
        passed: false,
        status: 'IN_PROGRESS',
        startedAt: now,
        expiresAt,
      }),
    }))
  })

  it('submits a live timed attempt before expiry', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(quizWithOneQuestion)
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      quizId: 'quiz-1',
      userId: 'user-1',
      status: 'IN_PROGRESS',
      expiresAt: new Date('2026-06-10T12:01:00.000Z'),
    })
    mockPrisma.quizAttempt.update.mockResolvedValue({
      id: 'attempt-1',
      score: 100,
      passed: true,
      status: 'SUBMITTED',
      startedAt: now,
      expiresAt: new Date('2026-06-10T12:01:00.000Z'),
      submittedAt: now,
      answers: [
        {
          questionId: 'question-1',
          selectedOptionId: 'option-1',
          textAnswer: null,
          isCorrect: true,
          marksAwarded: 1,
        },
      ],
    })

    const result = await submitAttempt('quiz-1', 'user-1', {
      attemptId: 'attempt-1',
      answers: [{ questionId: 'question-1', selectedOptionId: 'option-1' }],
    })

    expect(result.score).toBe(100)
    expect(mockPrisma.quizAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attempt-1' },
      data: expect.objectContaining({
        score: 100,
        passed: true,
        status: 'SUBMITTED',
        submittedAt: now,
      }),
    }))
  })

  it('grades short-answer attempts from textAnswer, not selectedOptionId', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(quizWithShortAnswerQuestion)
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      quizId: 'quiz-1',
      userId: 'user-1',
      status: 'IN_PROGRESS',
      expiresAt: new Date('2026-06-10T12:01:00.000Z'),
    })
    mockPrisma.quizAttempt.update.mockResolvedValue({
      id: 'attempt-1',
      score: 100,
      passed: true,
      status: 'SUBMITTED',
      startedAt: now,
      expiresAt: new Date('2026-06-10T12:01:00.000Z'),
      submittedAt: now,
      answers: [
        {
          questionId: 'question-1',
          selectedOptionId: null,
          textAnswer: 'Photosynthesis uses chlorophyll',
          isCorrect: true,
          marksAwarded: 2,
        },
      ],
    })

    const result = await submitAttempt('quiz-1', 'user-1', {
      attemptId: 'attempt-1',
      answers: [{ questionId: 'question-1', textAnswer: 'Photosynthesis uses chlorophyll' }],
    })

    expect(result.score).toBe(100)
    expect(result.marksEarned).toBe(2)
    expect(result.answers[0]).toMatchObject({
      questionType: 'SHORT_ANSWER',
      selectedOptionId: null,
      textAnswer: 'Photosynthesis uses chlorophyll',
      marksAwarded: 2,
      maxMarks: 2,
      matchedKeywords: ['photosynthesis', 'chlorophyll'],
    })
    expect(mockPrisma.quizAttempt.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        answers: {
          createMany: {
            data: [
              {
                questionId: 'question-1',
                selectedOptionId: null,
                textAnswer: 'Photosynthesis uses chlorophyll',
                isCorrect: true,
                marksAwarded: 2,
              },
            ],
          },
        },
      }),
    }))
  })

  it('marks late timed submissions expired and rejects grading', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(quizWithOneQuestion)
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      quizId: 'quiz-1',
      userId: 'user-1',
      status: 'IN_PROGRESS',
      expiresAt: new Date('2026-06-10T11:59:59.000Z'),
    })
    mockPrisma.quizAttempt.update.mockResolvedValue({})

    await expect(submitAttempt('quiz-1', 'user-1', {
      attemptId: 'attempt-1',
      answers: [{ questionId: 'question-1', selectedOptionId: 'option-1' }],
    })).rejects.toMatchObject(new AppError(409, 'Quiz attempt expired'))

    expect(mockPrisma.quizAttempt.update).toHaveBeenCalledWith({
      where: { id: 'attempt-1' },
      data: { status: 'EXPIRED' },
    })
  })

  it('does not allow submitting another user attempt', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(quizWithOneQuestion)
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      quizId: 'quiz-1',
      userId: 'other-user',
      status: 'IN_PROGRESS',
      expiresAt: new Date('2026-06-10T12:01:00.000Z'),
    })

    await expect(submitAttempt('quiz-1', 'user-1', {
      attemptId: 'attempt-1',
      answers: [{ questionId: 'question-1', selectedOptionId: 'option-1' }],
    })).rejects.toMatchObject(new AppError(404, 'Quiz attempt not found'))
  })

  it('returns a clear conflict for repeated submissions', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(quizWithOneQuestion)
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      quizId: 'quiz-1',
      userId: 'user-1',
      status: 'SUBMITTED',
      expiresAt: new Date('2026-06-10T12:01:00.000Z'),
    })

    await expect(submitAttempt('quiz-1', 'user-1', {
      attemptId: 'attempt-1',
      answers: [{ questionId: 'question-1', selectedOptionId: 'option-1' }],
    })).rejects.toMatchObject(new AppError(409, 'Quiz attempt already submitted'))
  })

  it('returns a clear conflict for repeated expired submissions without creating answers', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(quizWithOneQuestion)
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      quizId: 'quiz-1',
      userId: 'user-1',
      status: 'EXPIRED',
      expiresAt: new Date('2026-06-10T11:59:59.000Z'),
    })

    await expect(submitAttempt('quiz-1', 'user-1', {
      attemptId: 'attempt-1',
      answers: [{ questionId: 'question-1', selectedOptionId: 'option-1' }],
    })).rejects.toMatchObject(new AppError(409, 'Quiz attempt expired'))

    expect(mockPrisma.quizAttempt.update).not.toHaveBeenCalled()
    expect(mockPrisma.quizAttempt.create).not.toHaveBeenCalled()
  })

  it('keeps correct answers hidden in the student quiz response', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue({
      id: 'quiz-1',
      lessonId: null,
      title: 'Safe quiz',
      description: null,
      passingScore: 70,
      timeLimitSeconds: 60,
      isPremium: false,
      category: null,
      difficulty: 'Medium',
      questions: [
        {
          id: 'question-1',
          text: 'Question?',
          order: 1,
          questionType: 'MCQ',
          options: [{ id: 'option-1', text: 'Visible option', order: 1 }],
        },
      ],
    })

    const quiz = await getQuizById('quiz-1', 'user-1')

    expect(quiz.questions[0].options[0]).not.toHaveProperty('isCorrect')
    expect(quiz.questions[0]).not.toHaveProperty('answerKey')
  })
})
