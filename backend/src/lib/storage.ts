import crypto from 'node:crypto'
import { env } from '../config/env.js'

export interface UploadIntent {
  storageKey: string   // internal bucket path (store on the Lesson record)
  uploadUrl: string    // signed/presigned URL the client PUTs the file to
  provider: string     // 'SUPABASE' | 'S3' | 'LOCAL'
  expiresAt: string    // ISO timestamp — 15-minute window
}

/**
 * Generate an upload intent for a lesson video.
 *
 * Production wiring:
 *  - SUPABASE: swap the placeholder URL for `supabase.storage.createSignedUploadUrl(bucket, path)`
 *  - S3:       swap for AWS SDK `getSignedUrl(s3Client, new PutObjectCommand(…))`
 *
 * Until STORAGE_PROVIDER is configured the function returns a LOCAL placeholder
 * so the authoring flow can be exercised end-to-end in development.
 */
export function generateUploadIntent(lessonId: string): UploadIntent {
  const storageKey = `lessons/${lessonId}/${crypto.randomUUID()}.mp4`
  const expiresAt  = new Date(Date.now() + 15 * 60 * 1_000).toISOString()
  const provider   = env.STORAGE_PROVIDER ?? 'LOCAL'
  const base       = env.STORAGE_BASE_URL
  const bucket     = env.STORAGE_BUCKET

  if (provider === 'SUPABASE' && base && bucket) {
    // Replace with: const { data } = await supabase.storage.createSignedUploadUrl(bucket, storageKey)
    return {
      storageKey,
      uploadUrl: `${base}/storage/v1/object/upload/sign/${bucket}/${storageKey}`,
      provider,
      expiresAt,
    }
  }

  if (provider === 'S3' && base && bucket) {
    // Replace with: AWS SDK getSignedUrl(s3Client, new PutObjectCommand({ Bucket: bucket, Key: storageKey }), { expiresIn: 900 })
    return {
      storageKey,
      uploadUrl: `${base}/${bucket}/${storageKey}`,
      provider,
      expiresAt,
    }
  }

  // Development fallback — no real storage configured
  return {
    storageKey,
    uploadUrl: `http://localhost:${env.PORT}/dev-upload-placeholder/${storageKey}`,
    provider: 'LOCAL',
    expiresAt,
  }
}
