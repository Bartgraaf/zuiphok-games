import { useState } from 'react'
import { View, Text, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesService } from '../../../src/services/games'
import { teamsService } from '../../../src/services/teams'
import { Input } from '../../../src/components/ui/Input'
import { Button } from '../../../src/components/ui/Button'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface TeamOption {
  id: string
  name: string
  _count: { members: number }
}

interface FoundGame {
  id: string
  name: string
  description: string | null
  status: string
  teams: TeamOption[]
  _count: { tasks: number }
}

export default function JoinGameScreen() {
  const [code, setCode] = useState('')
  const [foundGame, setFoundGame] = useState<FoundGame | null>(null)
  const queryClient = useQueryClient()

  const { mutate: findGame, isPending: isFinding } = useMutation({
    mutationFn: () => gamesService.findByCode(code.trim().toUpperCase()),
    onSuccess: (game) => setFoundGame(game),
    onError: (err: Error) => Alert.alert('Not found', err.message),
  })

  const { mutate: joinTeam, isPending: isJoining } = useMutation({
    mutationFn: (teamId: string) => teamsService.join(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] })
      Alert.alert('Joined!', `You joined ${foundGame?.name}`, [
        { text: 'OK', onPress: () => router.replace(`/(app)/games/${foundGame?.id}`) },
      ])
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  })

  return (
    <ScrollView className="flex-1 bg-slate-900" keyboardShouldPersistTaps="handled">
      <View className="px-6 pt-6 pb-12">
        <Text className="text-slate-400 mb-6">Enter the invite code from your game admin.</Text>

        <Input
          label="Invite Code"
          placeholder="Enter code"
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
        />

        <Button
          title="Find Game"
          onPress={() => findGame()}
          loading={isFinding}
          disabled={code.trim().length < 3}
        />

        {foundGame && (
          <View className="mt-8">
            <View className="bg-slate-800 rounded-2xl p-4 mb-4 border border-slate-700">
              <Text className="text-white text-lg font-bold">{foundGame.name}</Text>
              {foundGame.description && (
                <Text className="text-slate-400 text-sm mt-1">{foundGame.description}</Text>
              )}
              <Text className="text-slate-500 text-xs mt-2">{foundGame._count.tasks} tasks</Text>
            </View>

            <Text className="text-slate-300 font-semibold mb-3">Choose a team</Text>

            {foundGame.teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-2 flex-row items-center justify-between"
                onPress={() => joinTeam(team.id)}
                disabled={isJoining}
              >
                <View>
                  <Text className="text-white font-medium">{team.name}</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">{team._count.members} members</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748b" />
              </TouchableOpacity>
            ))}

            {foundGame.teams.length === 0 && (
              <Text className="text-slate-500 text-center py-4">No teams yet — ask the admin to create one</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  )
}
