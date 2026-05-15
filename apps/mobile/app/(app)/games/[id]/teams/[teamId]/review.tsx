import { View, Text, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { tasksService } from '../../../../../../src/services/tasks'
import { submissionsService, Submission } from '../../../../../../src/services/submissions'
import { teamsService } from '../../../../../../src/services/teams'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Task {
  id: string
  title: string
  description: string | null
  taskType: string
  points: number
}

export default function TeamReviewScreen() {
  const { id: gameId, teamId } = useLocalSearchParams<{ id: string; teamId: string }>()

  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamsService.get(teamId),
    enabled: !!teamId,
  })

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ['tasks', gameId],
    queryFn: () => tasksService.list(gameId),
    enabled: !!gameId,
  })

  const { data: submissions = [], isLoading: loadingSubmissions, refetch } = useQuery<Submission[]>({
    queryKey: ['team-submissions', teamId],
    queryFn: () => submissionsService.listForTeam(teamId),
    enabled: !!teamId,
  })

  const isLoading = loadingTasks || loadingSubmissions

  // Group submissions by taskId
  const byTask = submissions.reduce<Record<string, Submission[]>>((acc, s) => {
    if (!acc[s.taskId]) acc[s.taskId] = []
    acc[s.taskId].push(s)
    return acc
  }, {})

  const completedCount = tasks.filter((t) => (byTask[t.id]?.length ?? 0) > 0).length
  const totalPoints = tasks.reduce((sum, t) => {
    return (byTask[t.id]?.length ?? 0) > 0 ? sum + t.points : sum
  }, 0)

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator color="#3b82f6" />
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-900"
      refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#3b82f6" />}
    >
      <Stack.Screen options={{ title: team?.name ?? 'Team Review' }} />

      <View className="px-4 pt-4 pb-8">
        {/* Team summary */}
        <View className="bg-slate-800 rounded-2xl p-4 mb-5 border border-slate-700">
          <Text className="text-white text-xl font-bold mb-1">{team?.name}</Text>
          <View className="flex-row gap-4 mt-2">
            <View className="items-center">
              <Text className="text-blue-400 text-lg font-bold">{completedCount}/{tasks.length}</Text>
              <Text className="text-slate-500 text-xs">Tasks done</Text>
            </View>
            <View className="w-px bg-slate-700" />
            <View className="items-center">
              <Text className="text-green-400 text-lg font-bold">{totalPoints}</Text>
              <Text className="text-slate-500 text-xs">Points earned</Text>
            </View>
            <View className="w-px bg-slate-700" />
            <View className="items-center">
              <Text className="text-slate-300 text-lg font-bold">{team?.members?.length ?? 0}</Text>
              <Text className="text-slate-500 text-xs">Members</Text>
            </View>
          </View>

          {/* Member list */}
          {team?.members && team.members.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-3">
              {team.members.map((m: any) => (
                <Text key={m.id} className="text-slate-400 text-xs bg-slate-700 rounded-full px-2 py-0.5">
                  {m.user.name}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Tasks with submissions */}
        {tasks.map((task) => {
          const taskSubs = byTask[task.id] ?? []
          const hasSubmissions = taskSubs.length > 0

          return (
            <View key={task.id} className="mb-4">
              {/* Task header */}
              <View className={`rounded-xl p-3 border flex-row items-center justify-between mb-1 ${
                hasSubmissions ? 'bg-green-950 border-green-800' : 'bg-slate-800 border-slate-700'
              }`}>
                <View className="flex-row items-center gap-2 flex-1">
                  <Ionicons
                    name={hasSubmissions ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={hasSubmissions ? '#4ade80' : '#475569'}
                  />
                  <Text className="text-white font-semibold flex-1" numberOfLines={1}>{task.title}</Text>
                </View>
                <Text className="text-blue-400 font-bold text-sm ml-2">{task.points}pt</Text>
              </View>

              {/* Submissions for this task */}
              {hasSubmissions ? (
                taskSubs.map((sub) => (
                  <View key={sub.id} className="bg-slate-800 rounded-xl p-3 mb-1 border border-slate-700 ml-6">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-slate-300 text-sm font-medium">{sub.user.name}</Text>
                      <Text className="text-slate-600 text-xs">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </Text>
                    </View>

                    {sub.text ? (
                      <Text className="text-white text-sm mb-2 leading-5">{sub.text}</Text>
                    ) : null}

                    {sub.locationLat != null && (
                      <View className="flex-row items-center gap-1 mb-2">
                        <Ionicons name="location" size={12} color="#4ade80" />
                        <Text className="text-green-400 text-xs">
                          {sub.locationLat.toFixed(4)}, {sub.locationLng?.toFixed(4)}
                        </Text>
                      </View>
                    )}

                    {sub.media.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                          {sub.media.map((m) => (
                            <View key={m.id} className="w-16 h-16 rounded-lg bg-slate-700 overflow-hidden">
                              {m.mimeType.startsWith('image') ? (
                                <Image
                                  source={{ uri: `${BASE_URL}/uploads/${m.filePath}` }}
                                  className="w-full h-full"
                                  resizeMode="cover"
                                />
                              ) : (
                                <View className="w-full h-full items-center justify-center">
                                  <Ionicons name="videocam" size={22} color="#64748b" />
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                ))
              ) : (
                <View className="ml-6 py-2">
                  <Text className="text-slate-600 text-xs italic">No submission yet</Text>
                </View>
              )}
            </View>
          )
        })}

        {tasks.length === 0 && (
          <Text className="text-slate-600 text-center py-8">No tasks in this game yet</Text>
        )}
      </View>
    </ScrollView>
  )
}
