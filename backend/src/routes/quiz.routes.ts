import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as QuizController from '../controllers/quiz.controller.js'

const router = Router()
const isInstructor = [requireAuth, requireRole('INSTRUCTOR', 'ADMIN')]

// ─── Instructor: create and manage a quiz on a lesson ────────────────────────
router.post('/lessons/:lessonId/quiz', ...isInstructor, QuizController.createQuiz)
router.get('/lessons/:lessonId/quiz/manage', ...isInstructor, QuizController.getQuizInstructor)
router.put('/quizzes/:quizId', ...isInstructor, QuizController.updateQuiz)
router.post('/quizzes/:quizId/questions', ...isInstructor, QuizController.addQuestion)
router.put('/quizzes/:quizId/questions/:questionId', ...isInstructor, QuizController.updateQuestion)
router.delete('/quizzes/:quizId/questions/:questionId', ...isInstructor, QuizController.deleteQuestion)

// ─── Instructor: create a standalone quiz (not bound to a lesson) ─────────────
router.post('/quizzes/standalone', ...isInstructor, QuizController.createStandaloneQuiz)

// ─── Student: read and submit ─────────────────────────────────────────────────
// Specific paths MUST come before parameterised /:quizId to avoid mis-routing.
router.get('/quizzes/my/available', requireAuth, QuizController.getMyAvailableQuizzes)
router.get('/quizzes/my/attempts', requireAuth, QuizController.getMyAttemptHistory)
router.get('/lessons/:lessonId/quiz', requireAuth, QuizController.getQuizStudent)
router.get('/quizzes/:quizId', requireAuth, QuizController.getQuizStudentById)
router.post('/quizzes/:quizId/attempt', requireAuth, QuizController.submitAttempt)
router.get('/quizzes/:quizId/attempts/my', requireAuth, QuizController.getMyAttempts)

export default router
