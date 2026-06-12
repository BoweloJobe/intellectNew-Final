import { describe, expect, it } from 'vitest'
import {
  createQuestionSchema,
  createStandaloneQuizSchema,
  submitAttemptSchema,
} from './quiz.validation.js'

describe('quiz validation', () => {
  it('allows lesson-bound short-answer questions without MCQ options', () => {
    const result = createQuestionSchema.safeParse({
      text: 'Explain photosynthesis',
      questionType: 'SHORT_ANSWER',
      answerKey: 'photosynthesis, chlorophyll',
      order: 0,
    })

    expect(result.success).toBe(true)
    expect(result.success && result.data.options).toEqual([])
  })

  it('still requires valid options for lesson-bound MCQ questions', () => {
    const result = createQuestionSchema.safeParse({
      text: 'Which answer is correct?',
      questionType: 'MCQ',
      order: 0,
      options: [
        { text: 'A', isCorrect: false, order: 0 },
        { text: 'B', isCorrect: false, order: 1 },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('allows standalone short-answer questions without MCQ options', () => {
    const result = createStandaloneQuizSchema.safeParse({
      title: 'Biology keywords',
      category: 'Biology',
      questions: [
        {
          questionType: 'SHORT_ANSWER',
          text: 'Explain chlorophyll',
          answerKey: 'chlorophyll, pigment',
          options: [],
        },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('accepts explicit MCQ and short-answer submission fields', () => {
    const result = submitAttemptSchema.safeParse({
      answers: [
        { questionId: 'cmcqqqqqq000001testtest', selectedOptionId: 'option-1' },
        { questionId: 'cshortqqq000002testtest', textAnswer: 'chlorophyll pigment' },
      ],
    })

    expect(result.success).toBe(true)
  })
})
