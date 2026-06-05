import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PostSummary {
  id: string
  title: string
  body: string
  category: string
  status: string
  authorId: string
  authorName: string
  authorRole: string
  likes: number
  isLikedByMe: boolean
  isBookmarkedByMe: boolean
  /** replies always 0 — comment threads are deferred */
  replies: number
  createdAt: string
  hoursAgo: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toHoursAgo(createdAt: Date): number {
  return Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 3_600_000))
}

function toPostSummary(
  post: {
    id: string
    title: string
    body: string
    category: string
    status: string
    authorId: string
    createdAt: Date
    author: { firstName: string; lastName: string; role: string }
    _count: { likes: number }
  },
  viewerId: string,
  likedIds: Set<string>,
  bookmarkedIds: Set<string>,
): PostSummary {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    category: post.category,
    status: post.status,
    authorId: post.authorId,
    authorName: `${post.author.firstName} ${post.author.lastName}`,
    authorRole: post.author.role,
    likes: post._count.likes,
    isLikedByMe: likedIds.has(post.id),
    isBookmarkedByMe: bookmarkedIds.has(post.id),
    replies: 0,
    createdAt: post.createdAt.toISOString(),
    hoursAgo: toHoursAgo(post.createdAt),
  }
}

// ─── Service functions ─────────────────────────────────────────────────────────

export async function listPosts(viewerId: string): Promise<PostSummary[]> {
  const [posts, myLikes, myBookmarks] = await Promise.all([
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
        _count: { select: { likes: true } },
      },
    }),
    prisma.postLike.findMany({ where: { userId: viewerId }, select: { postId: true } }),
    prisma.postBookmark.findMany({ where: { userId: viewerId }, select: { postId: true } }),
  ])

  const likedIds = new Set(myLikes.map((l) => l.postId))
  const bookmarkedIds = new Set(myBookmarks.map((b) => b.postId))

  return posts.map((p) => toPostSummary(p, viewerId, likedIds, bookmarkedIds))
}

export async function createPost(
  authorId: string,
  input: { title: string; body: string; category: string },
): Promise<PostSummary> {
  const post = await prisma.post.create({
    data: { authorId, title: input.title, body: input.body, category: input.category },
    include: {
      author: { select: { firstName: true, lastName: true, role: true } },
      _count: { select: { likes: true } },
    },
  })

  return toPostSummary(post, authorId, new Set(), new Set())
}

export async function likePost(userId: string, postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId, status: 'PUBLISHED' } })
  if (!post) throw new AppError(404, 'Post not found')
  await prisma.postLike.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId },
    update: {},
  })
}

export async function unlikePost(userId: string, postId: string): Promise<void> {
  await prisma.postLike.deleteMany({ where: { postId, userId } })
}

export async function bookmarkPost(userId: string, postId: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId, status: 'PUBLISHED' } })
  if (!post) throw new AppError(404, 'Post not found')

  await prisma.postBookmark.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId },
    update: {},
  })
}

export async function unbookmarkPost(userId: string, postId: string): Promise<void> {
  await prisma.postBookmark.deleteMany({ where: { postId, userId } })
}

export async function moderatePost(
  postId: string,
  status: 'PUBLISHED' | 'HIDDEN',
): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post) throw new AppError(404, 'Post not found')

  await prisma.post.update({ where: { id: postId }, data: { status } })
}
