import { View, Text, Pressable, TextInput, ScrollView } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  Mic,
  MicOff,
  Circle,
  Square,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react-native'
import { LiveKitRoom, VideoTrack, useLocalParticipant, useTrackVolume } from '@livekit/react-native'
import { Track } from 'livekit-client'
import EventIdGate from './Eventidgate'
import { fetchLiveKitToken } from './services/livekit'

export default function Capturer() {
  const router = useRouter()
  const [eventId, setEventId] = useState<string | null>(null)
  const [identity, setIdentity] = useState(() => 'cap-' + Math.random().toString(36).slice(2, 8))
  const [displayName, setDisplayName] = useState('Capturer')
  const [room, setRoom] = useState('live-switch')

  const [connection, setConnection] = useState<{ token: string; url: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  if (!eventId) {
    return (
      <EventIdGate
        title="Capturer"
        subtitle="Enter the event ID to start sending camera footage."
        accentIcon={<Circle size={20} color="#f87171" />}
        accentBg="bg-red-500/20"
        accentBorder="border-red-500/40"
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
      const result = await fetchLiveKitToken(identity, room, 'capturer')
      setConnection(result)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not start the capture session.')
    } finally {
      setConnecting(false)
    }
  }

  const stopLive = () => setConnection(null)

  return (
    <ScrollView
      className="flex-1 bg-dark-bg"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="bg-dark-surface border-b border-dark-border px-6 pt-14 pb-6 shadow-sm">
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center gap-2 mb-6"
        >
          <ChevronLeft size={18} color="rgba(255,255,255,0.6)" />
          <Text className="text-white/60 text-sm font-medium">Back to dashboard</Text>
        </Pressable>

        <View className="flex-row items-center gap-3 mb-1">
          <View className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 items-center justify-center">
            <Circle size={20} color="#f87171" />
          </View>
          <Text className="text-white text-3xl font-black">Capturer</Text>
        </View>
        <Text className="text-white/50 text-sm ml-1 leading-relaxed mt-1">
          Send your camera + mic footage into the room.{'\n'}The broadcaster picks which capturer viewers see.
        </Text>
      </View>

      <View className="mx-6 mt-6 bg-dark-surface border border-white/5 rounded-2xl px-5 py-4 flex-row justify-between items-center shadow-md">
        <View className="flex-row items-center gap-2">
          <Circle size={14} color="#FF5722" strokeWidth={2.75} />
          <Text className="text-white font-black text-xs tracking-[2px]">CAPTURE FEED</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className={`w-2.5 h-2.5 rounded-full ${connection ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-white/20'}`} />
          <Text className="text-white/60 font-bold text-xs tracking-wide">
            {connection ? 'LIVE' : 'IDLE'}
          </Text>
        </View>
      </View>

      <View className="px-6 mt-6">
        <View className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-dark-surface border border-white/10 self-start shadow-sm">
          <Text className="text-white/40 text-xs">Event</Text>
          <Text className="text-primary text-xs font-black">{eventId}</Text>
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
                className="bg-dark-surface text-white rounded-xl px-4 py-3.5 border border-white/5 focus:border-primary/50 text-sm shadow-sm"
                placeholderTextColor="rgba(255,255,255,0.3)"
                placeholder="cap-identity"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Display name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                className="bg-dark-surface text-white rounded-xl px-4 py-3.5 border border-white/5 focus:border-primary/50 text-sm shadow-sm"
                placeholderTextColor="rgba(255,255,255,0.3)"
                placeholder="Your name"
              />
            </View>
            <View className="flex-1">
              <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Room</Text>
              <TextInput
                value={room}
                onChangeText={setRoom}
                className="bg-dark-surface text-white rounded-xl px-4 py-3.5 border border-white/5 focus:border-primary/50 text-sm shadow-sm"
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
            className={`flex-row items-center justify-center gap-2 px-6 py-4 rounded-xl flex-1 ${connection ? 'bg-red-500 active:bg-red-600' : 'bg-primary active:bg-primary-dark'} ${connecting ? 'opacity-60' : 'shadow-md'} transition-transform active:scale-[0.98]`}
          >
            {connection ? (
              <Square size={14} color="#ffffff" fill="#ffffff" />
            ) : (
              <Circle size={14} color="#0F172A" fill="#0F172A" />
            )}
            <Text className={`font-black text-sm tracking-wide ${connection ? 'text-white' : 'text-[#0F172A]'}`}>
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
            video={{ facingMode: 'environment' }}
            onDisconnected={stopLive}
            onError={(err) => setError(err.message)}
            onMediaDeviceFailure={(failure) => setError(`Camera/mic failed to start${failure ? `: ${failure}` : ''}. Check camera/microphone permissions.`)}
          >
            <CapturerLiveView room={room} displayName={displayName} />
          </LiveKitRoom>
        )}
      </View>
    </ScrollView>
  )
}

function CapturerLiveView({
  room,
  displayName,
}: {
  room: string
  displayName: string
}) {
  const { localParticipant, isMicrophoneEnabled, cameraTrack, microphoneTrack, lastCameraError, lastMicrophoneError } = useLocalParticipant()
  const micLevel = useTrackVolume(microphoneTrack?.track as any)
  const [isMuted, setIsMuted] = useState(false)
  const [facingMode, setFacingMode] = useState<'front' | 'back'>('back')
  const [switchingCamera, setSwitchingCamera] = useState(false)

  const toggleMute = async () => {
    await localParticipant.setMicrophoneEnabled(isMuted)
    setIsMuted(!isMuted)
  }

  // NOTE: @livekit/react-native-webrtc's native CameraCaptureController.applyConstraints
  // (used by mediaStreamTrack._switchCamera()/applyConstraints()) ignores any new
  // facingMode/deviceId and always re-resolves the camera it was originally created
  // with, so it can never actually switch cameras in-place. The only way to change
  // the physical camera is to unpublish the existing camera track and publish a new
  // one with the new facingMode, forcing a fresh native capturer.
  const switchCamera = async () => {
    if (switchingCamera) return
    setSwitchingCamera(true)
    try {
      const nextFacingMode = facingMode === 'back' ? 'front' : 'back'
      if (cameraTrack?.track) {
        await localParticipant.unpublishTrack(cameraTrack.track as any, true)
      }
      await localParticipant.setCameraEnabled(true, {
        facingMode: nextFacingMode === 'front' ? 'user' : 'environment',
      })
      setFacingMode(nextFacingMode)
    } finally {
      setSwitchingCamera(false)
    }
  }

  const levelPercent = Math.round(micLevel * 100)

  return (
    <View className="gap-4">
      {(lastCameraError || lastMicrophoneError) && (
        <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 gap-1">
          {lastCameraError && <Text className="text-red-400 text-xs font-semibold">Camera: {lastCameraError.message}</Text>}
          {lastMicrophoneError && <Text className="text-red-400 text-xs font-semibold">Mic: {lastMicrophoneError.message}</Text>}
        </View>
      )}

      <View className="rounded-2xl overflow-hidden border border-white/10 bg-black" style={{ aspectRatio: 16 / 9 }}>
        {cameraTrack ? (
          <VideoTrack trackRef={{ participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera }} style={{ flex: 1 }} mirror={facingMode === 'front'} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/40 text-xs">Starting camera…</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={toggleMute}
          className={`flex-row items-center gap-2 px-5 py-3 rounded-xl border ${
            isMuted
              ? 'bg-orange-500/20 border-orange-500/50 active:bg-orange-500/30'
              : 'bg-dark-surface border-white/10 active:bg-white/5'
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

        <Pressable
          disabled={switchingCamera}
          onPress={switchCamera}
          className={`flex-row items-center gap-2 px-5 py-3 rounded-xl border bg-dark-surface border-white/10 active:bg-white/5 ${switchingCamera ? 'opacity-60' : ''}`}
        >
          <RotateCcw size={15} color="rgba(255,255,255,0.7)" />
          <Text className="font-bold text-sm text-white/70">
            {switchingCamera ? 'Switching…' : facingMode === 'back' ? 'Back cam' : 'Front cam'}
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-2 px-4 py-2.5 rounded-full bg-dark-surface border border-white/5">
          <View className={`w-2 h-2 rounded-full ${isMicrophoneEnabled && !isMuted ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-white/20'}`} />
          <Text className="text-white/40 text-xs">{isMuted ? 'muted' : 'on air'}</Text>
        </View>
      </View>

      <View className="bg-dark-surface rounded-2xl p-5 border border-white/5 shadow-sm">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white/60 text-sm font-semibold">Mic level</Text>
          <Text className="text-white/40 text-sm">{levelPercent}%</Text>
        </View>
        <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <View
            className={`h-2 rounded-full ${
              levelPercent > 80 ? 'bg-red-500' : levelPercent > 40 ? 'bg-yellow-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${levelPercent}%` }}
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 bg-dark-surface rounded-2xl p-5 border border-white/5 shadow-sm">
          <Text className="text-white/40 text-xs uppercase tracking-wider mb-1">Room</Text>
          <Text className="text-white font-bold text-sm">{room || '—'}</Text>
        </View>
        <View className="flex-1 bg-dark-surface rounded-2xl p-5 border border-white/5 shadow-sm">
          <Text className="text-white/40 text-xs uppercase tracking-wider mb-1">Name</Text>
          <Text className="text-white font-bold text-sm">{displayName || '—'}</Text>
        </View>
      </View>
    </View>
  )
}
