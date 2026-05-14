import { api } from './api'
import { CreateSubmissionInput } from '@zuiphok/shared'

export interface SubmissionMedia {
  id: string
  submissionId: string
  filePath: string
  mimeType: string
  thumbnailPath: string | null
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
  user: { id: string; name: string; email: string }
  media: SubmissionMedia[]
}

export const submissionsService = {
  create: (data: CreateSubmissionInput) =>
    api.post<{ submission: Submission }>('/submissions', data).then((r) => r.data.submission),

  get: (id: string) =>
    api.get<{ submission: Submission }>(`/submissions/${id}`).then((r) => r.data.submission),

  listForTask: (taskId: string) =>
    api.get<{ submissions: Submission[] }>(`/tasks/${taskId}/submissions`).then((r) => r.data.submissions),

  listForTeam: (teamId: string) =>
    api.get<{ submissions: Submission[] }>(`/teams/${teamId}/submissions`).then((r) => r.data.submissions),

  deleteMedia: (mediaId: string) => api.delete(`/media/${mediaId}`),
}
