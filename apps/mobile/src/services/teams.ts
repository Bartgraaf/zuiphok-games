import { api } from './api'
import { CreateTeamInput } from '@zuiphok/shared'

export const teamsService = {
  list: (gameId: string) => api.get(`/games/${gameId}/teams`).then((r) => r.data.teams),
  get: (teamId: string) => api.get(`/teams/${teamId}`).then((r) => r.data.team),
  create: (gameId: string, data: CreateTeamInput) =>
    api.post(`/games/${gameId}/teams`, data).then((r) => r.data.team),
  join: (teamId: string) => api.post(`/teams/${teamId}/join`).then((r) => r.data.member),
  leave: (teamId: string, userId: string) => api.delete(`/teams/${teamId}/members/${userId}`),
  movePlayer: (gameId: string, userId: string, teamId: string) =>
    api.patch(`/games/${gameId}/players/${userId}/team`, { teamId }),
}
