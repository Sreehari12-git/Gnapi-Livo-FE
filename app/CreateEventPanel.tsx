import { View, Text, Pressable, TextInput, ScrollView } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { createEvent } from './services/event'
import * as SecureStore from 'expo-secure-store'
import { CalendarPlus, ChevronLeft, Shield } from 'lucide-react-native'

function Eyebrow({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-3">
      <View className="w-1.5 h-1.5 rounded-full bg-orange-500" />
      <Text className="text-orange-500 text-xs font-black tracking-[3px] uppercase">
        {label}
      </Text>
    </View>
  )
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-white/35 text-xs font-bold uppercase tracking-widest mb-2">
      {children}
    </Text>
  )
}

function Banner({ type, message }: { type: 'error' | 'success'; message: string }) {
  if (!message) return null
  const isError = type === 'error'
  return (
    <View
      className={`rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2 border ${
        isError ? 'bg-red-500/10 border-red-500/25' : 'bg-orange-500/10 border-orange-500/25'
      }`}
    >
      <Text className={`text-xs font-semibold flex-1 ${isError ? 'text-red-400' : 'text-orange-400'}`}>
        {message}
      </Text>
    </View>
  )
}

function DarkInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="rgba(255,255,255,0.25)"
      className="bg-[#111623] text-white rounded-2xl px-5 py-4 border border-white/5 text-base"
      {...props}
    />
  )
}

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string
  icon: React.ReactNode
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`bg-orange-500 active:bg-orange-600 rounded-2xl py-4 items-center flex-row justify-center gap-2 ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      <Text className="text-[#0A0E16] text-base font-black tracking-wide">{label}</Text>
      {icon}
    </Pressable>
  )
}

export default function CreateEventPanel() {
  const router = useRouter()
  const [eventName, setEventName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!eventName.trim()) {
      setError('Please enter an event name.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const adminId = await SecureStore.getItemAsync('adminId')

      if (!adminId) {
        setError('Admin not found. Please login again.')
        setLoading(false)
        return
      }

      const data = await createEvent(eventName.trim(), Number(adminId))

      await SecureStore.setItemAsync('eventId', data.event.id)

      router.back()
    } catch (error: any) {
      if (error.response?.data?.message) {
        setError(error.response.data.message)
      } else {
        setError('Something went wrong.')
      }
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-[#0A0E16]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-1 mb-6 active:opacity-60 self-start"
        >
          <ChevronLeft size={16} color="rgba(255,255,255,0.4)" />
          <Text className="text-white/40 text-sm font-semibold">Back</Text>
        </Pressable>

        <View className="flex-row items-center gap-2 mb-1">
          <Shield size={18} color="#fb923c" />
          <Text className="text-orange-500 text-xs font-black tracking-[3px] uppercase">
            Admin Session
          </Text>
        </View>

        <Eyebrow label="Event Setup" />
        <Text className="text-white text-5xl font-black mb-2">Create Event</Text>
        <Text className="text-white/40 text-base mb-6">
          Set up a new live event and assign it a room.
        </Text>

        <View className="h-px bg-white/5 mb-8" />

        <Banner type="error" message={error} />

        <View className="mb-4">
          <FieldLabel>Event name</FieldLabel>
          <DarkInput
            value={eventName}
            onChangeText={(t) => {
              setEventName(t)
              setError('')
            }}
            placeholder="e.g. Spring Finals Night"
            editable={!loading}
          />
        </View>

        <PrimaryButton
          label={loading ? 'Creating...' : 'Create Event'}
          icon={<CalendarPlus size={16} color="#0A0E16" />}
          onPress={handleCreate}
          disabled={loading}
        />
      </ScrollView>
    </View>
  )
}

