import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'
import type { ListNotesQueryInput, UpdateNoteInput } from '../validation/notes.validation.js'

export interface NoteDto {
  id: number
  title: string
  content: string
  course: string
  tags: string[]
  starred: boolean
  createdAt: string
  updatedAt: string
}

export interface PaginatedNotesDto {
  items: NoteDto[]
  notes: NoteDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

type NoteRecord = {
  id: number
  title: string
  content: string
  course: string
  tags: string
  starred: boolean
  createdAt: Date
  updatedAt: Date
}

type CreateNoteData = {
  title: string
  content: string
  course: string
  tags?: string[]
  starred?: boolean
}

function parseTags(tags: string): string[] {
  try {
    const parsed = JSON.parse(tags)
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : []
  } catch {
    return []
  }
}

function serializeTags(tags: string[] | undefined): string | undefined {
  return tags ? JSON.stringify(tags) : undefined
}

function toNoteDto(note: NoteRecord): NoteDto {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    course: note.course,
    tags: parseTags(note.tags),
    starred: note.starred,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }
}

function buildListNotesWhere(userId: string, input: ListNotesQueryInput): Prisma.NoteWhereInput {
  const filters: Prisma.NoteWhereInput[] = []

  if (input.search) {
    filters.push({
      OR: [
        { title: { contains: input.search } },
        { content: { contains: input.search } },
      ],
    })
  }

  if (input.course) {
    filters.push({ course: input.course })
  }

  if (input.tag) {
    filters.push({ tags: { contains: JSON.stringify(input.tag) } })
  }

  if (input.starred !== undefined) {
    filters.push({ starred: input.starred })
  }

  return filters.length > 0 ? { userId, AND: filters } : { userId }
}

export async function listNotes(userId: string, input: ListNotesQueryInput): Promise<PaginatedNotesDto> {
  const where = buildListNotesWhere(userId, input)
  const skip = (input.page - 1) * input.pageSize
  const [total, notes] = await Promise.all([
    prisma.note.count({ where }),
    prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: input.pageSize,
    }),
  ])
  const items = notes.map(toNoteDto)
  const totalPages = Math.ceil(total / input.pageSize)

  return {
    items,
    notes: items,
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages,
    hasNextPage: input.page < totalPages,
    hasPreviousPage: input.page > 1,
  }
}

export async function createNote(userId: string, input: CreateNoteData): Promise<NoteDto> {
  const note = await prisma.note.create({
    data: {
      userId,
      title: input.title,
      content: input.content,
      course: input.course,
      tags: serializeTags(input.tags ?? []) ?? '[]',
      starred: input.starred ?? false,
    },
  })

  return toNoteDto(note)
}

export async function getNote(userId: string, id: number): Promise<NoteDto> {
  const note = await prisma.note.findFirst({ where: { id, userId } })
  if (!note) throw new AppError(404, 'Note not found')

  return toNoteDto(note)
}

export async function updateNote(userId: string, id: number, input: UpdateNoteInput): Promise<NoteDto> {
  const existing = await prisma.note.findFirst({ where: { id, userId }, select: { id: true } })
  if (!existing) throw new AppError(404, 'Note not found')

  const note = await prisma.note.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.course !== undefined ? { course: input.course } : {}),
      ...(input.tags !== undefined ? { tags: serializeTags(input.tags) } : {}),
      ...(input.starred !== undefined ? { starred: input.starred } : {}),
    },
  })

  return toNoteDto(note)
}

export async function deleteNote(userId: string, id: number): Promise<void> {
  const result = await prisma.note.deleteMany({ where: { id, userId } })
  if (result.count === 0) throw new AppError(404, 'Note not found')
}
