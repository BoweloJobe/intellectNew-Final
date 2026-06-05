export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatarUrl: string | null
  isVerified: boolean
  createdAt: Date
}

export interface AuthTokenPayload {
  id: string
  email: string
  role: string
}

export interface AuthResponse {
  token: string
  user: UserProfile
}
