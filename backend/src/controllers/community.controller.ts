import { Request, Response, NextFunction } from 'express'
import { validate } from '../lib/validate.js'
import { createPostSchema } from '../validation/community.validation.js'
import * as CommunityService from '../services/community.service.js'

export async function getPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const posts = await CommunityService.listPosts(req.user!.id)
    res.json({ status: 'ok', data: { posts } })
  } catch (err) {
    next(err)
  }
}

export async function createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(createPostSchema, req.body)
    const post = await CommunityService.createPost(req.user!.id, {
      title: input.title,
      body: input.body,
      category: input.category ?? 'General',
    })
    res.status(201).json({ status: 'ok', data: { post } })
  } catch (err) {
    next(err)
  }
}

export async function likePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await CommunityService.likePost(req.user!.id, req.params.postId)
    res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export async function unlikePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await CommunityService.unlikePost(req.user!.id, req.params.postId)
    res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export async function bookmarkPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await CommunityService.bookmarkPost(req.user!.id, req.params.postId)
    res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export async function unbookmarkPost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await CommunityService.unbookmarkPost(req.user!.id, req.params.postId)
    res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export async function moderatePost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status } = req.body as { status: 'PUBLISHED' | 'HIDDEN' }
    if (status !== 'PUBLISHED' && status !== 'HIDDEN') {
      res.status(400).json({ status: 'error', message: 'status must be PUBLISHED or HIDDEN' })
      return
    }
    await CommunityService.moderatePost(req.params.postId, status)
    res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}
