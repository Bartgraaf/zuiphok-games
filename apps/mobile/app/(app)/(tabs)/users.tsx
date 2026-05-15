import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../../src/services/api'
import { useAuthStore } from '../../../src/store/auth'

type Role = 'ADMIN' | 'PLAYER'

interface UserItem {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

interface UsersResponse {
  users: UserItem[]
  total: number
  page: number
  pages: number
}

async function fetchUsers(page: number): Promise<UsersResponse> {
  const res = await api.get<UsersResponse>(`/auth/users?page=${page}`)
  return res.data
}

export default function UsersScreen() {
  const [page, setPage] = useState(1)
  const { user: me } = useAuthStore()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['users', page],
    queryFn: () => fetchUsers(page),
  })

  const { mutate: changeRole } = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api.patch(`/auth/users/${id}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => Alert.alert('Error', err.response?.data?.error ?? err.message),
  })

  const { mutate: deleteUser } = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => Alert.alert('Error', err.response?.data?.error ?? err.message),
  })

  const confirmDelete = (user: UserItem) => {
    Alert.alert(
      'Delete user',
      `Remove ${user.name} (${user.email})? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteUser(user.id) },
      ]
    )
  }

  const confirmRoleChange = (user: UserItem) => {
    const newRole: Role = user.role === 'ADMIN' ? 'PLAYER' : 'ADMIN'
    Alert.alert(
      'Change role',
      `Change ${user.name} to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => changeRole({ id: user.id, role: newRole }) },
      ]
    )
  }

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 1

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#1A8917" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      {/* Total count */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-gray-500 text-sm">{total} users total</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1A8917" />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item: user }) => {
          const isMe = user.id === me?.id
          return (
            <View className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-2 mb-0.5">
                    <Text className="text-gray-900 font-semibold">{user.name}</Text>
                    {isMe && (
                      <View className="bg-green-100 rounded-full px-2 py-0.5">
                        <Text className="text-[#1A8917] text-xs">You</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-gray-500 text-sm">{user.email}</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View className="items-end gap-2">
                  {/* Role badge — tappable to toggle if not self */}
                  <TouchableOpacity
                    className={`rounded-full px-3 py-1 ${user.role === 'ADMIN' ? 'bg-green-50' : 'bg-gray-100'}`}
                    onPress={() => !isMe && confirmRoleChange(user)}
                    disabled={isMe}
                  >
                    <Text className={`text-xs font-semibold ${user.role === 'ADMIN' ? 'text-[#1A8917]' : 'text-gray-600'}`}>
                      {user.role}
                    </Text>
                  </TouchableOpacity>

                  {/* Delete button */}
                  {!isMe && (
                    <TouchableOpacity
                      className="p-1"
                      onPress={() => confirmDelete(user)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )
        }}
        ListFooterComponent={
          pages > 1 ? (
            <View className="flex-row items-center justify-between mt-4">
              <TouchableOpacity
                className={`flex-row items-center gap-1 px-4 py-2 rounded-xl ${page <= 1 ? 'opacity-30' : 'bg-gray-50'}`}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <Ionicons name="chevron-back" size={16} color="#94a3b8" />
                <Text className="text-gray-600 text-sm">Prev</Text>
              </TouchableOpacity>

              <Text className="text-gray-400 text-sm">
                Page {page} of {pages}
              </Text>

              <TouchableOpacity
                className={`flex-row items-center gap-1 px-4 py-2 rounded-xl ${page >= pages ? 'opacity-30' : 'bg-gray-50'}`}
                onPress={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
              >
                <Text className="text-gray-600 text-sm">Next</Text>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text className="text-gray-400 text-center py-8">No users found</Text>
        }
      />
    </View>
  )
}
