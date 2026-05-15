import { Stack } from 'expo-router'
import { useAuthStore } from '../../src/store/auth'
import { router } from 'expo-router'
import { useEffect } from 'react'

export default function AppLayout() {
  const { token } = useAuthStore()

  useEffect(() => {
    if (!token) router.replace('/(auth)/login')
  }, [token])

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#242424',
        headerTitleStyle: { fontWeight: 'bold', color: '#242424' },
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="games/create" options={{ title: 'New Game', presentation: 'modal' }} />
      <Stack.Screen name="games/join" options={{ title: 'Join Game', presentation: 'modal' }} />
      <Stack.Screen name="games/[id]" options={{ title: 'Game' }} />
      <Stack.Screen name="games/[id]/tasks/[taskId]" options={{ title: 'Task' }} />
      <Stack.Screen name="games/[id]/tasks/create" options={{ title: 'New Task', presentation: 'modal' }} />
      <Stack.Screen name="games/[id]/teams/index" options={{ title: 'Teams', presentation: 'modal' }} />
      <Stack.Screen name="games/[id]/teams/[teamId]/review" options={{ title: 'Team Review' }} />
    </Stack>
  )
}
