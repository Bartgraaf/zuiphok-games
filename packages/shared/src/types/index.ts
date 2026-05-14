export type Role = 'ADMIN' | 'PLAYER'

export type GameStatus = 'DRAFT' | 'ACTIVE' | 'FINISHED'

export type TaskType = 'TEXT' | 'PHOTO' | 'VIDEO' | 'MIXED'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

export interface Game {
  id: string
  name: string
  description: string | null
  status: GameStatus
  inviteCode: string
  startDate: string | null
  endDate: string | null
  createdAt: string
}

export interface Team {
  id: string
  name: string
  gameId: string
  createdAt: string
}

export interface Task {
  id: string
  gameId: string
  title: string
  description: string | null
  taskType: TaskType
  points: number
  requiresLocation: boolean
  timeLimit: number | null
  createdAt: string
}

export interface Submission {
  id: string
  taskId: string
  teamId: string
  userId: string
  text: string | null
  locationLat: number | null
  locationLng: number | null
  submittedAt: string
}

export interface Media {
  id: string
  submissionId: string
  filePath: string
  mimeType: string
  thumbnailPath: string | null
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}
