import {
  View, Text, ScrollView, Image, ActivityIndicator,
  RefreshControl, TouchableOpacity, Modal, Linking, Alert,
} from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../../../../../src/services/api'
import { tasksService } from '../../../../../../src/services/tasks'
import { submissionsService, Submission, SubmissionMedia } from '../../../../../../src/services/submissions'
import { teamsService } from '../../../../../../src/services/teams'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Task {
  id: string
  title: string
  description: string | null
  taskType: string
  points: number
}

interface Completion {
  taskId: string
  teamId: string
  markedAt: string
  markedBy: { id: string; name: string }
}

export default function TeamReviewScreen() {
  const { id: gameId, teamId } = useLocalSearchParams<{ id: string; teamId: string }>()
  const queryClient = useQueryClient()
  const [previewMedia, setPreviewMedia] = useState<SubmissionMedia | null>(null)

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

  const { data: completions = [], isLoading: loadingCompletions } = useQuery<Completion[]>({
    queryKey: ['team-completions', teamId],
    queryFn: () => api.get(`/teams/${teamId}/completions`).then((r) => r.data.completions),
    enabled: !!teamId,
  })

  const { mutate: markComplete, isPending: isMarking } = useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/tasks/${taskId}/teams/${teamId}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-completions', teamId] }),
    onError: (err: any) => Alert.alert('Error', err.response?.data?.error ?? err.message),
  })

  const { mutate: unmarkComplete, isPending: isUnmarking } = useMutation({
    mutationFn: (taskId: string) =>
      api.delete(`/tasks/${taskId}/teams/${teamId}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-completions', teamId] }),
    onError: (err: any) => Alert.alert('Error', err.response?.data?.error ?? err.message),
  })

  const isLoading = loadingTasks || loadingSubmissions || loadingCompletions

  const completionMap = completions.reduce<Record<string, Completion>>((acc, c) => {
    acc[c.taskId] = c
    return acc
  }, {})

  const byTask = submissions.reduce<Record<string, Submission[]>>((acc, s) => {
    if (!acc[s.taskId]) acc[s.taskId] = []
    acc[s.taskId].push(s)
    return acc
  }, {})

  const completedTasks = tasks.filter((t) => completionMap[t.id])
  const earnedPoints = completedTasks.reduce((sum, t) => sum + t.points, 0)
  const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0)

  const openMedia = (media: SubmissionMedia) => {
    if (media.mimeType.startsWith('video')) {
      Linking.openURL(`${BASE_URL}/uploads/${media.filePath}`)
    } else {
      setPreviewMedia(media)
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator color="#3b82f6" />
      </View>
    )
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-slate-900"
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#3b82f6" />}
      >
        <Stack.Screen options={{ title: team?.name ?? 'Team Review' }} />

        <View className="px-4 pt-4 pb-8">
          {/* Team summary */}
          <View className="bg-slate-800 rounded-2xl p-4 mb-5 border border-slate-700">
            <Text className="text-white text-xl font-bold mb-3">{team?.name}</Text>
            <View className="flex-row gap-4">
              <View className="items-center flex-1">
                <Text className="text-blue-400 text-lg font-bold">{completedTasks.length}/{tasks.length}</Text>
                <Text className="text-slate-500 text-xs">Completed</Text>
              </View>
              <View className="w-px bg-slate-700" />
              <View className="items-center flex-1">
                <Text className="text-green-400 text-lg font-bold">{earnedPoints}/{totalPoints}</Text>
                <Text className="text-slate-500 text-xs">Points</Text>
              </View>
              <View className="w-px bg-slate-700" />
              <View className="items-center flex-1">
                <Text className="text-slate-300 text-lg font-bold">{submissions.length}</Text>
                <Text className="text-slate-500 text-xs">Submissions</Text>
              </View>
            </View>

            {team?.members && team.members.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700">
                {team.members.map((m: any) => (
                  <Text key={m.id} className="text-slate-400 text-xs bg-slate-700 rounded-full px-2 py-0.5">
                    {m.user.name}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Tasks */}
          {tasks.map((task) => {
            const taskSubs = byTask[task.id] ?? []
            const completion = completionMap[task.id]
            const isComplete = !!completion

            return (
              <View key={task.id} className="mb-4">
                {/* Task header */}
                <View className={`rounded-xl p-3 border mb-1 ${isComplete ? 'bg-green-950 border-green-800' : 'bg-slate-800 border-slate-700'}`}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2 flex-1">
                      <Ionicons
                        name={isComplete ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={isComplete ? '#4ade80' : '#475569'}
                      />
                      <Text className="text-white font-semibold flex-1" numberOfLines={1}>{task.title}</Text>
                      <Text className="text-blue-400 font-bold text-sm">{task.points}pt</Text>
                    </View>
                  </View>

                  {/* Mark complete / unmark */}
                  <View className="mt-2 flex-row items-center justify-between">
                    {isComplete ? (
                      <>
                        <Text className="text-green-400 text-xs">
                          Marked by {completion.markedBy.name} · {new Date(completion.markedAt).toLocaleDateString()}
                        </Text>
                        <TouchableOpacity
                          className="bg-slate-700 rounded-full px-3 py-1"
                          onPress={() => unmarkComplete(task.id)}
                          disabled={isUnmarking}
                        >
                          <Text className="text-slate-300 text-xs">Unmark</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text className="text-slate-500 text-xs">
                          {taskSubs.length} submission{taskSubs.length !== 1 ? 's' : ''}
                        </Text>
                        <TouchableOpacity
                          className={`rounded-full px-3 py-1 ${taskSubs.length > 0 ? 'bg-green-700' : 'bg-slate-700 opacity-50'}`}
                          onPress={() => markComplete(task.id)}
                          disabled={isMarking}
                        >
                          <Text className="text-white text-xs font-medium">Mark Complete</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>

                {/* Submissions */}
                {taskSubs.length > 0 ? (
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
                              <TouchableOpacity key={m.id} onPress={() => openMedia(m)} activeOpacity={0.8}>
                                <View className="w-16 h-16 rounded-lg bg-slate-700 overflow-hidden">
                                  {m.mimeType.startsWith('image') ? (
                                    <Image
                                      source={{ uri: `${BASE_URL}/uploads/${m.filePath}` }}
                                      className="w-full h-full"
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View className="w-full h-full items-center justify-center">
                                      <Ionicons name="play-circle" size={28} color="#94a3b8" />
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>
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

      {/* Full-screen image preview */}
      <Modal
        visible={!!previewMedia}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewMedia(null)}
      >
        <View className="flex-1 bg-black items-center justify-center">
          <TouchableOpacity
            className="absolute top-12 right-4 z-10 bg-black/50 rounded-full p-2"
            onPress={() => setPreviewMedia(null)}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {previewMedia && (
            <Image
              source={{ uri: `${BASE_URL}/uploads/${previewMedia.filePath}` }}
              style={{ width: '100%', height: '85%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  )
}
