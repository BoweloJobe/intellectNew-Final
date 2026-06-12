import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'file:./test.db',
  JWT_SECRET: 'test-secret-value-that-is-at-least-32-characters',
}

const metadata = {
  courseId: 'course-1',
  moduleId: 'module-1',
  lessonId: 'lesson-1',
  filename: 'Intro Video.mp4',
  mimeType: 'video/mp4',
  fileSizeBytes: 1024,
}

async function importStorage(extraEnv: Record<string, string | undefined> = {}) {
  vi.resetModules()
  process.env = { ...process.env, ...baseEnv }
  for (const [key, value] of Object.entries(extraEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
  return import('./storage.js')
}

describe('storage', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('fails clearly when video storage is not configured', async () => {
    const storage = await importStorage({
      STORAGE_PROVIDER: undefined,
      STORAGE_BUCKET: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    })

    await expect(storage.generateUploadIntent(metadata)).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringContaining('Video upload is not configured yet'),
    })
  })

  it('rejects invalid video MIME types before provider calls', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const storage = await importStorage({
      STORAGE_PROVIDER: 'SUPABASE',
      STORAGE_BUCKET: 'lesson-videos',
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })

    await expect(storage.generateUploadIntent({
      ...metadata,
      mimeType: 'application/pdf',
    })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Unsupported video file type'),
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects oversized videos before provider calls', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const storage = await importStorage({
      STORAGE_PROVIDER: 'SUPABASE',
      STORAGE_BUCKET: 'lesson-videos',
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })

    await expect(storage.generateUploadIntent({
      ...metadata,
      fileSizeBytes: storage.MAX_VIDEO_UPLOAD_BYTES + 1,
    })).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('too large'),
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns real Supabase signed upload details from the provider response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ signedURL: '/storage/v1/object/upload/sign/lesson-videos/key?token=abc' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)
    const storage = await importStorage({
      STORAGE_PROVIDER: 'SUPABASE',
      STORAGE_BUCKET: 'lesson-videos',
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })

    const intent = await storage.generateUploadIntent(metadata)

    expect(intent.provider).toBe('SUPABASE')
    expect(intent.uploadMethod).toBe('PUT')
    expect(intent.uploadUrl).toBe('https://project.supabase.co/storage/v1/object/upload/sign/lesson-videos/key?token=abc')
    expect(intent.storageKey).toMatch(/^courses\/course-1\/modules\/module-1\/lessons\/lesson-1\//)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/storage/v1/object/upload/sign/lesson-videos/courses/course-1/modules/module-1/lessons/lesson-1/'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('verifies an uploaded object with the provider before attach', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const storage = await importStorage({
      STORAGE_PROVIDER: 'SUPABASE',
      STORAGE_BUCKET: 'lesson-videos',
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })

    await storage.verifyStoredVideoExists('courses/course-1/modules/module-1/lessons/lesson-1/video.mp4')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/storage/v1/object/lesson-videos/courses/course-1/modules/module-1/lessons/lesson-1/video.mp4',
      expect.objectContaining({ method: 'HEAD' }),
    )
  })

  it('rejects storage keys outside the expected lesson path', async () => {
    const storage = await importStorage()

    expect(() => storage.assertLessonVideoStorageKey('courses/other/modules/module-1/lessons/lesson-1/video.mp4', {
      courseId: 'course-1',
      moduleId: 'module-1',
      lessonId: 'lesson-1',
    })).toThrow('Invalid video storage key')
  })
})
