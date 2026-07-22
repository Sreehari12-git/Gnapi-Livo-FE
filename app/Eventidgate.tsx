import { View, Text, Pressable, TextInput } from 'react-native'
import { KeyRound, AlertTriangle, ArrowRight } from 'lucide-react-native'
import { useState } from 'react'
import { validateSession } from './services/event'
import * as SecureStore from "expo-secure-store"

type EventIdGateProps = {
  title: string
  subtitle: string
  accentIcon: React.ReactNode
  accentBg: string
  accentBorder: string
  onSubmit: (eventId: string, event?: any) => void
  initialValue?: string
}

export default function EventIdGate({
  title,
  subtitle,
  accentIcon,
  accentBg,
  accentBorder,
  onSubmit,
  initialValue = '',
}: EventIdGateProps) {
  const [eventId, setEventId] = useState(initialValue)
  const [error, setError] = useState('')

  const handleSubmit = async() => {
    const trimmed = eventId.trim();
        try {
            const adminId = await SecureStore.getItemAsync("adminId");
    
            if (!adminId) {
              setError("Admin session not found. Please login again.");
              return;
            }
    
            const result = await validateSession(Number(adminId), trimmed);
            onSubmit(trimmed, result?.event);
          } catch (error: any) {
            if (error.response?.data?.message) {
              setError(error.response.data.message);
            } else {
              setError("Invalid Event ID.");
            }
          }
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="bg-emerald-900 px-6 pt-14 pb-6">
        <View className="flex-row items-center gap-3 mb-1">
          <View className={`w-10 h-10 rounded-xl ${accentBg} border ${accentBorder} items-center justify-center`}>
            {accentIcon}
          </View>
          <Text className="text-white text-3xl font-black">{title}</Text>
        </View>
        <Text className="text-white/50 text-sm ml-1 mt-1">{subtitle}</Text>
      </View>

      <View className="bg-yellow-400 px-6 py-2 flex-row justify-between items-center">
        <View className="flex-row items-center gap-1.5">
          <KeyRound size={12} color="#022c22" strokeWidth={2.75} />
          <Text className="text-emerald-950 font-black text-xs tracking-wider">EVENT ACCESS</Text>
        </View>
        <Text className="text-emerald-950 font-black text-xs">EVENT ID REQUIRED</Text>
      </View>

      <View className="px-6 mt-8 flex-1">
        <View className="bg-slate-800/80 rounded-3xl p-6 border border-white/10">
          <Text className="text-white text-lg font-black mb-1">Enter event ID</Text>
          <Text className="text-white/40 text-xs mb-6 leading-relaxed">
            This links your session to the correct live event. Ask your director
            or organiser if you don&apos;t have it.
          </Text>

          {error !== '' && (
            <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 mb-4 flex-row items-center gap-2">
              <AlertTriangle size={14} color="#f87171" />
              <Text className="text-red-400 text-xs font-semibold flex-1">{error}</Text>
            </View>
          )}

          <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">
            Event ID
          </Text>
          <TextInput
            value={eventId}
            onChangeText={(text) => {
              setEventId(text)
              setError('')
            }}
            className="bg-slate-900 text-white rounded-xl px-4 py-3 border border-white/10 text-sm mb-6"
            placeholderTextColor="rgba(255,255,255,0.25)"
            placeholder="e.g. evt-2026-summer-open"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />

          <Pressable
            onPress={handleSubmit}
            className="bg-white active:bg-white/80 rounded-2xl py-4 items-center flex-row justify-center gap-2"
          >
            <Text className="text-slate-900 text-base font-black tracking-wide">
              Continue
            </Text>
            <ArrowRight size={16} color="#0f172a" />
          </Pressable>
        </View>
      </View>
    </View>
  )
}
