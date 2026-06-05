import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/role.middleware.js'
import * as CommunityController from '../controllers/community.controller.js'

const router = Router()

// All community routes require auth
router.use(requireAuth)

// Posts
router.get('/posts', CommunityController.getPosts)
router.post('/posts', CommunityController.createPost)

// Likes
router.post('/posts/:postId/like', CommunityController.likePost)
router.delete('/posts/:postId/like', CommunityController.unlikePost)

// Bookmarks
router.post('/posts/:postId/bookmark', CommunityController.bookmarkPost)
router.delete('/posts/:postId/bookmark', CommunityController.unbookmarkPost)

// Admin moderation
router.patch(
  '/posts/:postId/moderate',
  requireRole('ADMIN'),
  CommunityController.moderatePost,
)

export default router
