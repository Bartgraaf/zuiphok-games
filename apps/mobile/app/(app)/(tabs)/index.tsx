import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
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

const statusConfig: Record<GameStatus, { bg: string; text: string; dot: string; label: string }> = {
  DRAFT:    { bg: 'bg-gray-100',   text: 'text-gray-600',  dot: 'bg-slate-400',  label: 'Draft' },
  ACTIVE:   { bg: 'bg-green-100', text: 'text-[#1A8917]', dot: 'bg-emerald-400', label: 'Live' },
  FINISHED: { bg: 'bg-gray-50',   text: 'text-gray-400',  dot: 'bg-gray-200',  label: 'Done' },
}

const statusBorder: Record<GameStatus, string> = {
  DRAFT:    'border-gray-200',
  ACTIVE:   'border-emerald-800',
  FINISHED: 'border-gray-200',
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
            <Ionicons name="add-circle" size={28} color="#1A8917" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/(app)/games/join')} className="mr-4">
            <Ionicons name="add-circle" size={28} color="#1A8917" />
          </TouchableOpacity>
        ),
    })
  }, [isAdmin])

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={games}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 12 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#1A8917" />}
        renderItem={({ item }) => {
          const cfg = statusConfig[item.status]
          return (
            <TouchableOpacity
              className={`bg-gray-50 rounded-2xl p-4 mb-3 border ${statusBorder[item.status]}`}
              onPress={() => router.push(`/(app)/games/${item.id}`)}
              activeOpacity={0.75}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-900 text-lg font-bold flex-1 mr-3">{item.name}</Text>
                <View className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 ${cfg.bg}`}>
                  <View className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  <Text className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</Text>
                </View>
              </View>

              {item.description && (
                <Text className="text-gray-500 text-sm mb-3 leading-5" numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              <View className="flex-row gap-4 pt-2 border-t border-gray-200">
                <View className="flex-row items-center gap-1">
                  <Ionicons name="checkmark-circle-outline" size={14} color="#1A8917" />
                  <Text className="text-gray-500 text-xs">{item._count.tasks} tasks</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="people-outline" size={14} color="#1A8917" />
                  <Text className="text-gray-500 text-xs">{item._count.teams} teams</Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-24">
              <View className="bg-gray-50 rounded-3xl p-6 mb-4">
                <Ionicons name="game-controller-outline" size={48} color="#1A8917" />
              </View>
              <Text className="text-gray-900 text-xl font-bold">No games yet</Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                {isAdmin ? 'Tap + to create your first game' : 'Ask an admin for an invite code'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}
