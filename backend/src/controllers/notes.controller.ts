import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError.js'
import { validate } from '../lib/validate.js'
import { createNoteSchema, updateNoteSchema } from '../validation/notes.validation.js'
import * as NotesService from '../services/notes.service.js'

function parseNoteId(rawId: string): number {
  if (!/^[1-9]\d*$/.test(rawId)) {
    throw new AppError(400, 'Invalid note id')
  }

  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid note id')
  }
  return id
}

export async function listNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notes = await NotesService.listNotes(req.user!.id)
    res.json({ status: 'ok', data: { notes } })
  } catch (err) {
    next(err)
  }
}

export async function createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(createNoteSchema, req.body)
    const note = await NotesService.createNote(req.user!.id, input)
    res.status(201).json({ status: 'ok', data: { note } })
  } catch (err) {
    next(err)
  }
}

export async function getNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const note = await NotesService.getNote(req.user!.id, parseNoteId(req.params.id))
    res.json({ status: 'ok', data: { note } })
  } catch (err) {
    next(err)
  }
}

export async function updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(updateNoteSchema, req.body)
    const note = await NotesService.updateNote(req.user!.id, parseNoteId(req.params.id), input)
    res.json({ status: 'ok', data: { note } })
  } catch (err) {
    next(err)
  }
}

export async function deleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await NotesService.deleteNote(req.user!.id, parseNoteId(req.params.id))
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
