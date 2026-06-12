import { Request, Response, NextFunction } from 'express'
import { validate } from '../lib/validate.js'
import * as CourseService from '../services/course.service.js'
import {
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  createLessonSchema,
  createStandaloneLessonSchema,
  updateLessonSchema,
  requestLessonVideoUploadSchema,
  attachLessonVideoSchema,
} from '../validation/course.validation.js'

// ─── Instructor ───────────────────────────────────────────────────────────────

export async function createCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(createCourseSchema, req.body)
    const course = await CourseService.createCourse(req.user!.id, input)
    res.status(201).json({ status: 'ok', data: { course } })
  } catch (err) { next(err) }
}

export async function updateCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(updateCourseSchema, req.body)
    const course = await CourseService.updateCourse(req.params.id, req.user!.id, input)
    res.json({ status: 'ok', data: { course } })
  } catch (err) { next(err) }
}

export async function submitForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const course = await CourseService.submitCourseForReview(req.params.id, req.user!.id)
    res.json({ status: 'ok', data: { course } })
  } catch (err) { next(err) }
}

export async function getMyCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const courses = await CourseService.getMyCourses(req.user!.id)
    res.json({ status: 'ok', data: { courses } })
  } catch (err) { next(err) }
}

export async function getMyCourseDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const course = await CourseService.getMyCourseDetail(req.params.id, req.user!.id)
    res.json({ status: 'ok', data: { course } })
  } catch (err) { next(err) }
}

export async function listSavedCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const courses = await CourseService.listSavedCourses(req.user!.id)
    res.json({ status: 'ok', data: { courses } })
  } catch (err) { next(err) }
}

export async function saveCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await CourseService.saveCourse(req.user!.id, req.params.courseId)
    res.status(204).end()
  } catch (err) { next(err) }
}

export async function unsaveCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await CourseService.unsaveCourse(req.user!.id, req.params.courseId)
    res.status(204).end()
  } catch (err) { next(err) }
}

export async function createModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(createModuleSchema, req.body)
    const module = await CourseService.createModule(req.params.courseId, req.user!.id, input)
    res.status(201).json({ status: 'ok', data: { module } })
  } catch (err) { next(err) }
}

export async function updateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(updateModuleSchema, req.body)
    const module = await CourseService.updateModule(req.params.moduleId, req.user!.id, input)
    res.json({ status: 'ok', data: { module } })
  } catch (err) { next(err) }
}

export async function deleteModule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await CourseService.deleteModule(req.params.moduleId, req.user!.id)
    res.status(204).end()
  } catch (err) { next(err) }
}

export async function createLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(createLessonSchema, req.body)
    const lesson = await CourseService.createLesson(
      req.params.moduleId,
      req.params.courseId,
      req.user!.id,
      input,
    )
    res.status(201).json({ status: 'ok', data: { lesson } })
  } catch (err) { next(err) }
}

export async function createStandaloneLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(createStandaloneLessonSchema, req.body)
    const course = await CourseService.createStandaloneLesson(
      req.params.courseId,
      req.user!,
      input,
    )
    res.status(201).json({ status: 'ok', data: { course } })
  } catch (err) { next(err) }
}

export async function updateLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(updateLessonSchema, req.body)
    const lesson = await CourseService.updateLesson(req.params.lessonId, req.user!.id, input)
    res.json({ status: 'ok', data: { lesson } })
  } catch (err) { next(err) }
}

export async function deleteLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await CourseService.deleteLesson(req.params.lessonId, req.user!.id)
    res.status(204).end()
  } catch (err) { next(err) }
}

// DELETE /courses/:id  — instructor deletes their own course
export async function deleteCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await CourseService.deleteCourse(req.params.id, req.user!.id)
    res.status(204).end()
  } catch (err) { next(err) }
}

// POST /courses/:courseId/modules/:moduleId/lessons/:lessonId/video-upload
// Returns a signed upload intent; marks the lesson upload as PENDING
export async function requestVideoUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(requestLessonVideoUploadSchema, req.body)
    const intent = await CourseService.requestLessonVideoUpload(
      req.params.courseId,
      req.params.moduleId,
      req.params.lessonId,
      req.user!,
      input,
    )
    res.status(201).json({ status: 'ok', data: intent })
  } catch (err) { next(err) }
}

// PUT /courses/:courseId/modules/:moduleId/lessons/:lessonId/video
// Instructor confirms upload and attaches final video metadata to the lesson
export async function attachLessonVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(attachLessonVideoSchema, req.body)
    const lesson = await CourseService.attachLessonVideo(
      req.params.courseId,
      req.params.moduleId,
      req.params.lessonId,
      req.user!,
      input,
    )
    res.json({ status: 'ok', data: { lesson } })
  } catch (err) { next(err) }
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function listCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, difficulty, search } = req.query as Record<string, string | undefined>
    const courses = await CourseService.listApprovedCourses({ category, difficulty, search })
    res.json({ status: 'ok', data: { courses } })
  } catch (err) { next(err) }
}

export async function getCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Pass userId if authenticated so enrolled users see full lesson content
    const course = await CourseService.getApprovedCourse(req.params.id, req.user?.id)
    res.json({ status: 'ok', data: { course } })
  } catch (err) { next(err) }
}

export async function getLessonPage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await CourseService.getLessonPageForUser(req.params.lessonId, req.user!)
    res.json({ status: 'ok', data: result })
  } catch (err) { next(err) }
}
