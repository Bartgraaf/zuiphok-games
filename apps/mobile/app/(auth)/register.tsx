import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { Link, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterSchema, RegisterInput } from '@zuiphok/shared'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/auth'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { useState } from 'react'

export default function RegisterScreen() {
  const { register } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    try {
      setLoading(true)
      await register(data.name, data.email, data.password)
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
              <Ionicons name="rocket" size={40} color="white" />
            </View>
            <Text className="text-gray-900 text-3xl font-bold">Join the fun!</Text>
            <Text className="text-gray-500 text-base mt-1">Create your account</Text>
          </View>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Your name"
                placeholder="What should we call you?"
                autoCapitalize="words"
                autoComplete="name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.name?.message}
              />
            )}
          />

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
                autoComplete="new-password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Button title="Create Account" onPress={handleSubmit(onSubmit)} loading={loading} />

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">Already playing? </Text>
            <Link href="/(auth)/login">
              <Text className="text-[#1A8917] font-bold">Sign in</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
