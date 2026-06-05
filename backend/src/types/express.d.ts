// Global augmentation of Express Request to carry the authenticated user.
// No top-level imports = ambient module = globally visible without importing this file.
declare namespace Express {
  interface Request {
    user?: {
      id: string
      email: string
      role: string
    }
  }
}
