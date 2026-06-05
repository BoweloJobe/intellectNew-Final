import { Router } from 'express'
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as CourseController from '../controllers/course.controller.js'

const router = Router()
const isInstructor = [requireAuth, requireRole('INSTRUCTOR', 'ADMIN')]

// ─── Public routes (no auth) ──────────────────────────────────────────────────
router.get('/', CourseController.listCourses)

// ─── Instructor: course authoring ────────────────────────────────────────────
// NOTE: all specific / namespaced routes MUST be registered before /:id so that
// Express never lets the dynamic parameter absorb a named path segment.
router.post('/', ...isInstructor, CourseController.createCourse)
router.get('/mine/list', ...isInstructor, CourseController.getMyCourses)
router.get('/mine/:id', ...isInstructor, CourseController.getMyCourseDetail)

// ─── Parameterised course routes (after all specific paths) ──────────────────
router.get('/:id', optionalAuth, CourseController.getCourse)
router.put('/:id', ...isInstructor, CourseController.updateCourse)
router.delete('/:id', ...isInstructor, CourseController.deleteCourse)
router.post('/:id/submit', ...isInstructor, CourseController.submitForReview)

// ─── Instructor: module authoring ────────────────────────────────────────────
router.post('/:courseId/modules', ...isInstructor, CourseController.createModule)
router.put('/:courseId/modules/:moduleId', ...isInstructor, CourseController.updateModule)
router.delete('/:courseId/modules/:moduleId', ...isInstructor, CourseController.deleteModule)

// ─── Instructor: lesson authoring ────────────────────────────────────────────
router.post('/:courseId/modules/:moduleId/lessons', ...isInstructor, CourseController.createLesson)
router.put('/:courseId/modules/:moduleId/lessons/:lessonId', ...isInstructor, CourseController.updateLesson)
router.delete('/:courseId/modules/:moduleId/lessons/:lessonId', ...isInstructor, CourseController.deleteLesson)

// ─── Instructor: lesson video upload flow ────────────────────────────────────
// Step 1 — request a signed upload intent (marks lesson as PENDING)
router.post('/:courseId/modules/:moduleId/lessons/:lessonId/video-upload', ...isInstructor, CourseController.requestVideoUpload)
// Step 2 — confirm upload and attach final video metadata (marks lesson as READY)
router.put('/:courseId/modules/:moduleId/lessons/:lessonId/video', ...isInstructor, CourseController.attachLessonVideo)

export default router
