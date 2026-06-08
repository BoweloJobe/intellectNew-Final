import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as NotesController from '../controllers/notes.controller.js'

const router = Router()

router.use(requireAuth)

router.get('/', NotesController.listNotes)
router.post('/', NotesController.createNote)
router.get('/:id', NotesController.getNote)
router.put('/:id', NotesController.updateNote)
router.delete('/:id', NotesController.deleteNote)

export default router
