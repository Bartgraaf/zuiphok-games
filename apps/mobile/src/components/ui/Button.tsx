import { TouchableOpacity, Text, ActivityIndicator } from 'react-native'

interface ButtonProps {
  title: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}

const variantStyles = {
  primary: 'bg-[#1A8917] active:bg-[#166d12]',
  secondary: 'bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-600 active:bg-red-700',
}

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`rounded-2xl py-4 px-6 items-center justify-center ${variantStyles[variant]} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className={`font-bold text-base tracking-wide ${variant === 'secondary' ? 'text-gray-700' : 'text-white'}`}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}
