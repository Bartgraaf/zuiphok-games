import { api } from './api'
import { CreateTaskInput, UpdateTaskInput } from '@zuiphok/shared'

export const tasksService = {
  list: (gameId: string) => api.get(`/games/${gameId}/tasks`).then((r) => r.data.tasks),
  get: (taskId: string) => api.get(`/tasks/${taskId}`).then((r) => r.data.task),
  create: (gameId: string, data: CreateTaskInput) =>
    api.post(`/games/${gameId}/tasks`, data).then((r) => r.data.task),
  update: (taskId: string, data: UpdateTaskInput) =>
    api.patch(`/tasks/${taskId}`, data).then((r) => r.data.task),
  delete: (taskId: string) => api.delete(`/tasks/${taskId}`),
}
