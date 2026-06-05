import { ZodSchema } from 'zod'
import { AppError } from '../errors/AppError.js'

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join('.') || 'body'}: ${e.message}`)
      .join('; ')
    throw new AppError(400, message)
  }
  return result.data
}
