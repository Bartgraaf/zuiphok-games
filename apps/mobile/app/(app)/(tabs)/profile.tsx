import { View, Text, Alert } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../../src/store/auth'
import { Button } from '../../../src/components/ui/Button'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
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
    <View className="flex-1 bg-slate-900 px-6 pt-8">
      <View className="bg-slate-800 rounded-2xl p-6 mb-6">
        <Text className="text-white text-xl font-bold">{user?.name}</Text>
        <Text className="text-slate-400 mt-1">{user?.email}</Text>
        <View className="mt-3 self-start bg-blue-900 rounded-full px-3 py-1">
          <Text className="text-blue-300 text-xs font-medium uppercase tracking-wide">
            {user?.role}
          </Text>
        </View>
      </View>
      <Button title="Sign Out" onPress={handleLogout} variant="danger" />
    </View>
  )
}
