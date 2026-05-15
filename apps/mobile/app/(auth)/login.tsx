import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, LoginInput } from '@zuiphok/shared'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/auth'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { useState } from 'react'

export default function LoginScreen() {
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      setLoading(true)
      await login(data.email, data.password)
      router.replace('/(app)/')
    } catch (err: any) {
      Alert.alert('Oops!', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">

          <View className="items-center mb-8">
            <View className="bg-[#1A8917] rounded-3xl p-5 mb-4">
              <Ionicons name="game-controller" size={40} color="white" />
            </View>
            <Text className="text-gray-900 text-3xl font-bold">Welcome back!</Text>
            <Text className="text-gray-500 text-base mt-1">Ready to play?</Text>
          </View>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                autoComplete="password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Button title="Let's Go!" onPress={handleSubmit(onSubmit)} loading={loading} />

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">No account yet? </Text>
            <Link href="/(auth)/register">
              <Text className="text-[#1A8917] font-bold">Sign up</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
