import { View, Text, TextInput, TextInputProps } from 'react-native'

interface InputProps extends TextInputProps {
  label: string
  error?: string
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="text-slate-300 text-sm font-medium mb-1">{label}</Text>
      <TextInput
        className={`bg-slate-800 text-white rounded-xl px-4 py-3.5 text-base border ${
          error ? 'border-red-500' : 'border-slate-700'
        }`}
        placeholderTextColor="#64748b"
        {...props}
      />
      {error && <Text className="text-red-400 text-xs mt-1">{error}</Text>}
    </View>
  )
}
