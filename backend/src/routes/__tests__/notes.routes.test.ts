import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'

let mockUser = { id: 'user-1', email: 'user@example.com', role: 'STUDENT' }

vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }
    ;(req as unknown as { user: typeof mockUser }).user = mockUser
    next()
  },
}))

const mockPrisma = vi.hoisted(() => ({
  note: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import notesRouter from '../notes.routes.js'
import { errorHandler } from '../../middleware/error.middleware.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/notes', notesRouter)
  app.use(errorHandler)
  return app
}

const noteRecord = {
  id: 1,
  userId: 'user-1',
  title: 'Photosynthesis recap',
  content: 'Photosynthesis uses light energy to convert carbon dioxide and water into glucose.',
  course: 'Advanced Biology',
  tags: JSON.stringify(['Biology', 'Plants']),
  starred: false,
  createdAt: new Date('2026-06-01T10:00:00.000Z'),
  updatedAt: new Date('2026-06-02T10:00:00.000Z'),
}

const validPayload = {
  title: 'Photosynthesis recap',
  content: 'Photosynthesis uses light energy to convert carbon dioxide and water into glucose.',
  course: 'Advanced Biology',
  tags: ['Biology', 'Plants'],
  starred: true,
}

describe('notes routes', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    mockUser = { id: 'user-1', email: 'user@example.com', role: 'STUDENT' }
    app = makeApp()
  })

  it('returns 401 for unauthenticated requests', async () => {
    const res = await request(app).get('/notes')

    expect(res.status).toBe(401)
    expect(mockPrisma.note.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.note.count).not.toHaveBeenCalled()
  })

  it('creates a note for the authenticated user', async () => {
    mockPrisma.note.create.mockResolvedValue({ ...noteRecord, starred: true })

    const res = await request(app).post('/notes').set('Authorization', 'Bearer token').send(validPayload)

    expect(res.status).toBe(201)
    expect(mockPrisma.note.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        title: validPayload.title,
        content: validPayload.content,
        course: validPayload.course,
        tags: JSON.stringify(validPayload.tags),
        starred: true,
      },
    })
    expect(res.body.data.note.tags).toEqual(['Biology', 'Plants'])
  })

  it('lists only notes owned by the authenticated user', async () => {
    mockPrisma.note.count.mockResolvedValue(1)
    mockPrisma.note.findMany.mockResolvedValue([noteRecord])

    const res = await request(app).get('/notes').set('Authorization', 'Bearer token')

    expect(res.status).toBe(200)
    expect(mockPrisma.note.count).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    })
    expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { updatedAt: 'desc' },
      skip: 0,
      take: 20,
    })
    expect(res.body.data.items).toHaveLength(1)
    expect(res.body.data.notes).toHaveLength(1)
    expect(res.body.data).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    })
  })

  it('searches note title and content while preserving ownership', async () => {
    mockPrisma.note.count.mockResolvedValue(1)
    mockPrisma.note.findMany.mockResolvedValue([noteRecord])

    const res = await request(app).get('/notes?search=light').set('Authorization', 'Bearer token')

    const expectedWhere = {
      userId: 'user-1',
      AND: [
        {
          OR: [
            { title: { contains: 'light' } },
            { content: { contains: 'light' } },
          ],
        },
      ],
    }

    expect(res.status).toBe(200)
    expect(mockPrisma.note.count).toHaveBeenCalledWith({ where: expectedWhere })
    expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      orderBy: { updatedAt: 'desc' },
      skip: 0,
      take: 20,
    })
  })

  it('filters by course, tag, and starred while preserving ownership', async () => {
    mockPrisma.note.count.mockResolvedValue(1)
    mockPrisma.note.findMany.mockResolvedValue([noteRecord])

    const res = await request(app)
      .get('/notes?course=Advanced%20Biology&tag=Plants&starred=true')
      .set('Authorization', 'Bearer token')

    const expectedWhere = {
      userId: 'user-1',
      AND: [
        { course: 'Advanced Biology' },
        { tags: { contains: JSON.stringify('Plants') } },
        { starred: true },
      ],
    }

    expect(res.status).toBe(200)
    expect(mockPrisma.note.count).toHaveBeenCalledWith({ where: expectedWhere })
    expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      orderBy: { updatedAt: 'desc' },
      skip: 0,
      take: 20,
    })
  })

  it('returns pagination metadata and caps page size', async () => {
    mockPrisma.note.count.mockResolvedValue(250)
    mockPrisma.note.findMany.mockResolvedValue([noteRecord])

    const res = await request(app).get('/notes?page=2&pageSize=500').set('Authorization', 'Bearer token')

    expect(res.status).toBe(200)
    expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { updatedAt: 'desc' },
      skip: 100,
      take: 100,
    })
    expect(res.body.data).toMatchObject({
      page: 2,
      pageSize: 100,
      total: 250,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    })
  })

  it('rejects invalid list query values', async () => {
    const invalidQueries = ['page=0', 'page=-1', 'page=1.5', 'pageSize=0', 'pageSize=abc', 'starred=yes']

    for (const query of invalidQueries) {
      const res = await request(app).get(`/notes?${query}`).set('Authorization', 'Bearer token')
      expect(res.status).toBe(400)
    }

    expect(mockPrisma.note.count).not.toHaveBeenCalled()
    expect(mockPrisma.note.findMany).not.toHaveBeenCalled()
  })

  it('reads an owned note', async () => {
    mockPrisma.note.findFirst.mockResolvedValue(noteRecord)

    const res = await request(app).get('/notes/1').set('Authorization', 'Bearer token')

    expect(res.status).toBe(200)
    expect(mockPrisma.note.findFirst).toHaveBeenCalledWith({ where: { id: 1, userId: 'user-1' } })
    expect(res.body.data.note.id).toBe(1)
  })

  it('returns 404 when reading another user note', async () => {
    mockPrisma.note.findFirst.mockResolvedValue(null)

    const res = await request(app).get('/notes/2').set('Authorization', 'Bearer token')

    expect(res.status).toBe(404)
    expect(mockPrisma.note.findFirst).toHaveBeenCalledWith({ where: { id: 2, userId: 'user-1' } })
  })

  it('rejects malformed note ids', async () => {
    const invalidIds = ['1abc', 'abc', '1.5', '-1']

    for (const id of invalidIds) {
      const res = await request(app).get(`/notes/${id}`).set('Authorization', 'Bearer token')
      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Invalid note id')
    }

    expect(mockPrisma.note.findFirst).not.toHaveBeenCalled()
  })

  it('updates an owned note', async () => {
    mockPrisma.note.findFirst.mockResolvedValue({ id: 1 })
    mockPrisma.note.update.mockResolvedValue({ ...noteRecord, title: 'Updated study note' })

    const res = await request(app).put('/notes/1').set('Authorization', 'Bearer token').send({
      title: 'Updated study note',
    })

    expect(res.status).toBe(200)
    expect(mockPrisma.note.findFirst).toHaveBeenCalledWith({
      where: { id: 1, userId: 'user-1' },
      select: { id: true },
    })
    expect(mockPrisma.note.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: 'Updated study note' },
    })
  })

  it('returns 404 when updating another user note', async () => {
    mockPrisma.note.findFirst.mockResolvedValue(null)

    const res = await request(app).put('/notes/2').set('Authorization', 'Bearer token').send({
      title: 'Updated study note',
    })

    expect(res.status).toBe(404)
    expect(mockPrisma.note.update).not.toHaveBeenCalled()
  })

  it('deletes an owned note', async () => {
    mockPrisma.note.deleteMany.mockResolvedValue({ count: 1 })

    const res = await request(app).delete('/notes/1').set('Authorization', 'Bearer token')

    expect(res.status).toBe(204)
    expect(mockPrisma.note.deleteMany).toHaveBeenCalledWith({ where: { id: 1, userId: 'user-1' } })
  })

  it('returns 404 when deleting another user note', async () => {
    mockPrisma.note.deleteMany.mockResolvedValue({ count: 0 })

    const res = await request(app).delete('/notes/2').set('Authorization', 'Bearer token')

    expect(res.status).toBe(404)
  })

  it('rejects invalid payloads', async () => {
    const res = await request(app).post('/notes').set('Authorization', 'Bearer token').send({
      title: 'Bad',
      content: 'Too short.',
      course: '',
      tags: Array.from({ length: 13 }, (_, index) => `tag-${index}`),
    })

    expect(res.status).toBe(400)
    expect(mockPrisma.note.create).not.toHaveBeenCalled()
  })
})
