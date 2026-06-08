import { Request, Response, NextFunction } from 'express'
import { validate } from '../lib/validate.js'
import * as AuthService from '../services/auth.service.js'
import {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  requestResetSchema,
  resetPasswordSchema,
} from '../validation/auth.validation.js'

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(signupSchema, req.body)
    const result = await AuthService.signup(input)
    res.status(201).json({ status: 'ok', data: result })
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(loginSchema, req.body)
    const result = await AuthService.login(input)
    res.json({ status: 'ok', data: result })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await AuthService.getMe(req.user!.id)
    res.json({ status: 'ok', data: { user } })
  } catch (err) {
    next(err)
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(updateProfileSchema, req.body)
    const user = await AuthService.updateProfile(req.user!.id, input)
    res.json({ status: 'ok', data: { user } })
  } catch (err) {
    next(err)
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  // Stateless JWT auth: the client is responsible for discarding the token.
  // When refresh tokens or a token blacklist are added, revocation goes here.
  res.json({ status: 'ok', message: 'Logged out successfully' })
}

export async function requestPasswordReset(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = validate(requestResetSchema, req.body)
    const result = await AuthService.requestPasswordReset(input)
    res.json({ status: 'ok', data: result })
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = validate(resetPasswordSchema, req.body)
    await AuthService.resetPassword(input)
    res.json({ status: 'ok', message: 'Password reset successfully' })
  } catch (err) {
    next(err)
  }
}
