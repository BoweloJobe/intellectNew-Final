import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { AppError } from '../errors/AppError.js'

export const MAX_VIDEO_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

const allowedVideoMimeTypes = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
])

export interface VideoUploadMetadata {
  courseId: string
  moduleId: string
  lessonId: string
  filename: string
  mimeType: string
  fileSizeBytes: number
}

export interface UploadIntent {
  storageKey: string
  uploadUrl: string
  uploadMethod: 'PUT'
  uploadHeaders: Record<string, string>
  provider: 'SUPABASE'
  expiresAt: string
}

interface SupabaseSignedUploadResponse {
  signedURL?: string
  signedUrl?: string
  url?: string
}

export function isAllowedVideoMimeType(mimeType: string): boolean {
  return allowedVideoMimeTypes.has(mimeType)
}

export function assertVideoUploadMetadata(metadata: VideoUploadMetadata): void {
  if (!metadata.filename.trim()) {
    throw new AppError(400, 'filename is required')
  }
  if (!isAllowedVideoMimeType(metadata.mimeType)) {
    throw new AppError(400, 'Unsupported video file type. Use MP4, WebM, MOV, or M4V.')
  }
  if (!Number.isSafeInteger(metadata.fileSizeBytes) || metadata.fileSizeBytes <= 0) {
    throw new AppError(400, 'fileSizeBytes must be a positive integer')
  }
  if (metadata.fileSizeBytes > MAX_VIDEO_UPLOAD_BYTES) {
    throw new AppError(400, 'Video file is too large. Maximum upload size is 2 GB.')
  }
}

export async function generateUploadIntent(metadata: VideoUploadMetadata): Promise<UploadIntent> {
  assertVideoUploadMetadata(metadata)
  const config = getSupabaseStorageConfig()
  const storageKey = buildLessonVideoStorageKey(metadata)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  const signedUrl = await createSupabaseSignedUploadUrl(config, storageKey)

  return {
    storageKey,
    uploadUrl: signedUrl,
    uploadMethod: 'PUT',
    uploadHeaders: {
      'content-type': metadata.mimeType,
    },
    provider: 'SUPABASE',
    expiresAt,
  }
}

export async function verifyStoredVideoExists(storageKey: string): Promise<void> {
  const config = getSupabaseStorageConfig()
  const objectUrl = `${config.baseUrl}/storage/v1/object/${encodeURIComponent(config.bucket)}/${encodeStoragePath(storageKey)}`
  const response = await fetch(objectUrl, {
    method: 'HEAD',
    headers: supabaseAuthHeaders(config),
  })

  if (!response.ok) {
    throw new AppError(422, 'Uploaded video could not be verified. Complete the upload before attaching it.')
  }
}

export function buildPublicVideoUrl(storageKey: string): string {
  const config = getSupabaseStorageConfig()
  return `${config.baseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${encodeStoragePath(storageKey)}`
}

export function assertLessonVideoStorageKey(
  storageKey: string,
  expected: Pick<VideoUploadMetadata, 'courseId' | 'moduleId' | 'lessonId'>,
): void {
  const expectedPrefix = `courses/${expected.courseId}/modules/${expected.moduleId}/lessons/${expected.lessonId}/`
  if (!storageKey.startsWith(expectedPrefix) || storageKey.includes('..') || storageKey.includes('\\')) {
    throw new AppError(400, 'Invalid video storage key for this lesson')
  }
}

function getSupabaseStorageConfig() {
  const provider = env.STORAGE_PROVIDER
  const baseUrl = env.SUPABASE_URL ?? env.STORAGE_BASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = env.STORAGE_BUCKET

  if (provider !== 'SUPABASE' || !baseUrl || !serviceRoleKey || !bucket) {
    throw new AppError(
      503,
      'Video upload is not configured yet. Set STORAGE_PROVIDER=SUPABASE, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and STORAGE_BUCKET.',
    )
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    serviceRoleKey,
    bucket,
  }
}

async function createSupabaseSignedUploadUrl(
  config: ReturnType<typeof getSupabaseStorageConfig>,
  storageKey: string,
): Promise<string> {
  const url = `${config.baseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(config.bucket)}/${encodeStoragePath(storageKey)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...supabaseAuthHeaders(config),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ upsert: true }),
  })

  if (!response.ok) {
    throw new AppError(502, 'Storage provider could not create a signed upload URL')
  }

  const payload = await response.json() as SupabaseSignedUploadResponse
  const signedPath = payload.signedURL ?? payload.signedUrl ?? payload.url
  if (!signedPath) {
    throw new AppError(502, 'Storage provider returned an invalid signed upload response')
  }

  return signedPath.startsWith('http')
    ? signedPath
    : `${config.baseUrl}${signedPath.startsWith('/') ? '' : '/'}${signedPath}`
}

function buildLessonVideoStorageKey(metadata: VideoUploadMetadata): string {
  const extension = getSafeVideoExtension(metadata.filename, metadata.mimeType)
  const safeName = metadata.filename
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'lesson-video'

  return `courses/${metadata.courseId}/modules/${metadata.moduleId}/lessons/${metadata.lessonId}/${crypto.randomUUID()}-${safeName}${extension}`
}

function getSafeVideoExtension(filename: string, mimeType: string): string {
  const lower = filename.toLowerCase()
  const ext = lower.match(/\.(mp4|webm|mov|m4v)$/)?.[0]
  if (ext) return ext
  switch (mimeType) {
    case 'video/webm':
      return '.webm'
    case 'video/quicktime':
      return '.mov'
    case 'video/x-m4v':
      return '.m4v'
    default:
      return '.mp4'
  }
}

function encodeStoragePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function supabaseAuthHeaders(config: ReturnType<typeof getSupabaseStorageConfig>): Record<string, string> {
  return {
    apikey: config.serviceRoleKey,
    authorization: `Bearer ${config.serviceRoleKey}`,
  }
}
