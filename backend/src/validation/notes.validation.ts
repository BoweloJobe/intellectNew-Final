import { z } from 'zod'

const MAX_NOTES_PAGE_SIZE = 100

const noteTagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'Tag cannot be empty')
      .max(40, 'Tag must be at most 40 characters'),
  )
  .max(12, 'Notes can have at most 12 tags')
  .optional()
  .default([])

export const createNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, 'Title must be at least 4 characters')
    .max(120, 'Title must be at most 120 characters'),
  content: z
    .string()
    .trim()
    .min(20, 'Content must be at least 20 characters')
    .max(4000, 'Content must be at most 4000 characters'),
  course: z
    .string()
    .trim()
    .min(2, 'Course is required')
    .max(120, 'Course must be at most 120 characters'),
  tags: noteTagsSchema,
  starred: z.boolean().optional().default(false),
})

export const updateNoteSchema = createNoteSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: 'At least one field is required' },
)

const optionalQueryText = (max: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined) return undefined
      if (typeof value !== 'string') return value

      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : undefined
    },
    z.string().max(max).optional(),
  )

const positiveIntegerQuery = (fieldName: string, defaultValue: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === '') return defaultValue
      if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return Number(value)
      return value
    },
    z
      .number({ invalid_type_error: `${fieldName} must be a positive integer` })
      .int(`${fieldName} must be a positive integer`)
      .positive(`${fieldName} must be a positive integer`),
  )

export const listNotesQuerySchema = z
  .object({
    search: optionalQueryText(200),
    course: optionalQueryText(120),
    tag: optionalQueryText(40),
    starred: z
      .preprocess((value) => {
        if (value === undefined || value === '') return undefined
        if (value === 'true') return true
        if (value === 'false') return false
        return value
      }, z.boolean({ invalid_type_error: 'starred must be true or false' }).optional()),
    page: positiveIntegerQuery('page', 1).default(1),
    pageSize: positiveIntegerQuery('pageSize', 20)
      .default(20)
      .transform((value) => Math.min(value, MAX_NOTES_PAGE_SIZE)),
  })
  .strict()

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type ListNotesQueryInput = z.infer<typeof listNotesQuerySchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
