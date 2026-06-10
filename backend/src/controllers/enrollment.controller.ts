import { Request, Response, NextFunction } from 'express'
import { validate } from '../lib/validate.js'
import { markLessonCompleteSchema, updateLessonWatchProgressSchema } from '../validation/enrollment.validation.js'
import * as EnrollmentService from '../services/enrollment.service.js'

export async function enroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const enrollment = await EnrollmentService.enroll(req.user!.id, req.params.courseId)
    res.status(201).json({ status: 'ok', data: { enrollment } })
  } catch (err) { next(err) }
}

export async function getMyEnrollments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const enrollments = await EnrollmentService.getMyEnrollments(req.user!.id)
    res.json({ status: 'ok', data: { enrollments } })
  } catch (err) { next(err) }
}

export async function getCourseProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const progress = await EnrollmentService.getCourseProgress(req.user!.id, req.params.courseId)
    res.json({ status: 'ok', data: { progress } })
  } catch (err) { next(err) }
}

export async function markLessonComplete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { courseId } = validate(markLessonCompleteSchema, req.body)
    const courseProgress = await EnrollmentService.markLessonComplete(req.user!.id, req.params.lessonId, courseId)
    // Returns the full course progress shape (same as GET /enrollments/courses/:id/progress)
    // so callers can reconcile local state without a separate fetch.
    res.json({ status: 'ok', data: { courseProgress } })
  } catch (err) { next(err) }
}

export async function updateLessonWatchProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(updateLessonWatchProgressSchema, req.body)
    const watchProgress = await EnrollmentService.updateLessonWatchProgress(
      req.user!.id,
      req.params.lessonId,
      input,
    )
    res.json({ status: 'ok', data: { watchProgress } })
  } catch (err) { next(err) }
}
