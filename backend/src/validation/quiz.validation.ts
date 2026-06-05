import { z } from 'zod'

// ─── Quiz authoring ───────────────────────────────────────────────────────────

export const createQuizSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  passingScore: z.number().int().min(1).max(100).optional(),
})

export const updateQuizSchema = createQuizSchema.partial()

const questionTypeSchema = z.enum(['MCQ', 'SHORT_ANSWER']).default('MCQ')

export const createQuestionSchema = z.object({
  text: z.string().min(3).max(1000).trim(),
  explanation: z.string().max(2000).trim().optional(),
  order: z.number().int().min(0),
  questionType: questionTypeSchema.optional(),
  answerKey: z.string().max(2000).trim().optional(),
  options: z
    .array(
      z.object({
        text: z.string().min(1).max(500).trim(),
        isCorrect: z.boolean(),
        order: z.number().int().min(0),
      }),
    )
    .min(2, 'At least 2 options required')
    .max(6, 'Maximum 6 options')
    .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, {
      message: 'Exactly one option must be marked correct',
    }),
})

export const updateQuestionSchema = z.object({
  text: z.string().min(3).max(1000).trim().optional(),
  explanation: z.string().max(2000).trim().optional(),
  order: z.number().int().min(0).optional(),
})

// ─── Standalone quiz creation (instructor, not lesson-bound) ──────────────────
// All fields are explicit (no .default()) so z.infer gives clean required types
// that align with the service parameter. The frontend always sends questionType
// and options (empty array for SHORT_ANSWER questions).
// MCQ option rules are validated in createStandaloneQuizSchema.superRefine.

const standaloneQuestionSchema = z.object({
  questionType: z.enum(['MCQ', 'SHORT_ANSWER']),
  text: z.string().min(3).max(1000).trim(),
  explanation: z.string().max(2000).trim().optional(),
  answerKey: z.string().max(2000).trim().optional(),
  options: z.array(
    z.object({
      text: z.string().min(1).max(500).trim(),
      isCorrect: z.boolean(),
    }),
  ),
})

export const createStandaloneQuizSchema = z
  .object({
    title: z.string().min(3).max(200).trim(),
    description: z.string().max(2000).trim().optional(),
    category: z.string().min(1).max(100).trim(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    passingScore: z.number().int().min(1).max(100).optional(),
    timeLimitSeconds: z.number().int().min(60).max(10800).optional(),
    isPremium: z.boolean().optional(),
    questions: z.array(standaloneQuestionSchema).min(1, 'At least one question required'),
  })
  .superRefine((data, ctx) => {
    data.questions.forEach((q, idx) => {
      if (q.questionType !== 'MCQ') return
      if (q.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 2,
          type: 'array',
          inclusive: true,
          message: 'MCQ questions require at least 2 options',
          path: ['questions', idx, 'options'],
        })
      } else if (q.options.length > 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: 6,
          type: 'array',
          inclusive: true,
          message: 'Maximum 6 options allowed',
          path: ['questions', idx, 'options'],
        })
      } else if (q.options.filter((o) => o.isCorrect).length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Exactly one option must be marked correct',
          path: ['questions', idx, 'options'],
        })
      }
    })
  })

// ─── Quiz submission ──────────────────────────────────────────────────────────

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().cuid(),
        // selectedOptionId is empty string for unanswered MCQ or SHORT_ANSWER text
        selectedOptionId: z.string(),
      }),
    )
    .min(1, 'At least one answer is required'),
})

export type CreateQuizInput = z.infer<typeof createQuizSchema>
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>
export type CreateStandaloneQuizInput = z.infer<typeof createStandaloneQuizSchema>
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>
