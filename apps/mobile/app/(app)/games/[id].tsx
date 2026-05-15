import { View, Text, ScrollView, TouchableOpacity, Share, Alert, RefreshControl } from 'react-native'
import { useLocalSearchParams, router, useNavigation, Stack } from 'expo-router'
import { useLayoutEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../../src/store/auth'
import { gamesService } from '../../../src/services/games'
import { teamsService } from '../../../src/services/teams'

type GameStatus = 'DRAFT' | 'ACTIVE' | 'FINISHED'
type TaskType = 'TEXT' | 'PHOTO' | 'VIDEO' | 'MIXED'

interface TeamMemberUser { id: string; name: string; email: string }
interface TeamMember { id: string; userId: string; user: TeamMemberUser }
interface Team {
  id: string; name: string
  _count: { members: number }
  members: TeamMember[]
}
interface Task {
  id: string; title: string; description: string | null
  taskType: TaskType; points: number; requiresLocation: boolean; timeLimit: number | null
  _count: { submissions: number }
}
interface Game {
  id: string; name: string; description: string | null
  status: GameStatus; inviteCode: string
  teams: Team[]; tasks: Task[]
  _count: { teams: number; tasks: number }
}

const statusColors: Record<GameStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-[#1A8917]',
  FINISHED: 'bg-gray-100 text-gray-400',
}

const taskTypeIcons: Record<TaskType, string> = {
  TEXT: 'document-text-outline',
  PHOTO: 'camera-outline',
  VIDEO: 'videocam-outline',
  MIXED: 'albums-outline',
}

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const navigation = useNavigation()
  const queryClient = useQueryClient()

  const { data: game, isLoading, refetch } = useQuery<Game>({
    queryKey: ['game', id],
    queryFn: () => gamesService.get(id),
    enabled: !!id,
  })

  useLayoutEffect(() => {
    if (!game) return
    navigation.setOptions({ title: game.name })
  }, [game?.name])

  const { mutate: changeStatus } = useMutation({
    mutationFn: (status: GameStatus) => gamesService.changeStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game', id] }),
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  const { mutate: joinTeam, isPending: isJoining } = useMutation({
    mutationFn: (teamId: string) => teamsService.join(teamId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game', id] }),
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  if (isLoading || !game) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">Loading...</Text>
      </View>
    )
  }

  const myTeam = game.teams.find((t) => t.members.some((m) => m.userId === user?.id))
  const statusClass = statusColors[game.status]

  const nextStatus: Record<GameStatus, GameStatus | null> = {
    DRAFT: 'ACTIVE',
    ACTIVE: 'FINISHED',
    FINISHED: null,
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#1A8917" />}
    >
      <Stack.Screen options={{ title: game.name }} />

      <View className="px-4 pt-4 pb-8">
        {/* Game header */}
        <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
          <View className="flex-row items-center justify-between mb-2">
            <View className={`rounded-full px-3 py-1 ${statusClass.split(' ')[0]}`}>
              <Text className={`text-xs font-semibold ${statusClass.split(' ')[1]}`}>{game.status}</Text>
            </View>
            {isAdmin && nextStatus[game.status] && (
              <TouchableOpacity
                className="bg-green-50 rounded-full px-3 py-1"
                onPress={() => changeStatus(nextStatus[game.status]!)}
              >
                <Text className="text-[#1A8917] text-xs font-medium">
                  → {nextStatus[game.status]}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {game.description && (
            <Text className="text-gray-500 text-sm mb-3">{game.description}</Text>
          )}

          {isAdmin && (
            <TouchableOpacity
              className="flex-row items-center gap-2 mt-1"
              onPress={() => Share.share({ message: `Join my game with code: ${game.inviteCode}` })}
            >
              <Ionicons name="share-outline" size={16} color="#1A8917" />
              <Text className="text-[#1A8917] text-sm font-mono">{game.inviteCode}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tasks section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-900 text-lg font-bold">Tasks ({game._count.tasks})</Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => router.push(`/(app)/games/${id}/tasks/create`)}>
                <Ionicons name="add-circle-outline" size={24} color="#1A8917" />
              </TouchableOpacity>
            )}
          </View>

          {game.tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              className="bg-gray-50 rounded-xl p-4 mb-2 border border-gray-200 active:opacity-70"
              onPress={() => router.push(`/(app)/games/${id}/tasks/${task.id}`)}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-gray-900 font-semibold">{task.title}</Text>
                  {task.description && (
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>{task.description}</Text>
                  )}
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-[#1A8917] font-bold text-sm">{task.points}pt</Text>
                  <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                </View>
              </View>
              <View className="flex-row items-center gap-3 mt-2">
                <View className="flex-row items-center gap-1">
                  <Ionicons name={taskTypeIcons[task.taskType] as any} size={13} color="#9CA3AF" />
                  <Text className="text-gray-400 text-xs">{task.taskType}</Text>
                </View>
                {task.requiresLocation && (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                    <Text className="text-gray-400 text-xs">GPS</Text>
                  </View>
                )}
                <Text className="text-gray-400 text-xs">{task._count.submissions} submissions</Text>
              </View>
            </TouchableOpacity>
          ))}

          {game.tasks.length === 0 && (
            <Text className="text-gray-400 text-sm text-center py-4">No tasks yet</Text>
          )}
        </View>

        {/* Teams section */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-900 text-lg font-bold">Teams ({game._count.teams})</Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => router.push(`/(app)/games/${id}/teams/`)}>
                <Ionicons name="people-outline" size={22} color="#1A8917" />
              </TouchableOpacity>
            )}
          </View>

          {game.teams.map((team) => {
            const isMine = myTeam?.id === team.id
            const canJoin = !myTeam && !isAdmin && game.status !== 'FINISHED'

            return (
              <TouchableOpacity
                key={team.id}
                className={`rounded-xl p-4 mb-2 border ${isMine ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                onPress={() => isAdmin && router.push(`/(app)/games/${id}/teams/${team.id}/review`)}
                activeOpacity={isAdmin ? 0.7 : 1}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-gray-900 font-semibold">{team.name}</Text>
                    {isMine && (
                      <View className="bg-green-100 rounded-full px-2 py-0.5">
                        <Text className="text-[#1A8917] text-xs">You</Text>
                      </View>
                    )}
                  </View>
                  {canJoin && (
                    <TouchableOpacity
                      className="bg-[#1A8917] rounded-full px-3 py-1"
                      onPress={() => joinTeam(team.id)}
                      disabled={isJoining}
                    >
                      <Text className="text-gray-900 text-xs font-medium">Join</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View className="flex-row flex-wrap gap-2 flex-1">
                  {team.members.map((m) => (
                    <Text key={m.id} className="text-gray-500 text-xs bg-gray-100 rounded-full px-2 py-0.5">
                      {m.user.name}
                    </Text>
                  ))}
                </View>
                {isAdmin && (
                  <View className="flex-row items-center mt-2">
                    <Text className="text-[#1A8917] text-xs mr-1">Review</Text>
                    <Ionicons name="chevron-forward" size={12} color="#1A8917" />
                  </View>
                )}
              </TouchableOpacity>
            )
          })}

          {game.teams.length === 0 && (
            <Text className="text-gray-400 text-sm text-center py-4">No teams yet</Text>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
