import { View, Text, FlatList, Alert, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { teamsService } from '../../../../../src/services/teams'
import { Input } from '../../../../../src/components/ui/Input'
import { Button } from '../../../../../src/components/ui/Button'

interface Team {
  id: string
  name: string
  _count: { members: number }
  members: { id: string; userId: string; user: { id: string; name: string; email: string } }[]
}

export default function ManageTeamsScreen() {
  const { id: gameId } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ['teams', gameId],
    queryFn: () => teamsService.list(gameId),
    enabled: !!gameId,
  })

  const { mutate: createTeam, isPending } = useMutation({
    mutationFn: () => teamsService.create(gameId, { name: name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', gameId] })
      queryClient.invalidateQueries({ queryKey: ['game', gameId] })
      setName('')
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  const { mutate: removeMember } = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      teamsService.leave(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', gameId] })
      queryClient.invalidateQueries({ queryKey: ['game', gameId] })
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  const confirmRemove = (teamId: string, userId: string, memberName: string) => {
    Alert.alert('Remove member', `Remove ${memberName} from this team?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember({ teamId, userId }) },
    ])
  }

  return (
    <View className="flex-1 bg-white px-4 pt-4">
      {/* Create team form */}
      <View className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
        <Text className="text-gray-900 font-semibold mb-3">Add Team</Text>
        <Input
          label="Team Name"
          placeholder="e.g. Red Team"
          value={name}
          onChangeText={setName}
        />
        <Button
          title="Create Team"
          onPress={() => createTeam()}
          loading={isPending}
          disabled={name.trim().length < 2}
        />
      </View>

      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-200">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-900 font-semibold">{item.name}</Text>
              <Text className="text-gray-400 text-xs">{item._count.members} members</Text>
            </View>
            {item.members.map((m) => (
              <View key={m.id} className="flex-row items-center justify-between py-1.5 border-t border-gray-200">
                <Text className="text-gray-600 text-sm">{m.user.name}</Text>
                <TouchableOpacity onPress={() => confirmRemove(item.id, m.userId, m.user.name)}>
                  <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            {item.members.length === 0 && (
              <Text className="text-gray-400 text-sm text-center py-2">No members yet</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text className="text-gray-400 text-center py-8">No teams yet. Create one above.</Text>
          ) : null
        }
      />
    </View>
  )
}
