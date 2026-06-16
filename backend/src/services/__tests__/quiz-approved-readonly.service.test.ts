import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  lesson: { findUnique: vi.fn() },
  quiz: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  quizQuestion: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))
vi.mock('../notification.service.js', () => ({ fireNotification: vi.fn() }))
vi.mock('../subscription.service.js', () => ({
  getMySubscription: vi.fn(async () => ({ isPremium: true })),
}))

import {
  addQuestion,
  createQuiz,
  deleteQuestion,
  updateQuestion,
  updateQuiz,
} from '../quiz.service.js'

const READ_ONLY_MESSAGE = 'Approved courses are read-only. Create a revision before changing live content.'

function lesson(status = 'APPROVED', instructorId = 'instructor-1') {
  return {
    id: 'lesson-1',
    module: {
      course: { instructorId, status },
    },
  }
}

function lessonQuiz(status = 'APPROVED', instructorId = 'instructor-1') {
  return {
    id: 'quiz-1',
    lessonId: 'lesson-1',
    instructorId: null,
    lesson: lesson(status, instructorId),
  }
}

function standaloneQuiz(instructorId = 'instructor-1') {
  return {
    id: 'quiz-1',
    lessonId: null,
    instructorId,
    lesson: null,
  }
}

function quizQuestion(status = 'APPROVED', instructorId = 'instructor-1') {
  return {
    id: 'question-1',
    quiz: lessonQuiz(status, instructorId),
  }
}

function expectReadOnly(promise: Promise<unknown>) {
  return expect(promise).rejects.toMatchObject({ statusCode: 409, message: READ_ONLY_MESSAGE })
}

describe('approved course lesson quiz read-only policy', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPrisma.lesson.findUnique.mockResolvedValue(lesson())
    mockPrisma.quiz.findUnique.mockResolvedValue(lessonQuiz())
    mockPrisma.quiz.create.mockResolvedValue({ id: 'quiz-1', questions: [] })
    mockPrisma.quiz.update.mockResolvedValue({ id: 'quiz-1', questions: [] })
    mockPrisma.quizQuestion.findUnique.mockResolvedValue(quizQuestion())
    mockPrisma.quizQuestion.create.mockResolvedValue({ id: 'question-1' })
    mockPrisma.quizQuestion.update.mockResolvedValue({ id: 'question-1' })
  })

  it('instructor cannot create a quiz for an approved course lesson', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(null)

    await expectReadOnly(createQuiz('lesson-1', 'instructor-1', { title: 'Live quiz' }))
    expect(mockPrisma.quiz.create).not.toHaveBeenCalled()
  })

  it('instructor cannot update a quiz on an approved course lesson', async () => {
    await expectReadOnly(updateQuiz('quiz-1', 'instructor-1', { timeLimitSeconds: 300 }))
    expect(mockPrisma.quiz.update).not.toHaveBeenCalled()
  })

  it('instructor cannot add a question to a quiz on an approved course lesson', async () => {
    await expectReadOnly(addQuestion('quiz-1', 'instructor-1', {
      text: 'Question?',
      order: 0,
      questionType: 'MCQ',
      options: [
        { text: 'A', isCorrect: true, order: 0 },
        { text: 'B', isCorrect: false, order: 1 },
      ],
    }))
    expect(mockPrisma.quizQuestion.create).not.toHaveBeenCalled()
  })

  it('instructor cannot update or delete questions for an approved course lesson quiz', async () => {
    await expectReadOnly(updateQuestion('question-1', 'instructor-1', { text: 'Changed?' }))
    await expectReadOnly(deleteQuestion('question-1', 'instructor-1'))
    expect(mockPrisma.quizQuestion.update).not.toHaveBeenCalled()
    expect(mockPrisma.quizQuestion.delete).not.toHaveBeenCalled()
  })

  it('draft and rejected course lesson quiz mutations still work', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValueOnce(lesson('DRAFT'))
    mockPrisma.quiz.findUnique.mockResolvedValueOnce(null)
    await expect(createQuiz('lesson-1', 'instructor-1', { title: 'Draft quiz' }))
      .resolves.toMatchObject({ id: 'quiz-1' })

    mockPrisma.quiz.findUnique.mockResolvedValueOnce(lessonQuiz('REJECTED'))
    await expect(updateQuiz('quiz-1', 'instructor-1', { timeLimitSeconds: null }))
      .resolves.toMatchObject({ id: 'quiz-1' })

    expect(mockPrisma.quiz.create).toHaveBeenCalled()
    expect(mockPrisma.quiz.update).toHaveBeenCalled()
  })

  it('standalone quiz mutation remains available to its owner', async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(standaloneQuiz())

    await expect(updateQuiz('quiz-1', 'instructor-1', { timeLimitSeconds: null }))
      .resolves.toMatchObject({ id: 'quiz-1' })
    expect(mockPrisma.quiz.update).toHaveBeenCalled()
  })

  it('non-owner still gets forbidden, not conflict', async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(lesson('APPROVED', 'other-instructor'))

    await expect(createQuiz('lesson-1', 'instructor-1', { title: 'Live quiz' }))
      .rejects.toMatchObject({ statusCode: 403, message: 'Access denied' })
    expect(mockPrisma.quiz.create).not.toHaveBeenCalled()
  })
})
