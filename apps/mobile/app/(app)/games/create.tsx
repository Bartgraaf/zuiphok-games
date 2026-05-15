import { View, Text, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CreateGameSchema, CreateGameInput } from '@zuiphok/shared'
import { gamesService } from '../../../src/services/games'
import { Input } from '../../../src/components/ui/Input'
import { Button } from '../../../src/components/ui/Button'

export default function CreateGameScreen() {
  const queryClient = useQueryClient()

  const { control, handleSubmit, formState: { errors } } = useForm<CreateGameInput>({
    resolver: zodResolver(CreateGameSchema),
    defaultValues: { name: '', description: '' },
  })

  const { mutate: createGame, isPending } = useMutation({
    mutationFn: gamesService.create,
    onSuccess: (game) => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      router.replace(`/(app)/games/${game.id}`)
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  return (
    <ScrollView className="flex-1 bg-white" keyboardShouldPersistTaps="handled">
      <View className="px-6 pt-6 pb-12">
        <Text className="text-gray-500 mb-6">Create a new game and share the invite code with players.</Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Game Name"
              placeholder="e.g. City Scavenger Hunt"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Description (optional)"
              placeholder="What's this game about?"
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

        <Button
          title="Create Game"
          onPress={handleSubmit((data) => createGame(data))}
          loading={isPending}
        />
      </View>
    </ScrollView>
  )
}
