import { z } from 'zod'

export const createCourseSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(5000).trim(),
  category: z.string().min(1).max(100).trim(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  thumbnailUrl: z.string().url().optional(),
  estimatedHours: z.number().positive().optional(),
  price: z.number().min(0).optional(),
})

export const updateCourseSchema = createCourseSchema.partial()

export const createModuleSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  order: z.number().int().min(0),
})

export const updateModuleSchema = createModuleSchema.partial()

export const createLessonSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  notes: z.string().optional(),
  videoUrl: z.string().url().optional(),
  videoDurationSecs: z.number().int().min(0).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  order: z.number().int().min(0),
  isFree: z.boolean().optional(),
})

export const updateLessonSchema = createLessonSchema.partial()

export const rejectCourseSchema = z.object({
  reason: z.string().min(10).max(1000).trim(),
})

// Attach confirmed video metadata to a lesson after the client has uploaded the file
export const attachLessonVideoSchema = z.object({
  videoUrl:         z.string().url().optional(),
  videoStorageKey:  z.string().min(1).max(500).optional(),
  videoProvider:    z.enum(['SUPABASE', 'S3', 'EXTERNAL', 'LOCAL']).optional(),
  videoDurationSecs: z.number().int().min(0).optional(),
  videoUploadStatus: z.enum(['PENDING', 'READY', 'FAILED']).optional(),
})

export type CreateCourseInput       = z.infer<typeof createCourseSchema>
export type UpdateCourseInput       = z.infer<typeof updateCourseSchema>
export type CreateModuleInput       = z.infer<typeof createModuleSchema>
export type UpdateModuleInput       = z.infer<typeof updateModuleSchema>
export type CreateLessonInput       = z.infer<typeof createLessonSchema>
export type UpdateLessonInput       = z.infer<typeof updateLessonSchema>
export type RejectCourseInput       = z.infer<typeof rejectCourseSchema>
export type AttachLessonVideoInput  = z.infer<typeof attachLessonVideoSchema>
