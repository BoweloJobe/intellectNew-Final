import { Request, Response, NextFunction } from 'express'
import { validate } from '../lib/validate.js'
import { adminUserRoleSchema } from '../validation/admin.validation.js'
import { rejectCourseSchema } from '../validation/course.validation.js'
import * as AdminService from '../services/admin.service.js'
import * as CourseService from '../services/course.service.js'

export async function listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await AdminService.listUsers()
    res.json({ status: 'ok', data: { users } })
  } catch (err) { next(err) }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role } = validate(adminUserRoleSchema, req.body)
    const user = await AdminService.updateUserRole(req.user!.id, req.params.id, role)
    res.json({ status: 'ok', data: { user } })
  } catch (err) { next(err) }
}

export async function getQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const courses = await CourseService.getPendingCourses()
    res.json({ status: 'ok', data: { courses } })
  } catch (err) { next(err) }
}

export async function approveCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const course = await CourseService.approveCourse(req.params.id)
    res.json({ status: 'ok', data: { course } })
  } catch (err) { next(err) }
}

export async function rejectCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reason } = validate(rejectCourseSchema, req.body)
    const course = await CourseService.rejectCourse(req.params.id, reason)
    res.json({ status: 'ok', data: { course } })
  } catch (err) { next(err) }
}
