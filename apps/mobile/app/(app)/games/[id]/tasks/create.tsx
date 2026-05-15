import { View, Text, ScrollView, Alert, Switch, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CreateTaskSchema, CreateTaskInput } from '@zuiphok/shared'
import { tasksService } from '../../../../../src/services/tasks'
import { Input } from '../../../../../src/components/ui/Input'
import { Button } from '../../../../../src/components/ui/Button'

type TaskType = 'TEXT' | 'PHOTO' | 'VIDEO' | 'MIXED'
const TASK_TYPES: TaskType[] = ['TEXT', 'PHOTO', 'VIDEO', 'MIXED']

export default function CreateTaskScreen() {
  const { id: gameId } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      taskType: 'TEXT',
      points: 10,
      requiresLocation: false,
    },
  })

  const selectedType = watch('taskType')
  const requiresLocation = watch('requiresLocation')

  const { mutate: createTask, isPending } = useMutation({
    mutationFn: (data: CreateTaskInput) => tasksService.create(gameId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] })
      router.back()
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  return (
    <ScrollView className="flex-1 bg-white" keyboardShouldPersistTaps="handled">
      <View className="px-6 pt-6 pb-12">
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Task Title"
              placeholder="e.g. Take a photo at the fountain"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.title?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Description (optional)"
              placeholder="More details about what players need to do"
              multiline
              numberOfLines={3}
              style={{ height: 80, textAlignVertical: 'top' }}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
              error={errors.description?.message}
            />
          )}
        />

        {/* Task Type */}
        <Text className="text-gray-600 text-sm font-medium mb-2">Task Type</Text>
        <View className="flex-row gap-2 mb-4 flex-wrap">
          {TASK_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setValue('taskType', type)}
              className={`rounded-xl px-4 py-2 border ${selectedType === type ? 'bg-[#166d12] border-blue-500' : 'bg-gray-50 border-gray-200'}`}
            >
              <Text className={`text-sm font-medium ${selectedType === type ? 'text-gray-900' : 'text-gray-500'}`}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Controller
          control={control}
          name="points"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Points"
              placeholder="10"
              keyboardType="number-pad"
              onBlur={onBlur}
              onChangeText={(v) => onChange(parseInt(v) || 10)}
              value={String(value ?? 10)}
              error={errors.points?.message}
            />
          )}
        />

        {/* Requires Location */}
        <View className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mb-4 border border-gray-200">
          <Text className="text-gray-600 text-sm font-medium">Requires GPS location</Text>
          <Switch
            value={requiresLocation}
            onValueChange={(v) => setValue('requiresLocation', v)}
            trackColor={{ false: '#E5E7EB', true: '#1A8917' }}
            thumbColor={requiresLocation ? '#1A8917' : '#9CA3AF'}
          />
        </View>

        <Button
          title="Create Task"
          onPress={handleSubmit((data) => createTask(data))}
          loading={isPending}
        />
      </View>
    </ScrollView>
  )
}
