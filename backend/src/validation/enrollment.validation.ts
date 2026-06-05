import { z } from 'zod'

export const enrollSchema = z.object({}) // body unused — courseId from param

export const markLessonCompleteSchema = z.object({
  courseId: z.string().cuid(),
})
