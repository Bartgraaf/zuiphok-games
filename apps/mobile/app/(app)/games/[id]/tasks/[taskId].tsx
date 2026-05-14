import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Alert, Image, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../../../../src/store/auth'
import { submissionsService, Submission } from '../../../../../src/services/submissions'
import { tasksService } from '../../../../../src/services/tasks'
import { uploadMedia } from '../../../../../src/services/upload'
import { saveDraft, loadDraft, clearDraft } from '../../../../../src/store/drafts'
import { useUploadQueue } from '../../../../../src/store/uploadQueue'
import { getDb } from '../../../../../src/db/sqlite'

type TaskType = 'TEXT' | 'PHOTO' | 'VIDEO' | 'MIXED'

interface Task {
  id: string; title: string; description: string | null
  taskType: TaskType; points: number; requiresLocation: boolean; timeLimit: number | null
}

interface PickedAsset {
  uri: string; mimeType: string; fileName: string | null | undefined
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function TaskDetailScreen() {
  const { id: gameId, taskId } = useLocalSearchParams<{ id: string; taskId: string }>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const enqueue = useUploadQueue((s) => s.enqueue)
  const processQueue = useUploadQueue((s) => s.process)

  const [text, setText] = useState('')
  const [pickedMedia, setPickedMedia] = useState<PickedAsset[]>([])
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isCapturingLocation, setIsCapturingLocation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [teamId, setTeamId] = useState<string | null>(null)

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize SQLite and load draft
  useEffect(() => {
    getDb() // ensure schema is created
    useUploadQueue.getState().load()
    useUploadQueue.getState().process()
  }, [])

  // Fetch task
  const { data: task } = useQuery<Task>({
    queryKey: ['task', taskId],
    queryFn: () => tasksService.get(taskId),
    enabled: !!taskId,
  })

  // Fetch submissions for this task
  const { data: submissions = [], refetch: refetchSubmissions, isLoading: loadingSubmissions } = useQuery<Submission[]>({
    queryKey: ['submissions', taskId],
    queryFn: () => submissionsService.listForTask(taskId),
    enabled: !!taskId,
  })

  // Find the user's team for this game by looking at their submission or game detail
  useEffect(() => {
    if (!submissions.length || !user) return
    const mine = submissions.find((s) => s.userId === user.id)
    if (mine) setTeamId(mine.teamId)
  }, [submissions, user])

  // Load draft when task + teamId are known
  useEffect(() => {
    if (!task || !teamId) return
    const saved = loadDraft(task.id, teamId)
    if (saved) setText(saved)
  }, [task?.id, teamId])

  const handleTextChange = useCallback((val: string) => {
    setText(val)
    if (!task || !teamId) return
    // Debounced autosave
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => saveDraft(task.id, teamId, val), 800)
  }, [task?.id, teamId])

  const captureLocation = async () => {
    setIsCapturingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required for this task.')
        return
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
    } catch {
      Alert.alert('Error', 'Could not get location. Try again.')
    } finally {
      setIsCapturingLocation(false)
    }
  }

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Please allow access to your media library.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: task?.taskType === 'VIDEO'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    })
    if (!result.canceled) {
      setPickedMedia((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          mimeType: a.mimeType ?? (a.type === 'video' ? 'video/mp4' : 'image/jpeg'),
          fileName: a.fileName,
        })),
      ])
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Please allow camera access.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!result.canceled) {
      const a = result.assets[0]
      setPickedMedia((prev) => [...prev, { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', fileName: a.fileName }])
    }
  }

  const removeMedia = (index: number) => {
    setPickedMedia((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!task) return

    if (task.requiresLocation && !location) {
      Alert.alert('Location required', 'This task requires GPS. Tap the location button first.')
      return
    }

    setIsSubmitting(true)
    setUploadStatus('Creating submission…')

    try {
      // 1. Create the submission record
      const submission = await submissionsService.create({
        taskId: task.id,
        text: text.trim() || undefined,
        locationLat: location?.lat,
        locationLng: location?.lng,
      })

      // 2. Enqueue all media files
      if (pickedMedia.length > 0) {
        setUploadStatus(`Uploading 0/${pickedMedia.length}…`)
        for (let i = 0; i < pickedMedia.length; i++) {
          const asset = pickedMedia[i]
          enqueue(submission.id, asset.uri, asset.mimeType)
          setUploadStatus(`Uploading ${i + 1}/${pickedMedia.length}…`)
        }
        // Process the queue immediately (best-effort; retries on next app launch if offline)
        await processQueue()
      }

      // 3. Clear draft and local state
      if (teamId) clearDraft(task.id, teamId)
      setText('')
      setPickedMedia([])
      setLocation(null)

      queryClient.invalidateQueries({ queryKey: ['submissions', taskId] })
      Alert.alert('Submitted!', pickedMedia.length > 0
        ? 'Your submission is in. Media uploads will finish in the background.'
        : 'Your submission was saved.')
    } catch (err: any) {
      // Offline fallback: save to SQLite
      const db = getDb()
      const offlineId = `offline-${Date.now()}`
      db.runSync(
        'INSERT INTO offline_submissions (id, task_id, text, location_lat, location_lng, media_uris, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [offlineId, task.id, text || null, location?.lat ?? null, location?.lng ?? null, JSON.stringify(pickedMedia.map((m) => m.uri)), Date.now()]
      )
      Alert.alert(
        'Saved offline',
        'No connection. Your submission is saved locally and will sync automatically when you reconnect.'
      )
    } finally {
      setIsSubmitting(false)
      setUploadStatus('')
    }
  }

  const showMediaPicker = task && ['PHOTO', 'VIDEO', 'MIXED'].includes(task.taskType)
  const showTextInput = task && ['TEXT', 'MIXED'].includes(task.taskType)

  return (
    <ScrollView className="flex-1 bg-slate-900" keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: task?.title ?? 'Task' }} />

      {task && (
        <View className="px-4 pt-4 pb-8">
          {/* Task header */}
          <View className="bg-slate-800 rounded-2xl p-4 mb-5 border border-slate-700">
            <View className="flex-row items-center gap-2 mb-2">
              <View className="bg-blue-900 rounded-full px-3 py-0.5">
                <Text className="text-blue-300 text-xs font-medium">{task.taskType}</Text>
              </View>
              <Text className="text-blue-400 font-bold">{task.points} pts</Text>
              {task.requiresLocation && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="location-outline" size={13} color="#64748b" />
                  <Text className="text-slate-500 text-xs">GPS required</Text>
                </View>
              )}
            </View>
            <Text className="text-white text-xl font-bold">{task.title}</Text>
            {task.description && (
              <Text className="text-slate-400 mt-2 text-sm leading-5">{task.description}</Text>
            )}
          </View>

          {/* Previous submissions */}
          {submissions.length > 0 && (
            <View className="mb-6">
              <Text className="text-white font-bold text-base mb-3">
                Team submissions ({submissions.length})
              </Text>
              {submissions.map((sub) => (
                <SubmissionCard key={sub.id} submission={sub} currentUserId={user?.id} />
              ))}
            </View>
          )}

          {/* Submission form */}
          <Text className="text-white font-bold text-base mb-3">New submission</Text>

          {showTextInput && (
            <View className="mb-3">
              <Text className="text-slate-300 text-sm font-medium mb-1">
                Text {task.taskType !== 'TEXT' ? '(optional)' : ''}
              </Text>
              <TextInput
                className="bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700 text-sm"
                placeholder="Write your answer here…"
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={5}
                style={{ height: 120, textAlignVertical: 'top' }}
                value={text}
                onChangeText={handleTextChange}
              />
              {teamId && text.length > 0 && (
                <Text className="text-slate-600 text-xs mt-1">Draft autosaved</Text>
              )}
            </View>
          )}

          {/* GPS capture */}
          {task.requiresLocation && (
            <TouchableOpacity
              className={`flex-row items-center gap-2 rounded-xl px-4 py-3 mb-3 border ${
                location ? 'bg-green-950 border-green-800' : 'bg-slate-800 border-slate-700'
              }`}
              onPress={captureLocation}
              disabled={isCapturingLocation}
            >
              {isCapturingLocation ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Ionicons
                  name={location ? 'location' : 'location-outline'}
                  size={18}
                  color={location ? '#4ade80' : '#64748b'}
                />
              )}
              <Text className={location ? 'text-green-400 text-sm' : 'text-slate-400 text-sm'}>
                {location
                  ? `GPS captured (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
                  : 'Tap to capture GPS location'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Media picker */}
          {showMediaPicker && (
            <View className="mb-4">
              <Text className="text-slate-300 text-sm font-medium mb-2">
                Media {task.taskType === 'MIXED' ? '(optional)' : ''}
              </Text>

              {/* Picked media preview */}
              {pickedMedia.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                  <View className="flex-row gap-2">
                    {pickedMedia.map((asset, i) => (
                      <View key={i} className="relative">
                        <Image
                          source={{ uri: asset.uri }}
                          className="w-20 h-20 rounded-lg bg-slate-700"
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full w-5 h-5 items-center justify-center"
                          onPress={() => removeMedia(i)}
                        >
                          <Text className="text-white text-xs font-bold leading-none">×</Text>
                        </TouchableOpacity>
                        {asset.mimeType.startsWith('video') && (
                          <View className="absolute inset-0 items-center justify-center">
                            <Ionicons name="play-circle" size={24} color="white" />
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-2 bg-slate-800 border border-slate-700 rounded-xl py-3"
                  onPress={takePhoto}
                >
                  <Ionicons name="camera-outline" size={18} color="#94a3b8" />
                  <Text className="text-slate-300 text-sm">Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-2 bg-slate-800 border border-slate-700 rounded-xl py-3"
                  onPress={pickFromGallery}
                >
                  <Ionicons name="images-outline" size={18} color="#94a3b8" />
                  <Text className="text-slate-300 text-sm">Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${isSubmitting ? 'bg-blue-800 opacity-60' : 'bg-blue-600 active:bg-blue-700'}`}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-semibold">{uploadStatus}</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-base">Submit</Text>
            )}
          </TouchableOpacity>

          {/* Upload queue status */}
          <UploadQueueBadge />
        </View>
      )}
    </ScrollView>
  )
}

function SubmissionCard({ submission, currentUserId }: { submission: Submission; currentUserId?: string }) {
  const isOwn = submission.userId === currentUserId
  const date = new Date(submission.submittedAt).toLocaleString()

  return (
    <View className={`rounded-xl p-4 mb-2 border ${isOwn ? 'bg-blue-950 border-blue-800' : 'bg-slate-800 border-slate-700'}`}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-slate-300 text-sm font-medium">{submission.user.name}</Text>
        <Text className="text-slate-600 text-xs">{date}</Text>
      </View>

      {submission.text && (
        <Text className="text-white text-sm mb-2 leading-5">{submission.text}</Text>
      )}

      {submission.locationLat != null && (
        <View className="flex-row items-center gap-1 mb-2">
          <Ionicons name="location" size={12} color="#4ade80" />
          <Text className="text-green-400 text-xs">
            {submission.locationLat.toFixed(4)}, {submission.locationLng?.toFixed(4)}
          </Text>
        </View>
      )}

      {submission.media.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {submission.media.map((m) => (
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
  )
}

function UploadQueueBadge() {
  const items = useUploadQueue((s) => s.items)
  const retryFailed = useUploadQueue((s) => s.retryFailed)
  const process = useUploadQueue((s) => s.process)

  const pending = items.filter((i) => i.status === 'pending' || i.status === 'uploading').length
  const failed = items.filter((i) => i.status === 'failed').length

  if (pending === 0 && failed === 0) return null

  return (
    <View className="mt-4 bg-slate-800 rounded-xl p-3 border border-slate-700">
      {pending > 0 && (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text className="text-slate-400 text-sm">{pending} upload{pending > 1 ? 's' : ''} pending…</Text>
        </View>
      )}
      {failed > 0 && (
        <TouchableOpacity
          className="flex-row items-center gap-2 mt-1"
          onPress={() => { retryFailed(); process() }}
        >
          <Ionicons name="refresh-outline" size={14} color="#ef4444" />
          <Text className="text-red-400 text-sm">{failed} upload{failed > 1 ? 's' : ''} failed — tap to retry</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
