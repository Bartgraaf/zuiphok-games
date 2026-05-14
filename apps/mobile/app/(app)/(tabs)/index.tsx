import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { router, useNavigation } from 'expo-router'
import { useLayoutEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../../src/store/auth'
import { gamesService } from '../../../src/services/games'

type GameStatus = 'DRAFT' | 'ACTIVE' | 'FINISHED'

interface GameItem {
  id: string
  name: string
  description: string | null
  status: GameStatus
  inviteCode: string
  _count: { teams: number; tasks: number }
}

const statusColors: Record<GameStatus, string> = {
  DRAFT: 'bg-slate-700 text-slate-300',
  ACTIVE: 'bg-green-900 text-green-300',
  FINISHED: 'bg-slate-800 text-slate-500',
}

export default function GamesScreen() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const navigation = useNavigation()

  const { data: games = [], isLoading, refetch } = useQuery<GameItem[]>({
    queryKey: ['games'],
    queryFn: gamesService.list,
  })

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        isAdmin ? (
          <TouchableOpacity onPress={() => router.push('/(app)/games/create')} className="mr-4">
            <Ionicons name="add" size={26} color="#3b82f6" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/(app)/games/join')} className="mr-4">
            <Ionicons name="enter-outline" size={22} color="#3b82f6" />
          </TouchableOpacity>
        ),
    })
  }, [isAdmin])

  return (
    <View className="flex-1 bg-slate-900">
      <FlatList
        data={games}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#3b82f6" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-slate-800 rounded-2xl p-4 mb-3 border border-slate-700"
            onPress={() => router.push(`/(app)/games/${item.id}`)}
          >
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-white text-lg font-semibold flex-1 mr-2">{item.name}</Text>
              <View className={`rounded-full px-2.5 py-0.5 ${statusColors[item.status].split(' ')[0]}`}>
                <Text className={`text-xs font-medium ${statusColors[item.status].split(' ')[1]}`}>
                  {item.status}
                </Text>
              </View>
            </View>
            {item.description && (
              <Text className="text-slate-400 text-sm mb-3" numberOfLines={2}>{item.description}</Text>
            )}
            <View className="flex-row gap-4">
              <Text className="text-slate-500 text-xs">{item._count.tasks} tasks</Text>
              <Text className="text-slate-500 text-xs">{item._count.teams} teams</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-24">
              <Ionicons name="game-controller-outline" size={48} color="#334155" />
              <Text className="text-slate-500 text-lg mt-4">No games yet</Text>
              <Text className="text-slate-600 text-sm mt-1">
                {isAdmin ? 'Tap + to create your first game' : 'Ask an admin for an invite code'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}
