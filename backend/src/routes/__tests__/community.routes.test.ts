/**
 * Community route integration tests
 *
 * Covers:
 *  - GET /community/posts — empty state
 *  - GET /community/posts — posts with like/bookmark tracking
 *  - POST /community/posts — create post
 *  - POST /community/posts/:id/like — like a post
 *  - DELETE /community/posts/:id/like — unlike a post
 *  - PATCH /community/posts/:id/moderate — admin only
 *  - PATCH /community/posts/:id/moderate — forbidden for non-admin
 *
 * All Prisma calls are mocked; no database connection required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'

// ── Auth stubs — default to STUDENT ──────────────────────────────────────────
let mockUser = { id: 'user-1', role: 'STUDENT' }

vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    ;(req as unknown as { user: typeof mockUser }).user = mockUser
    next()
  },
}))

vi.mock('../../middleware/role.middleware.js', () => ({
  requireRole:
    (...roles: string[]) =>
    (req: Request, res: Response, next: NextFunction) => {
      const user = (req as unknown as { user: typeof mockUser }).user
      if (!roles.includes(user.role)) {
        res.status(403).json({ status: 'error', message: 'Insufficient permissions' })
        return
      }
      next()
    },
}))

// ── Prisma mock ───────────────────────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  post: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  postLike: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  postBookmark: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import communityRouter from '../community.routes.js'
import { errorHandler } from '../../middleware/error.middleware.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/community', communityRouter)
  app.use(errorHandler)
  return app
}

const BASE_POST = {
  id: 'post-1',
  title: 'Great learning strategies',
  body: 'Here are some tips for effective studying and retention.',
  category: 'Study Tips',
  status: 'PUBLISHED',
  authorId: 'user-2',
  createdAt: new Date(Date.now() - 2 * 3_600_000), // 2 hours ago
  updatedAt: new Date(),
  author: { firstName: 'Alice', lastName: 'Smith', role: 'STUDENT' },
  _count: { likes: 3 },
}

describe('GET /community/posts', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    mockUser = { id: 'user-1', role: 'STUDENT' }
    app = makeApp()
  })

  it('returns empty array when no posts exist', async () => {
    mockPrisma.post.findMany.mockResolvedValue([])
    mockPrisma.postLike.findMany.mockResolvedValue([])
    mockPrisma.postBookmark.findMany.mockResolvedValue([])

    const res = await request(app).get('/community/posts')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.data.posts).toHaveLength(0)
  })

  it('returns posts with correct shape, like count, and viewer flags', async () => {
    mockPrisma.post.findMany.mockResolvedValue([BASE_POST])
    mockPrisma.postLike.findMany.mockResolvedValue([{ postId: 'post-1' }]) // viewer liked it
    mockPrisma.postBookmark.findMany.mockResolvedValue([])

    const res = await request(app).get('/community/posts')

    expect(res.status).toBe(200)
    const [post] = res.body.data.posts

    expect(post.id).toBe('post-1')
    expect(post.title).toBe('Great learning strategies')
    expect(post.authorName).toBe('Alice Smith')
    expect(post.likes).toBe(3)
    expect(post.isLikedByMe).toBe(true)
    expect(post.isBookmarkedByMe).toBe(false)
    expect(post.hoursAgo).toBeGreaterThanOrEqual(1)
    expect(post.hoursAgo).toBeLessThanOrEqual(3)
  })
})

describe('POST /community/posts', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    mockUser = { id: 'user-1', role: 'STUDENT' }
    app = makeApp()
  })

  it('creates a post and returns 201 with the post shape', async () => {
    mockPrisma.post.create.mockResolvedValue({
      ...BASE_POST,
      id: 'post-new',
      authorId: 'user-1',
      title: 'My new discussion',
      body: 'Here is enough context for a proper community post.',
      category: 'General',
    })

    const res = await request(app).post('/community/posts').send({
      title: 'My new discussion',
      body: 'Here is enough context for a proper community post.',
      category: 'General',
    })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('ok')
    expect(res.body.data.post.id).toBe('post-new')
    expect(res.body.data.post.title).toBe('My new discussion')
  })

  it('rejects posts with a title shorter than 8 characters', async () => {
    const res = await request(app).post('/community/posts').send({
      title: 'Short',
      body: 'Here is enough context for a proper community post.',
      category: 'General',
    })

    expect(res.status).toBe(400)
  })

  it('rejects posts with body shorter than 24 characters', async () => {
    const res = await request(app).post('/community/posts').send({
      title: 'A valid title here',
      body: 'Too short.',
      category: 'General',
    })

    expect(res.status).toBe(400)
  })
})

describe('POST /community/posts/:postId/like | DELETE /community/posts/:postId/like', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    mockUser = { id: 'user-1', role: 'STUDENT' }
    app = makeApp()
  })

  it('likes a published post', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({ ...BASE_POST })
    mockPrisma.postLike.upsert.mockResolvedValue({})

    const res = await request(app).post('/community/posts/post-1/like')

    expect(res.status).toBe(200)
    expect(mockPrisma.postLike.upsert).toHaveBeenCalledOnce()
  })

  it('returns 404 when liking a non-existent post', async () => {
    mockPrisma.post.findUnique.mockResolvedValue(null)

    const res = await request(app).post('/community/posts/ghost/like')

    expect(res.status).toBe(404)
  })

  it('unlikes a post (deleteMany, no 404 check needed)', async () => {
    mockPrisma.postLike.deleteMany.mockResolvedValue({ count: 1 })

    const res = await request(app).delete('/community/posts/post-1/like')

    expect(res.status).toBe(200)
    expect(mockPrisma.postLike.deleteMany).toHaveBeenCalledWith({
      where: { postId: 'post-1', userId: 'user-1' },
    })
  })
})

describe('PATCH /community/posts/:postId/moderate', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    app = makeApp()
  })

  it('allows admin to hide a post', async () => {
    mockUser = { id: 'admin-1', role: 'ADMIN' }
    mockPrisma.post.findUnique.mockResolvedValue({ ...BASE_POST })
    mockPrisma.post.update.mockResolvedValue({})

    const res = await request(app)
      .patch('/community/posts/post-1/moderate')
      .send({ status: 'HIDDEN' })

    expect(res.status).toBe(200)
    expect(mockPrisma.post.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: { status: 'HIDDEN' },
    })
  })

  it('returns 403 when a non-admin tries to moderate', async () => {
    mockUser = { id: 'user-1', role: 'STUDENT' }

    const res = await request(app)
      .patch('/community/posts/post-1/moderate')
      .send({ status: 'HIDDEN' })

    expect(res.status).toBe(403)
  })
})
