import { View, Text, Pressable, TextInput, ScrollView } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { createEvent } from './services/event'
import * as SecureStore from 'expo-secure-store'
import { CalendarPlus, ChevronLeft, Shield } from 'lucide-react-native'

const CATEGORIES = [
  { value: 'sports', label: 'Sports' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' },
]

const SPORTS = [
  { value: 'pickleball', label: 'Pickleball' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'football', label: 'Football' },
]

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

function ChipSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map(opt => {
        const active = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`rounded-2xl px-4 py-2.5 border ${
              active
                ? 'bg-orange-500 border-orange-500'
                : 'bg-[#111623] border-white/10'
            }`}
          >
            <Text className={`text-sm font-semibold ${active ? 'text-[#0A0E16]' : 'text-white/60'}`}>
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export default function CreateEventPanel() {
  const router = useRouter()
  const [eventName, setEventName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('sports')
  const [selectedSport, setSelectedSport] = useState('pickleball')
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

      const sport = selectedCategory === 'sports' ? selectedSport : undefined
      const data = await createEvent(eventName.trim(), Number(adminId), selectedCategory, sport)

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
          Set up a new live event. The broadcaster will use this event&apos;s ID to join.
        </Text>

        <View className="h-px bg-white/5 mb-8" />

        <Banner type="error" message={error} />

        <View className="mb-6">
          <FieldLabel>Event name</FieldLabel>
          <DarkInput
            value={eventName}
            onChangeText={(t) => {
              setEventName(t)
              setError('')
            }}
            placeholder="e.g. Company Pickleball Tournament"
            editable={!loading}
          />
        </View>

        <View className="mb-6">
          <FieldLabel>Category</FieldLabel>
          <ChipSelector
            options={CATEGORIES}
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
          <Text className="text-white/25 text-xs mt-2">
            Determines what tools are shown to the broadcaster.
          </Text>
        </View>

        {selectedCategory === 'sports' && (
          <View className="mb-6">
            <FieldLabel>Sport</FieldLabel>
            <ChipSelector
              options={SPORTS}
              value={selectedSport}
              onChange={setSelectedSport}
            />
            <Text className="text-white/25 text-xs mt-2">
              The broadcaster won&apos;t need to choose a sport — this is locked to the event.
            </Text>
          </View>
        )}

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
