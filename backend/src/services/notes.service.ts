import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'
import type { UpdateNoteInput } from '../validation/notes.validation.js'

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

export async function listNotes(userId: string): Promise<NoteDto[]> {
  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })

  return notes.map(toNoteDto)
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
