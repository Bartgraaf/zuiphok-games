import { api } from './api'
import { CreateGameInput, UpdateGameInput } from '@zuiphok/shared'

export const gamesService = {
  list: () => api.get('/games').then((r) => r.data.games),
  findByCode: (code: string) => api.get(`/games/find?code=${encodeURIComponent(code)}`).then((r) => r.data.game),
  get: (id: string) => api.get(`/games/${id}`).then((r) => r.data.game),
  create: (data: CreateGameInput) => api.post('/games', data).then((r) => r.data.game),
  update: (id: string, data: UpdateGameInput) => api.patch(`/games/${id}`, data).then((r) => r.data.game),
  changeStatus: (id: string, status: string) => api.patch(`/games/${id}/status`, { status }).then((r) => r.data.game),
  delete: (id: string) => api.delete(`/games/${id}`),
}
