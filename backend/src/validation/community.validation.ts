import { z } from 'zod'

export const createPostSchema = z.object({
  title: z
    .string()
    .min(8, 'Title must be at least 8 characters')
    .max(120, 'Title must be at most 120 characters')
    .trim(),
  body: z
    .string()
    .min(24, 'Body must be at least 24 characters')
    .max(3000, 'Body must be at most 3000 characters')
    .trim(),
  category: z
    .string()
    .min(2, 'Category is required')
    .max(60, 'Category must be at most 60 characters')
    .trim()
    .default('General'),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
