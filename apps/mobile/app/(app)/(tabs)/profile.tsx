import { View, Text, Alert } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../../src/store/auth'
import { Button } from '../../../src/components/ui/Button'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  const isAdmin = user?.role === 'ADMIN'

  const handleLogout = () => {
    Alert.alert('Sign out', 'See you next time!', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  return (
    <View className="flex-1 bg-white px-6 pt-8">
      {/* Avatar + info card */}
      <View className="bg-gray-50 rounded-3xl p-6 mb-4 border border-gray-200 items-center">
        <View className="bg-[#1A8917] rounded-full w-20 h-20 items-center justify-center mb-4">
          <Text className="text-gray-900 text-2xl font-bold">{initials}</Text>
        </View>
        <Text className="text-gray-900 text-2xl font-bold">{user?.name}</Text>
        <Text className="text-gray-500 mt-1 text-sm">{user?.email}</Text>
        <View className={`mt-3 rounded-full px-4 py-1.5 ${isAdmin ? 'bg-green-50' : 'bg-gray-100'}`}>
          <Text className={`text-xs font-bold uppercase tracking-widest ${isAdmin ? 'text-[#1A8917]' : 'text-gray-600'}`}>
            {isAdmin ? '⚡ Admin' : '🎮 Player'}
          </Text>
        </View>
      </View>

      <Button title="Sign Out" onPress={handleLogout} variant="danger" />
    </View>
  )
}
