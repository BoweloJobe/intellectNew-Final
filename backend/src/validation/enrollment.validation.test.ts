import { describe, expect, it } from 'vitest'
import { updateLessonWatchProgressSchema } from './enrollment.validation.js'

describe('updateLessonWatchProgressSchema', () => {
  it('rejects negative values', () => {
    expect(updateLessonWatchProgressSchema.safeParse({ watchedSeconds: -1 }).success).toBe(false)
    expect(updateLessonWatchProgressSchema.safeParse({ lastPositionSeconds: -1 }).success).toBe(false)
  })

  it('rejects non-finite values', () => {
    expect(updateLessonWatchProgressSchema.safeParse({ watchedSeconds: Number.POSITIVE_INFINITY }).success).toBe(false)
    expect(updateLessonWatchProgressSchema.safeParse({ lastPositionSeconds: Number.NaN }).success).toBe(false)
  })

  it('requires at least one watch progress field', () => {
    expect(updateLessonWatchProgressSchema.safeParse({}).success).toBe(false)
  })
})
