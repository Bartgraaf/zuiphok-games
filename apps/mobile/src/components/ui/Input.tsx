import { View, Text, TextInput, TextInputProps } from 'react-native'

interface InputProps extends TextInputProps {
  label: string
  error?: string
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="text-gray-600 text-sm font-semibold mb-1.5">{label}</Text>
      <TextInput
        className={`bg-gray-50 text-gray-900 rounded-2xl px-4 py-3.5 text-base border ${
          error ? 'border-red-500' : 'border-gray-200'
        }`}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && <Text className="text-red-400 text-xs mt-1.5 ml-1">{error}</Text>}
    </View>
  )
}
