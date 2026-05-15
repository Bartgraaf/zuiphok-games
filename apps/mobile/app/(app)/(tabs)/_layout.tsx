import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../../src/store/auth'

export default function TabsLayout() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB' },
        tabBarActiveTintColor: '#1A8917',
        tabBarInactiveTintColor: '#9CA3AF',
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#242424',
        headerTitleStyle: { fontWeight: 'bold', color: '#242424' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Games',
          tabBarIcon: ({ color, size }) => <Ionicons name="game-controller-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
