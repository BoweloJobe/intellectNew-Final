import { z } from 'zod'

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

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
