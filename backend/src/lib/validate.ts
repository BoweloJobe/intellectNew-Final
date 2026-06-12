import { z } from 'zod'
import { AppError } from '../errors/AppError.js'

export function validate<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  data: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join('.') || 'body'}: ${e.message}`)
      .join('; ')
    throw new AppError(400, message)
  }
  return result.data
}
