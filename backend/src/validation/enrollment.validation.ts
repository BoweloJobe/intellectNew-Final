import { z } from 'zod'

export const enrollSchema = z.object({}) // body unused — courseId from param

export const markLessonCompleteSchema = z.object({
  courseId: z.string().cuid(),
})

const nonNegativeFiniteNumber = z.number().finite().nonnegative()

export const updateLessonWatchProgressSchema = z.object({
  watchedSeconds: nonNegativeFiniteNumber.optional(),
  lastPositionSeconds: nonNegativeFiniteNumber.optional(),
  completed: z.boolean().optional(),
}).refine(
  (value) =>
    value.watchedSeconds !== undefined ||
    value.lastPositionSeconds !== undefined ||
    value.completed !== undefined,
  { message: 'At least one watch progress field is required' },
)

export type UpdateLessonWatchProgressInput = z.infer<typeof updateLessonWatchProgressSchema>
