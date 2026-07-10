import { View, Text, Pressable, TextInput, ScrollView } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  Mic,
  MicOff,
  Circle,
  Square,
  AlertTriangle,
} from 'lucide-react-native'
import { LiveKitRoom, useLocalParticipant, useTrackVolume } from '@livekit/react-native'
import EventIdGate from './Eventidgate'
import { fetchLiveKitToken } from './services/livekit'

export default function Commentator() {
  const router = useRouter()
  const [eventId, setEventId] = useState<string | null>(null)
  const [identity, setIdentity] = useState(() => 'comm-' + Math.random().toString(36).slice(2, 8))
  const [displayName, setDisplayName] = useState('Commentator')
  const [room, setRoom] = useState('live-switch')

  const [connection, setConnection] = useState<{ token: string; url: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  if (!eventId) {
    return (
      <EventIdGate
        title="Commentator"
        subtitle="Enter the event ID to join the commentary booth."
        accentIcon={<Mic size={20} color="#c084fc" />}
        accentBg="bg-purple-500/20"
        accentBorder="border-purple-500/40"
        onSubmit={(id) => {
          setEventId(id)
          setRoom(id)
        }}
      />
    )
  }

  const goLive = async () => {
    setError('')
    setConnecting(true)
    try {
      const result = await fetchLiveKitToken(identity, room, 'commentator')
      setConnection(result)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not start the commentary session.')
    } finally {
      setConnecting(false)
    }
  }

  const stopLive = () => setConnection(null)

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >

      <View className="bg-emerald-900 px-6 pt-14 pb-6">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-2 mb-6"
        >
          <ChevronLeft size={18} color="rgba(255,255,255,0.6)" />
          <Text className="text-white/60 text-sm font-medium">Back to dashboard</Text>
        </Pressable>

        <View className="flex-row items-center gap-3 mb-1">
          <View className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 items-center justify-center">
            <Mic size={20} color="#c084fc" />
          </View>
          <Text className="text-white text-3xl font-black">Commentator</Text>
        </View>
        <Text className="text-white/50 text-sm ml-1 leading-relaxed mt-1">
          Send your live commentary audio into the room.{'\n'}The broadcaster picks which commentator viewers hear.
        </Text>
      </View>

      <View className="bg-yellow-400 px-6 py-2 flex-row justify-between items-center">
        <View className="flex-row items-center gap-1.5">
          <Mic size={12} color="#022c22" strokeWidth={2.75} />
          <Text className="text-emerald-950 font-black text-xs tracking-wider">COMMENTARY BOOTH</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className={`w-2 h-2 rounded-full ${connection ? 'bg-red-600' : 'bg-slate-600'}`} />
          <Text className="text-emerald-950 font-black text-xs">
            {connection ? 'ON AIR' : 'IDLE'}
          </Text>
        </View>
      </View>

      <View className="px-6 mt-4">
        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-white/10 self-start">
          <Text className="text-white/40 text-xs">Event</Text>
          <Text className="text-white/70 text-xs font-bold">{eventId}</Text>
        </View>
      </View>

      {error !== '' && (
        <View className="mx-6 mt-4 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 flex-row items-center gap-2">
          <AlertTriangle size={14} color="#f87171" />
          <Text className="text-red-400 text-xs font-semibold flex-1">{error}</Text>
        </View>
      )}

      <View className="px-6 mt-4 gap-4">

        {!connection && (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Identity</Text>
              <TextInput
                value={identity}
                onChangeText={setIdentity}
                className="bg-slate-800 text-white rounded-xl px-4 py-3 border border-white/10 text-sm"
                placeholderTextColor="rgba(255,255,255,0.3)"
                placeholder="comm-identity"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Display name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                className="bg-slate-800 text-white rounded-xl px-4 py-3 border border-white/10 text-sm"
                placeholderTextColor="rgba(255,255,255,0.3)"
                placeholder="Your name"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Room</Text>
              <TextInput
                value={room}
                onChangeText={setRoom}
                className="bg-slate-800 text-white rounded-xl px-4 py-3 border border-white/10 text-sm"
                placeholderTextColor="rgba(255,255,255,0.3)"
                placeholder="room-name"
              />
            </View>
          </View>
        )}

        <View className="flex-row items-center gap-3">
          <Pressable
            disabled={connecting}
            onPress={connection ? stopLive : goLive}
            className={`flex-row items-center gap-2 px-6 py-3 rounded-xl ${connection ? 'bg-red-500 active:bg-red-600' : 'bg-white active:bg-white/80'} ${connecting ? 'opacity-60' : ''}`}
          >
            {connection ? (
              <Square size={14} color="#ffffff" fill="#ffffff" />
            ) : (
              <Circle size={14} color="#dc2626" fill="#dc2626" />
            )}
            <Text className={`font-black text-sm ${connection ? 'text-white' : 'text-slate-900'}`}>
              {connecting ? 'Connecting…' : connection ? 'Stop' : 'Go Live'}
            </Text>
          </Pressable>
        </View>

        {connection && (
          <LiveKitRoom
            serverUrl={connection.url}
            token={connection.token}
            connect
            audio
            onDisconnected={stopLive}
            onError={(err) => setError(err.message)}
            onMediaDeviceFailure={(failure) => setError(`Mic failed to start${failure ? `: ${failure}` : ''}. Check microphone permissions.`)}
          >
            <CommentatorLiveView room={room} displayName={displayName} />
          </LiveKitRoom>
        )}
      </View>
    </ScrollView>
  )
}

function CommentatorLiveView({ room, displayName }: { room: string; displayName: string }) {
  const { localParticipant, microphoneTrack, lastMicrophoneError } = useLocalParticipant()
  const micLevel = useTrackVolume(microphoneTrack?.track as any)
  const [isMuted, setIsMuted] = useState(false)

  const toggleMute = async () => {
    await localParticipant.setMicrophoneEnabled(isMuted)
    setIsMuted(!isMuted)
  }

  const levelPercent = Math.round(micLevel * 100)

  return (
    <View className="gap-4">
      {lastMicrophoneError && (
        <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3">
          <Text className="text-red-400 text-xs font-semibold">Mic: {lastMicrophoneError.message}</Text>
        </View>
      )}

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={toggleMute}
          className={`flex-row items-center gap-2 px-5 py-3 rounded-xl border ${
            isMuted
              ? 'bg-orange-500/20 border-orange-500/50 active:bg-orange-500/30'
              : 'bg-slate-800 border-white/15 active:bg-slate-700'
          }`}
        >
          {isMuted ? (
            <MicOff size={15} color="#fb923c" />
          ) : (
            <Mic size={15} color="rgba(255,255,255,0.7)" />
          )}
          <Text className={`font-bold text-sm ${isMuted ? 'text-orange-400' : 'text-white/70'}`}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-2 px-3 py-2 rounded-full bg-slate-800 border border-white/10">
          <View className={`w-2 h-2 rounded-full ${isMuted ? 'bg-orange-400' : 'bg-red-500'}`} />
          <Text className="text-white/40 text-xs">{isMuted ? 'muted' : 'on air'}</Text>
        </View>
      </View>

      <View className="bg-slate-800/80 rounded-2xl p-5 border border-white/10">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white/60 text-sm font-semibold">Mic level</Text>
          {isMuted ? (
            <View className="flex-row items-center gap-1.5">
              <MicOff size={13} color="rgba(255,255,255,0.4)" />
              <Text className="text-white/40 text-sm">Muted</Text>
            </View>
          ) : (
            <Text className="text-white/40 text-sm">{levelPercent}%</Text>
          )}
        </View>
        <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <View
            className={`h-2 rounded-full ${
              isMuted ? 'bg-orange-400' : levelPercent > 80 ? 'bg-red-500' : levelPercent > 40 ? 'bg-yellow-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${isMuted ? 0 : levelPercent}%` }}
          />
        </View>
        <View className="flex-row justify-between mt-2">
          <Text className="text-white/20 text-xs">0%</Text>
          <Text className="text-white/20 text-xs">50%</Text>
          <Text className="text-white/20 text-xs">100%</Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 bg-slate-800/80 rounded-2xl p-4 border border-white/10">
          <Text className="text-white/40 text-xs uppercase tracking-wider mb-1">Room</Text>
          <Text className="text-white font-bold text-sm">{room || '—'}</Text>
        </View>
        <View className="flex-1 bg-slate-800/80 rounded-2xl p-4 border border-white/10">
          <Text className="text-white/40 text-xs uppercase tracking-wider mb-1">Name</Text>
          <Text className="text-white font-bold text-sm">{displayName || '—'}</Text>
        </View>
      </View>
    </View>
  )
}
