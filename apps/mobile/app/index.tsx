import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '../src/store/auth'

export default function Index() {
  const { isLoaded, token } = useAuthStore()

  if (!isLoaded) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return <Redirect href={token ? '/(app)/(tabs)/' : '/(auth)/login'} />
}
