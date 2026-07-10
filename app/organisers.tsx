import React from 'react'
import { View, Text, Pressable, TextInput, ScrollView, Linking } from 'react-native'
import { useEffect, useRef, useState } from 'react'
import * as WebBrowser from 'expo-web-browser'
import { useRouter } from 'expo-router'
import * as SecureStore from "expo-secure-store"
import {
  ChevronLeft,
  Video,
  Mic,
  MicOff,
  Radio,
  RefreshCw,
  Camera,
  Circle,
  Square,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  Users,
  Plus,
  Volume2,
  VolumeX,
  Trash2,
  Minus,
  Repeat,
  RotateCcw,
  Trophy,
  Play,
  Pause,
  ChevronDown,
  Cpu,
  X,
} from 'lucide-react-native'
import { captureRef } from 'react-native-view-shot'
import { AI_DIRECTOR_URL } from '../envdata'
import { LiveKitRoom, VideoTrack, useLocalParticipant, useTrackVolume, useRemoteParticipants, useTracks, useDataChannel } from '@livekit/react-native'
import { Track } from 'livekit-client'
import { adminLogin } from './services/auth'
import { fetchLiveKitToken, parseParticipantRole } from './services/livekit'
import {
  createMatch,
  listMatches,
  getMatch,
  updateMatch as updateMatchApi,
  deleteMatch as deleteMatchApi,
  setMatchLiveSelection,
  getYoutubeAuthUrl,
  stopYoutubeStream,
} from './services/match'
import EventIdGate from './Eventidgate'

type TabKey = 'capturer' | 'commentator' | 'broadcaster' | 'admin'

type Tab = {
  key: TabKey
  label: string
  Icon: typeof Video
}

const TABS: Tab[] = [
  { key: 'capturer', label: 'Capturer', Icon: Video },
  { key: 'commentator', label: 'Commentator', Icon: Mic },
  { key: 'broadcaster', label: 'Broadcaster', Icon: Radio },
  { key: 'admin', label: 'Admin', Icon: ShieldCheck },
]

function CapturerPanel({ onLiveChange }: { onLiveChange?: (isLive: boolean) => void }) {
  const [eventId, setEventId] = useState<string | null>(null)
  const [identity, setIdentity] = useState(() => 'cap-' + Math.random().toString(36).slice(2, 8))
  const [room, setRoom] = useState('live-switch')
  const [camera, setCamera] = useState<'front' | 'back'>('front')
  const [connection, setConnection] = useState<{ token: string; url: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const isLive = connection !== null
  const switchCameraRef = useRef<(() => Promise<boolean>) | null>(null)
  const [switchingCamera, setSwitchingCamera] = useState(false)

  if (!eventId) {
    return (
      <EventIdGate
        title="Capturer"
        subtitle="Enter the event ID to connect your camera."
        accentIcon={<Video size={20} color="#60a5fa" />}
        accentBg="bg-blue-500/20"
        accentBorder="border-blue-500/40"
        onSubmit={(id) => {
          setEventId(id)
          setRoom(id)
        }}
      />
    )
  }

  return (
    <View>
      <View className="bg-emerald-900 px-6 pt-6 pb-6">
        <Pressable
          onPress={() => setEventId(null)}
          className="flex-row items-center gap-1.5 mb-4 self-start active:opacity-60"
        >
          <ChevronLeft size={16} color="rgba(255,255,255,0.6)" />
          <Text className="text-white/60 text-xs font-semibold">Back to event ID</Text>
        </Pressable>

        <View className="flex-row items-center gap-3 mb-1">
          <View className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 items-center justify-center">
            <Video size={20} color="#60a5fa" />
          </View>
          <Text className="text-white text-3xl font-black">Capturer</Text>
        </View>
        <Text className="text-white/50 text-sm ml-1">
          Publish your camera and microphone to the room.
        </Text>
      </View>

      <View className="bg-yellow-400 px-6 py-2 flex-row justify-between items-center">
        <View className="flex-row items-center gap-1.5">
          <Radio size={12} color="#022c22" strokeWidth={2.75} />
          <Text className="text-emerald-950 font-black text-xs tracking-wider">CAPTURE STATION</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-600' : 'bg-slate-600'}`} />
          <Text className="text-emerald-950 font-black text-xs">
            {isLive ? 'STREAMING' : 'IDLE'} · {camera.toUpperCase()}
          </Text>
        </View>
      </View>

      <View className="px-6 mt-4">
        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-white/10 self-start">
          <Text className="text-white/40 text-xs">Event</Text>
          <Text className="text-white/70 text-xs font-bold">{eventId}</Text>
        </View>
      </View>

      <View className="px-6 mt-4 gap-4">
        {!isLive && (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">
                Identity
              </Text>
              <TextInput
                value={identity}
                onChangeText={setIdentity}
                className="bg-slate-800 text-white rounded-xl px-4 py-3 border border-white/10 text-sm"
                placeholderTextColor="rgba(255,255,255,0.3)"
                placeholder="cam-identity"
              />
            </View>

            <View className="flex-1">
              <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">
                Room
              </Text>
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

        {error !== '' && (
          <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 flex-row items-center gap-2">
            <AlertTriangle size={14} color="#f87171" />
            <Text className="text-red-400 text-xs font-semibold flex-1">{error}</Text>
          </View>
        )}

        <View className="flex-row items-center gap-3 flex-wrap">
          <Pressable
            disabled={connecting}
            onPress={async () => {
              if (isLive) {
                setConnection(null)
                onLiveChange?.(false)
                return
              }
              setError('')
              setConnecting(true)
              try {
                const result = await fetchLiveKitToken(identity, room, 'capturer')
                setConnection(result)
                onLiveChange?.(true)
              } catch (err: any) {
                if (err?.code === 'USAGE_LIMIT_EXCEEDED') {
                  setError('Your streaming usage limit has been reached. Please upgrade your plan from the Admin tab.')
                } else {
                  setError(err.response?.data?.message ?? 'Could not start the capture session.')
                }
              } finally {
                setConnecting(false)
              }
            }}
            className={`flex-row items-center gap-2 px-6 py-3 rounded-xl ${isLive ? 'bg-red-500 active:bg-red-600' : 'bg-white active:bg-white/80'} ${connecting ? 'opacity-60' : ''}`}
          >
            {isLive ? (
              <Square size={14} color="#ffffff" fill="#ffffff" />
            ) : (
              <Circle size={14} color="#dc2626" fill="#dc2626" />
            )}
            <Text className={`font-black text-sm ${isLive ? 'text-white' : 'text-slate-900'}`}>
              {connecting ? 'Connecting…' : isLive ? 'Stop' : 'Go Live'}
            </Text>
          </Pressable>

          <Pressable
            disabled={switchingCamera}
            onPress={async () => {
              if (isLive && switchCameraRef.current) {
                setSwitchingCamera(true)
                try {
                  if (await switchCameraRef.current()) {
                    setCamera(c => c === 'front' ? 'back' : 'front')
                  }
                } finally {
                  setSwitchingCamera(false)
                }
              } else {
                setCamera(c => c === 'front' ? 'back' : 'front')
              }
            }}
            className={`flex-row items-center gap-2 px-4 py-3 rounded-xl border border-white/15 bg-slate-800 active:bg-slate-700 ${switchingCamera ? 'opacity-60' : ''}`}
          >
            <RefreshCw size={15} color="rgba(255,255,255,0.8)" />
            <Text className="text-white/80 font-semibold text-sm">
              {switchingCamera ? 'Switching…' : `Switch to ${camera === 'front' ? 'back' : 'front'} camera`}
            </Text>
          </Pressable>

          <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-slate-800 border border-white/10">
            <View className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500' : 'bg-slate-500'}`} />
            <Text className="text-white/40 text-xs">
              {isLive ? 'live' : 'idle'} · {camera}
            </Text>
          </View>
        </View>

        <View className="bg-black rounded-3xl overflow-hidden border border-white/10"
          style={{ height: 280 }}
        >
          {!isLive || !connection ? (
            <View className="flex-1 items-center justify-center gap-3">
              <Camera size={44} color="rgba(255,255,255,0.25)" />
              <Text className="text-white/30 text-sm">Camera preview will appear here</Text>
              <Text className="text-white/20 text-xs">Tap Go Live to start streaming</Text>
            </View>
          ) : (
            <LiveKitRoom
              serverUrl={connection.url}
              token={connection.token}
              connect
              audio
              video={{ facingMode: camera === 'front' ? 'user' : 'environment' }}
              onDisconnected={() => {
                setConnection(null)
                onLiveChange?.(false)
              }}
              onError={(err) => setError(err.message)}
              onMediaDeviceFailure={(failure) => setError(`Camera/mic failed to start${failure ? `: ${failure}` : ''}. Check camera/microphone permissions.`)}
            >
              <CapturerPreview
                room={room}
                camera={camera}
                onSwitchCameraReady={(fn) => {
                  switchCameraRef.current = fn
                }}
                onUsageExceeded={() => {
                  setConnection(null)
                  onLiveChange?.(false)
                  setError('Streaming usage limit reached. Please upgrade your plan.')
                }}
              />
            </LiveKitRoom>
          )}
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 bg-slate-800/80 rounded-2xl p-4 border border-white/10">
            <Text className="text-white/40 text-xs uppercase tracking-wider mb-1">Room</Text>
            <Text className="text-white font-bold text-sm">{room || '—'}</Text>
          </View>
          <View className="flex-1 bg-slate-800/80 rounded-2xl p-4 border border-white/10">
            <Text className="text-white/40 text-xs uppercase tracking-wider mb-1">Identity</Text>
            <Text className="text-white font-bold text-sm">{identity || '—'}</Text>
          </View>
          <View className="flex-1 bg-slate-800/80 rounded-2xl p-4 border border-white/10">
            <Text className="text-white/40 text-xs uppercase tracking-wider mb-1">Status</Text>
            <View className="flex-row items-center gap-1.5">
              <Circle
                size={9}
                color={isLive ? '#f87171' : 'rgba(255,255,255,0.4)'}
                fill={isLive ? '#f87171' : 'rgba(255,255,255,0.4)'}
              />
              <Text className={`font-bold text-sm ${isLive ? 'text-red-400' : 'text-white/40'}`}>
                {isLive ? 'Live' : 'Idle'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

function CapturerPreview({
  room,
  camera,
  onSwitchCameraReady,
  onUsageExceeded,
}: {
  room: string
  camera: 'front' | 'back'
  onSwitchCameraReady: (fn: () => Promise<boolean>) => void
  onUsageExceeded: () => void
}) {
  const { localParticipant, cameraTrack, lastCameraError, lastMicrophoneError } = useLocalParticipant()

  useDataChannel((msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload))
      if (payload?.type === 'USAGE_EXCEEDED') onUsageExceeded()
    } catch {}
  })

  // NOTE: @livekit/react-native-webrtc's native CameraCaptureController.applyConstraints
  // (used by mediaStreamTrack._switchCamera()/applyConstraints()) ignores any new
  // facingMode/deviceId and always re-resolves the camera it was originally created
  // with, so it can never actually switch cameras in-place. The only way to change
  // the physical camera is to unpublish the existing camera track and publish a new
  // one with the new facingMode, forcing a fresh native capturer.
  useEffect(() => {
    onSwitchCameraReady(async () => {
      const nextFacingMode = camera === 'front' ? 'environment' : 'user'
      if (cameraTrack?.track) {
        await localParticipant.unpublishTrack(cameraTrack.track as any, true)
      }
      await localParticipant.setCameraEnabled(true, { facingMode: nextFacingMode })
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraTrack, camera])

  return (
    <View className="flex-1">
      {cameraTrack ? (
        <VideoTrack
          trackRef={{ participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera }}
          style={{ flex: 1 }}
          mirror={camera === 'front'}
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-white/30 text-sm">Starting camera…</Text>
        </View>
      )}

      <View className="absolute top-3 left-3 flex-row items-center gap-2 bg-red-500/20 border border-red-500/40 px-4 py-2 rounded-full">
        <View className="w-2 h-2 rounded-full bg-red-500" />
        <Text className="text-red-400 font-bold text-sm">LIVE · {camera} camera</Text>
      </View>
      {(lastCameraError || lastMicrophoneError) && (
        <View className="absolute bottom-3 left-3 right-3 bg-red-500/20 border border-red-500/40 rounded-xl px-3 py-2">
          {lastCameraError && <Text className="text-red-300 text-xs">Camera: {lastCameraError.message}</Text>}
          {lastMicrophoneError && <Text className="text-red-300 text-xs">Mic: {lastMicrophoneError.message}</Text>}
        </View>
      )}
    </View>
  )
}

function CommentatorPanel({ onLiveChange }: { onLiveChange?: (isLive: boolean) => void }) {
  const [eventId, setEventId] = useState<string | null>(null)
  const [identity, setIdentity] = useState(() => 'comm-' + Math.random().toString(36).slice(2, 8))
  const [displayName, setDisplayName] = useState('Commentator')
  const [room, setRoom] = useState('live-switch')
  const [connection, setConnection] = useState<{ token: string; url: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const isLive = connection !== null

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

  return (
    <View>
      <View className="bg-emerald-900 px-6 pt-6 pb-6">
        <Pressable
          onPress={() => setEventId(null)}
          className="flex-row items-center gap-1.5 mb-4 self-start active:opacity-60"
        >
          <ChevronLeft size={16} color="rgba(255,255,255,0.6)" />
          <Text className="text-white/60 text-xs font-semibold">Back to event ID</Text>
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
          <View className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-600' : 'bg-slate-600'}`} />
          <Text className="text-emerald-950 font-black text-xs">
            {isLive ? 'ON AIR' : 'IDLE'}
          </Text>
        </View>
      </View>

      <View className="px-6 mt-4">
        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-white/10 self-start">
          <Text className="text-white/40 text-xs">Event</Text>
          <Text className="text-white/70 text-xs font-bold">{eventId}</Text>
        </View>
      </View>

      <View className="px-6 mt-4 gap-4">
        {!isLive && (
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

        {error !== '' && (
          <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 flex-row items-center gap-2">
            <AlertTriangle size={14} color="#f87171" />
            <Text className="text-red-400 text-xs font-semibold flex-1">{error}</Text>
          </View>
        )}

        <View className="flex-row items-center gap-3">
          <Pressable
            disabled={connecting}
            onPress={async () => {
              if (isLive) {
                setConnection(null)
                onLiveChange?.(false)
                return
              }
              setError('')
              setConnecting(true)
              try {
                const result = await fetchLiveKitToken(identity, room, 'commentator')
                setConnection(result)
                onLiveChange?.(true)
              } catch (err: any) {
                if (err?.code === 'USAGE_LIMIT_EXCEEDED') {
                  setError('Your streaming usage limit has been reached. Please upgrade your plan from the Admin tab.')
                } else {
                  setError(err.response?.data?.message ?? 'Could not start the commentary session.')
                }
              } finally {
                setConnecting(false)
              }
            }}
            className={`flex-row items-center gap-2 px-6 py-3 rounded-xl ${isLive ? 'bg-red-500 active:bg-red-600' : 'bg-white active:bg-white/80'} ${connecting ? 'opacity-60' : ''}`}
          >
            {isLive ? (
              <Square size={14} color="#ffffff" fill="#ffffff" />
            ) : (
              <Circle size={14} color="#dc2626" fill="#dc2626" />
            )}
            <Text className={`font-black text-sm ${isLive ? 'text-white' : 'text-slate-900'}`}>
              {connecting ? 'Connecting…' : isLive ? 'Stop' : 'Go Live'}
            </Text>
          </Pressable>
        </View>

        {isLive && connection && (
          <LiveKitRoom
            serverUrl={connection.url}
            token={connection.token}
            connect
            audio
            onDisconnected={() => {
              setConnection(null)
              onLiveChange?.(false)
            }}
            onError={(err) => setError(err.message)}
            onMediaDeviceFailure={(failure) => setError(`Mic failed to start${failure ? `: ${failure}` : ''}. Check microphone permissions.`)}
          >
            <CommentatorControls
              room={room}
              displayName={displayName}
              onUsageExceeded={() => {
                setConnection(null)
                onLiveChange?.(false)
                setError('Streaming usage limit reached. Please upgrade your plan.')
              }}
            />
          </LiveKitRoom>
        )}
      </View>
    </View>
  )
}

function CommentatorControls({ room, displayName, onUsageExceeded }: { room: string; displayName: string; onUsageExceeded: () => void }) {
  const { localParticipant, microphoneTrack, lastMicrophoneError } = useLocalParticipant()

  useDataChannel((msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload))
      if (payload?.type === 'USAGE_EXCEEDED') onUsageExceeded()
    } catch {}
  })
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
              isMuted ? 'bg-orange-400' :
              levelPercent > 80 ? 'bg-red-500' :
              levelPercent > 40 ? 'bg-yellow-400' :
              'bg-emerald-500'
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
        <View className="flex-1 bg-slate-800/80 rounded-2xl p-4 border border-white/10">
          <Text className="text-white/40 text-xs uppercase tracking-wider mb-1">Status</Text>
          <View className="flex-row items-center gap-1.5">
            {isMuted ? (
              <MicOff size={13} color="#fb923c" />
            ) : (
              <Circle size={9} color="#f87171" fill="#f87171" />
            )}
            <Text className={`font-bold text-sm ${isMuted ? 'text-orange-400' : 'text-red-400'}`}>
              {isMuted ? 'Muted' : 'On Air'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}


type Sport = 'pickleball' | 'badminton' | 'football'
type Side = 'A' | 'B'
type MatchLiveStatus = 'not_started' | 'live' | 'ended'
type RosterParticipant = { identity: string; name?: string }

const SPORT_LABELS: Record<Sport, string> = {
  pickleball: 'Pickleball',
  badminton: 'Badminton',
  football: 'Football',
}

interface RacketScoreState {
  nameA: string
  nameB: string
  pointsA: number
  pointsB: number
  gamesA: number
  gamesB: number
  server: Side
  gameNumber: number
  visible: boolean
}

const createRacketScore = (sport: 'badminton' | 'pickleball'): RacketScoreState => ({
  nameA: sport === 'badminton' ? 'Player A' : 'Team A',
  nameB: sport === 'badminton' ? 'Player B' : 'Team B',
  pointsA: 0,
  pointsB: 0,
  gamesA: 0,
  gamesB: 0,
  server: 'A',
  gameNumber: 1,
  visible: true,
})

type FootballClockStatus = 'not_started' | 'live' | 'half_time' | 'ended'

interface FootballScoreState {
  nameA: string
  nameB: string
  goalsA: number
  goalsB: number
  status: FootballClockStatus
  minute: number
  visible: boolean
}

const createFootballScore = (): FootballScoreState => ({
  nameA: 'Team A',
  nameB: 'Team B',
  goalsA: 0,
  goalsB: 0,
  status: 'not_started',
  minute: 0,
  visible: true,
})

interface MatchState {
  id: string
  sport: Sport
  name: string
  liveStatus: MatchLiveStatus
  liveCapturerIdentities: string[]
  liveCommentatorIdentities: string[]
  ytWhipUrl: string | null
  ytLiveUrl: string | null
  audioOn: boolean
  commentaryMuted: boolean
  winner: Side | null
  racketScore?: RacketScoreState
  footballScore?: FootballScoreState
}


function BroadcasterPanel({ onJoinChange }: { onJoinChange?: (isJoined: boolean) => void }) {
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventInfo, setEventInfo] = useState<{ name?: string; category: string; sport?: string | null } | null>(null)

  const [identity, setIdentity] = useState('bcast-8x585u')
  const [connection, setConnection] = useState<{ token: string; url: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [joinError, setJoinError] = useState('')
  const isJoined = connection !== null
  // Sport is derived from the event — no manual selection needed
  const eventSport: Sport = (eventInfo?.sport as Sport) ?? 'badminton'
  const isSportsEvent = (eventInfo?.category ?? 'sports') === 'sports'
  const [matches, setMatches] = useState<MatchState[]>([])
  const [assigningMatchId, setAssigningMatchId] = useState<string | null>(null)
  const [roster, setRoster] = useState<{ capturers: RosterParticipant[]; commentators: RosterParticipant[]; viewerCount: number }>({
    capturers: [],
    commentators: [],
    viewerCount: 0,
  })
  const [cameraTrackRefs, setCameraTrackRefs] = useState<any[]>([])

  const [sportCounters, setSportCounters] = useState<Record<Sport, number>>({
    pickleball: 0,
    badminton: 0,
    football: 0,
  })
  const [ytPollingMatchId, setYtPollingMatchId] = useState<string | null>(null)
  const ytPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [aiEnabledMap, setAiEnabledMap] = useState<Record<string, boolean>>({})
  const [aiStatusMap, setAiStatusMap] = useState<Record<string, string>>({})

  const refreshMatches = async () => {
    if (!eventId) return
    const serverMatches = await listMatches(eventId, false)
    setMatches(prev =>
      serverMatches.map(sm => {
        const existing = prev.find(m => m.id === sm.id)
        const sport = sm.sport as Sport
        return {
          id: sm.id,
          sport,
          name: sm.name,
          liveStatus: sm.liveStatus as MatchLiveStatus,
          liveCapturerIdentities: sm.liveCapturerIdentities ?? [],
          liveCommentatorIdentities: sm.liveCommentatorIdentities ?? [],
          ytWhipUrl: sm.ytWhipUrl,
          ytLiveUrl: sm.ytLiveUrl,
          audioOn: existing?.audioOn ?? true,
          commentaryMuted: existing?.commentaryMuted ?? false,
          winner: existing?.winner ?? null,
          racketScore: existing?.racketScore ?? (sport === 'football' ? undefined : createRacketScore(sport as 'badminton' | 'pickleball')),
          footballScore: existing?.footballScore ?? (sport === 'football' ? createFootballScore() : undefined),
        }
      }),
    )
  }

  useEffect(() => {
    if (isJoined) {
      refreshMatches().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJoined])

  if (!eventId) {
    return (
      <EventIdGate
        title="Broadcaster"
        subtitle="Enter the event ID to open director controls."
        accentIcon={<Radio size={20} color="#facc15" />}
        accentBg="bg-yellow-400/20"
        accentBorder="border-yellow-400/40"
        onSubmit={(id, event) => {
          setEventId(id)
          setEventInfo(event ? { name: event.name, category: event.category ?? 'sports', sport: event.sport } : null)
        }}
      />
    )
  }

  const handleAddMatch = async () => {
    const nextSportNumber = sportCounters[eventSport] + 1
    const name = `${SPORT_LABELS[eventSport]} Match ${nextSportNumber}`
    try {
      const created = await createMatch({ eventId, sport: eventSport, name })
      setSportCounters(prev => ({ ...prev, [eventSport]: nextSportNumber }))
      setMatches(prev => [
        ...prev,
        {
          id: created.id,
          sport: eventSport,
          name: created.name,
          liveStatus: created.liveStatus as MatchLiveStatus,
          liveCapturerIdentities: created.liveCapturerIdentities ?? [],
          liveCommentatorIdentities: created.liveCommentatorIdentities ?? [],
          ytWhipUrl: created.ytWhipUrl,
          ytLiveUrl: created.ytLiveUrl,
          audioOn: true,
          commentaryMuted: false,
          winner: null,
          racketScore: eventSport === 'football' ? undefined : createRacketScore(eventSport),
          footballScore: eventSport === 'football' ? createFootballScore() : undefined,
        },
      ])
    } catch (err: any) {
      setJoinError(err.response?.data?.message ?? 'Could not create match.')
    }
  }

  const removeMatch = async (id: string) => {
    try {
      await deleteMatchApi(id)
      setMatches(prev => prev.filter(m => m.id !== id))
    } catch (err: any) {
      setJoinError(err.response?.data?.message ?? 'Could not remove match.')
    }
  }

  const updateMatch = (id: string, updater: (m: MatchState) => MatchState) => {
    setMatches(prev => prev.map(m => (m.id === id ? updater(m) : m)))
  }

  const updateRacketScore = (id: string, updater: (s: RacketScoreState) => RacketScoreState) => {
    updateMatch(id, m => (m.racketScore ? { ...m, racketScore: updater(m.racketScore) } : m))
  }

  const updateFootballScore = (id: string, updater: (s: FootballScoreState) => FootballScoreState) => {
    updateMatch(id, m => (m.footballScore ? { ...m, footballScore: updater(m.footballScore) } : m))
  }

  const addPoint = (id: string, side: Side) => {
    updateRacketScore(id, s => ({
      ...s,
      pointsA: side === 'A' ? s.pointsA + 1 : s.pointsA,
      pointsB: side === 'B' ? s.pointsB + 1 : s.pointsB,
    }))
  }

  const subtractPoint = (id: string, side: Side) => {
    updateRacketScore(id, s => ({
      ...s,
      pointsA: side === 'A' ? Math.max(0, s.pointsA - 1) : s.pointsA,
      pointsB: side === 'B' ? Math.max(0, s.pointsB - 1) : s.pointsB,
    }))
  }

  const winGame = (id: string, side: Side) => {
    updateRacketScore(id, s => ({
      ...s,
      gamesA: side === 'A' ? s.gamesA + 1 : s.gamesA,
      gamesB: side === 'B' ? s.gamesB + 1 : s.gamesB,
      pointsA: 0,
      pointsB: 0,
      gameNumber: s.gameNumber + 1,
      server: s.server === 'A' ? 'B' : 'A',
    }))
  }

  const swapServer = (id: string) => {
    updateRacketScore(id, s => ({ ...s, server: s.server === 'A' ? 'B' : 'A' }))
  }

  const toggleRacketVisible = (id: string) => {
    updateRacketScore(id, s => ({ ...s, visible: !s.visible }))
  }

  const resetRacketScore = (id: string, sport: 'badminton' | 'pickleball') => {
    updateRacketScore(id, () => createRacketScore(sport))
  }

  const renameRacketPlayer = (id: string, side: Side, name: string) => {
    updateRacketScore(id, s => ({
      ...s,
      nameA: side === 'A' ? name : s.nameA,
      nameB: side === 'B' ? name : s.nameB,
    }))
  }

  const addGoal = (id: string, side: Side) => {
    updateFootballScore(id, s => ({
      ...s,
      goalsA: side === 'A' ? s.goalsA + 1 : s.goalsA,
      goalsB: side === 'B' ? s.goalsB + 1 : s.goalsB,
    }))
  }

  const subtractGoal = (id: string, side: Side) => {
    updateFootballScore(id, s => ({
      ...s,
      goalsA: side === 'A' ? Math.max(0, s.goalsA - 1) : s.goalsA,
      goalsB: side === 'B' ? Math.max(0, s.goalsB - 1) : s.goalsB,
    }))
  }

  const setMatchClockStatus = (id: string, status: FootballClockStatus) => {
    updateFootballScore(id, s => ({ ...s, status }))
  }

  const incrementMinute = (id: string) => {
    updateFootballScore(id, s => ({ ...s, minute: s.minute + 1 }))
  }

  const toggleFootballVisible = (id: string) => {
    updateFootballScore(id, s => ({ ...s, visible: !s.visible }))
  }

  const resetFootballScore = (id: string) => {
    updateFootballScore(id, () => createFootballScore())
  }

  const renameFootballTeam = (id: string, side: Side, name: string) => {
    updateFootballScore(id, s => ({
      ...s,
      nameA: side === 'A' ? name : s.nameA,
      nameB: side === 'B' ? name : s.nameB,
    }))
  }

  const applyLiveSelection = async (
    id: string,
    payload: { liveCapturerIdentities?: string[]; liveCommentatorIdentities?: string[] },
  ) => {
    setAssigningMatchId(id)
    try {
      await setMatchLiveSelection(id, payload)
      await refreshMatches()
    } catch (err: any) {
      setJoinError(err.response?.data?.message ?? 'Could not update live assignment.')
    } finally {
      setAssigningMatchId(null)
    }
  }

  const assignCapturerToMatch = (capturerIdentity: string, matchId: string | null) => {
    if (matchId) {
      const match = matches.find(m => m.id === matchId)
      if (!match) return
      if (match.liveCapturerIdentities.includes(capturerIdentity)) return
      applyLiveSelection(matchId, { liveCapturerIdentities: [...match.liveCapturerIdentities, capturerIdentity] })
      return
    }
    // Unassign from all matches that contain this identity
    for (const m of matches) {
      if (m.liveCapturerIdentities.includes(capturerIdentity)) {
        applyLiveSelection(m.id, { liveCapturerIdentities: m.liveCapturerIdentities.filter(id => id !== capturerIdentity) })
      }
    }
  }

  const assignCommentatorToMatch = (commentatorIdentity: string, matchId: string | null) => {
    if (matchId) {
      const match = matches.find(m => m.id === matchId)
      if (!match) return
      if (match.liveCommentatorIdentities.includes(commentatorIdentity)) return
      applyLiveSelection(matchId, { liveCommentatorIdentities: [...match.liveCommentatorIdentities, commentatorIdentity] })
      return
    }
    // Unassign from all matches that contain this identity
    for (const m of matches) {
      if (m.liveCommentatorIdentities.includes(commentatorIdentity)) {
        applyLiveSelection(m.id, { liveCommentatorIdentities: m.liveCommentatorIdentities.filter(id => id !== commentatorIdentity) })
      }
    }
  }

  const unassignCapturerFromMatch = (identity: string, matchId: string) => {
    const match = matches.find(m => m.id === matchId)
    if (!match) return
    applyLiveSelection(matchId, { liveCapturerIdentities: match.liveCapturerIdentities.filter(id => id !== identity) })
  }

  const unassignCommentatorFromMatch = (identity: string, matchId: string) => {
    const match = matches.find(m => m.id === matchId)
    if (!match) return
    applyLiveSelection(matchId, { liveCommentatorIdentities: match.liveCommentatorIdentities.filter(id => id !== identity) })
  }

  const switchLiveCapturer = (identity: string, matchId: string) => {
    const match = matches.find(m => m.id === matchId)
    if (!match) return
    const rest = match.liveCapturerIdentities.filter(id => id !== identity)
    applyLiveSelection(matchId, { liveCapturerIdentities: [identity, ...rest] })
  }

  const switchLiveCommentator = (identity: string, matchId: string) => {
    const match = matches.find(m => m.id === matchId)
    if (!match) return
    const rest = match.liveCommentatorIdentities.filter(id => id !== identity)
    applyLiveSelection(matchId, { liveCommentatorIdentities: [identity, ...rest] })
  }

  const toggleAiDirection = (matchId: string) => {
    setAiEnabledMap(prev => {
      const next = { ...prev, [matchId]: !prev[matchId] }
      if (!next[matchId]) {
        setAiStatusMap(p => { const n = { ...p }; delete n[matchId]; return n })
      }
      return next
    })
  }

  const handleAiSwitch = (matchId: string, identity: string) => {
    applyLiveSelection(matchId, { liveCapturerIdentities: [identity] })
  }

  const clearLive = async (id: string) => {
    updateMatch(id, m => {
      if (m.sport === 'football') {
        return { ...m, winner: null, footballScore: createFootballScore() }
      }
      return { ...m, winner: null, racketScore: createRacketScore(m.sport as 'badminton' | 'pickleball') }
    })
    await applyLiveSelection(id, { liveCapturerIdentities: [], liveCommentatorIdentities: [] })
  }

  const declareWinner = async (id: string, side: Side) => {
    const match = matches.find(m => m.id === id)
    if (!match) return
    const { nameA, nameB } = getNames(match)
    const teamAScore = match.sport === 'football' ? match.footballScore?.goalsA ?? 0 : match.racketScore?.gamesA ?? 0
    const teamBScore = match.sport === 'football' ? match.footballScore?.goalsB ?? 0 : match.racketScore?.gamesB ?? 0

    updateMatch(id, m => ({ ...m, winner: side }))

    try {
      const updated = await updateMatchApi(id, {
        liveStatus: 'ended',
        finalScore: { teamAName: nameA, teamBName: nameB, teamAScore, teamBScore },
      })
      updateMatch(id, m => ({
        ...m,
        liveStatus: updated.liveStatus as MatchLiveStatus,
        liveCapturerIdentities: updated.liveCapturerIdentities ?? [],
        liveCommentatorIdentities: updated.liveCommentatorIdentities ?? [],
        ytWhipUrl: updated.ytWhipUrl,
        ytLiveUrl: updated.ytLiveUrl,
      }))
    } catch (err: any) {
      setJoinError(err.response?.data?.message ?? 'Could not end match.')
    }
  }

  const handleYoutubeStart = async (matchId: string) => {
    try {
      setYtPollingMatchId(matchId)
      const authUrl = await getYoutubeAuthUrl(matchId)
      await WebBrowser.openBrowserAsync(authUrl)
      let attempts = 0
      ytPollRef.current = setInterval(async () => {
        attempts++
        try {
          const updated = await getMatch(matchId)
          if (updated.ytLiveUrl) {
            updateMatch(matchId, m => ({ ...m, ytWhipUrl: updated.ytWhipUrl ?? null, ytLiveUrl: updated.ytLiveUrl ?? null }))
            clearInterval(ytPollRef.current!)
            ytPollRef.current = null
            setYtPollingMatchId(null)
          }
        } catch (pollErr: any) {
          // Stop immediately if the match no longer exists
          if (pollErr?.response?.status === 404) {
            clearInterval(ytPollRef.current!)
            ytPollRef.current = null
            setYtPollingMatchId(null)
            return
          }
        }
        if (attempts >= 15) {
          clearInterval(ytPollRef.current!)
          ytPollRef.current = null
          setYtPollingMatchId(null)
        }
      }, 2000)
    } catch (err: any) {
      setYtPollingMatchId(null)
      setJoinError(err.response?.data?.message ?? 'Could not start YouTube stream.')
    }
  }

  const handleYoutubeStop = async (matchId: string) => {
    try {
      const updated = await stopYoutubeStream(matchId)
      updateMatch(matchId, m => ({ ...m, ytWhipUrl: updated.ytWhipUrl ?? null, ytLiveUrl: updated.ytLiveUrl ?? null }))
    } catch (err: any) {
      setJoinError(err.response?.data?.message ?? 'Could not stop YouTube stream.')
    }
  }

  const toggleAudio = (id: string) => {
    updateMatch(id, m => ({ ...m, audioOn: !m.audioOn }))
  }

  const toggleCommentaryMute = (id: string) => {
    updateMatch(id, m => ({ ...m, commentaryMuted: !m.commentaryMuted }))
  }

  const renameMatch = (id: string, name: string) => {
    updateMatch(id, m => ({ ...m, name }))
  }

  const getNames = (match: MatchState): { nameA: string; nameB: string } => {
    if (match.sport === 'football' && match.footballScore) {
      return { nameA: match.footballScore.nameA, nameB: match.footballScore.nameB }
    }
    if (match.racketScore) {
      return { nameA: match.racketScore.nameA, nameB: match.racketScore.nameB }
    }
    return { nameA: 'Team A', nameB: 'Team B' }
  }

  return (
    <View>
      <View className="bg-emerald-900 px-6 pt-6 pb-6">
        <Pressable
          onPress={() => { setEventId(null); setEventInfo(null) }}
          className="flex-row items-center gap-1.5 mb-4 self-start active:opacity-60"
        >
          <ChevronLeft size={16} color="rgba(255,255,255,0.6)" />
          <Text className="text-white/60 text-xs font-semibold">Back to event ID</Text>
        </Pressable>

        <View className="flex-row items-center gap-3 mb-1">
          <View className="w-10 h-10 rounded-xl bg-yellow-400/20 border border-yellow-400/40 items-center justify-center">
            <Radio size={20} color="#facc15" />
          </View>
          <Text className="text-white text-3xl font-black">Broadcaster</Text>
        </View>
        <Text className="text-white/50 text-sm ml-1 mt-1">
          {isSportsEvent
            ? 'Group capturers into matches, pick which feed goes live per match, and control each match\'s scoreboard.'
            : 'Manage camera and audio feeds for your live event.'}
        </Text>
      </View>

      <View className="bg-yellow-400 px-6 py-2 flex-row justify-between items-center">
        <View className="flex-row items-center gap-1.5">
          <Radio size={12} color="#022c22" strokeWidth={2.75} />
          <Text className="text-emerald-950 font-black text-xs tracking-wider">DIRECTOR CONSOLE</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className={`w-2 h-2 rounded-full ${isJoined ? 'bg-red-600' : 'bg-slate-600'}`} />
          <Text className="text-emerald-950 font-black text-xs">
            {isJoined ? 'CONNECTED' : 'IDLE'}
          </Text>
        </View>
      </View>

      <View className="px-6 mt-4">
        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-white/10 self-start">
          <Text className="text-white/40 text-xs">Event</Text>
          <Text className="text-white/70 text-xs font-bold">{eventId}</Text>
        </View>
      </View>

      <View className="bg-white mt-4 rounded-t-3xl overflow-hidden">
        <View className="px-6 pt-6 flex-row gap-3">
          <View className="flex-1">
            <Text className="text-gray-500 text-xs mb-1">Identity</Text>
            <TextInput
              value={identity}
              onChangeText={setIdentity}
              editable={!isJoined}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
            />
          </View>
        </View>

        <View className="px-6 mt-4">
          <View className="flex-row flex-wrap gap-2">
            {eventInfo?.name && (
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                <Text className="text-slate-500 text-xs">Event</Text>
                <Text className="text-slate-800 text-xs font-bold">{eventInfo.name}</Text>
              </View>
            )}
            <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
              <Text className="text-slate-500 text-xs">Category</Text>
              <Text className="text-slate-800 text-xs font-bold capitalize">{eventInfo?.category ?? 'sports'}</Text>
            </View>
            {isSportsEvent && (
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                <Text className="text-emerald-600 text-xs">Sport</Text>
                <Text className="text-emerald-800 text-xs font-bold">{SPORT_LABELS[eventSport] ?? eventSport}</Text>
              </View>
            )}
          </View>
        </View>

        {joinError !== '' && (
          <View className="mx-6 mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex-row items-center gap-2">
            <AlertTriangle size={14} color="#dc2626" />
            <Text className="text-red-600 text-xs font-semibold flex-1">{joinError}</Text>
          </View>
        )}

        <View className="px-6 mt-4 flex-row items-center gap-3">
          {isJoined ? (
            <>
              <Pressable
                onPress={() => {
                  setConnection(null)
                  onJoinChange?.(false)
                  setMatches([])
                  setSportCounters({ pickleball: 0, badminton: 0, football: 0 })
                }}
                className="bg-red-600 rounded-xl px-5 py-2.5"
              >
                <Text className="text-white font-semibold text-sm">Disconnect</Text>
              </Pressable>

              {isSportsEvent && (
                <>
                  <Pressable
                    onPress={handleAddMatch}
                    className="border border-gray-300 rounded-xl px-4 py-2.5 flex-row items-center gap-1.5"
                  >
                    <Plus size={14} color="#111" />
                    <Text className="text-black font-semibold text-sm">Add match</Text>
                  </Pressable>

                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full bg-yellow-400" />
                    <Text className="text-gray-400 text-xs">
                      {matches.length} match(es)
                    </Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <Pressable
              disabled={connecting}
              onPress={async () => {
                setJoinError('')
                setConnecting(true)
                try {
                  const result = await fetchLiveKitToken(identity, eventId, 'broadcaster')
                  setConnection(result)
                  onJoinChange?.(true)
                } catch (err: any) {
                  if (err?.code === 'USAGE_LIMIT_EXCEEDED') {
                    setJoinError('Streaming is unavailable. The organiser has reached their usage limit.')
                  } else {
                    setJoinError(err.response?.data?.message ?? 'Could not join as broadcaster.')
                  }
                } finally {
                  setConnecting(false)
                }
              }}
              className={`bg-gray-900 rounded-xl px-5 py-2.5 ${connecting ? 'opacity-60' : ''}`}
            >
              <Text className="text-white font-semibold text-sm">
                {connecting ? 'Connecting…' : 'Join as Broadcaster'}
              </Text>
            </Pressable>
          )}
        </View>

        {isJoined && connection && (
          <LiveKitRoom
            serverUrl={connection.url}
            token={connection.token}
            connect
            onDisconnected={() => {
              setConnection(null)
              onJoinChange?.(false)
            }}
            onError={(err) => setJoinError(err.message)}
          >
            <BroadcasterLobbies
              matches={matches}
              busy={assigningMatchId !== null}
              onAssignCapturer={assignCapturerToMatch}
              onAssignCommentator={assignCommentatorToMatch}
              onUnassignCapturer={unassignCapturerFromMatch}
              onUnassignCommentator={unassignCommentatorFromMatch}
              onSwitchLiveCapturer={switchLiveCapturer}
              onSwitchLiveCommentator={switchLiveCommentator}
              onRosterChange={(capturers, commentators, viewerCount) => setRoster({ capturers, commentators, viewerCount })}
              onCameraTracksChange={setCameraTrackRefs}
              aiEnabledMap={aiEnabledMap}
              onAiSwitch={handleAiSwitch}
              onAiStatusUpdate={(matchId, status) => setAiStatusMap(prev => ({ ...prev, [matchId]: status }))}
            />
            <BroadcasterWhipManager matches={matches} />
          </LiveKitRoom>
        )}

        {isJoined && isSportsEvent && (
          <View className="px-6 mt-6 pb-6 gap-4">

            {matches.length === 0 ? (
              <Text className="text-center text-gray-400 text-sm mt-2">
                No matches yet. Click <Text className="font-bold text-gray-600">Add match</Text> to create one.
              </Text>
            ) : (
              matches.map(match => {
                const { nameA, nameB } = getNames(match)
                const feedCount = match.liveCapturerIdentities.length + match.liveCommentatorIdentities.length
                const isEnded = match.liveStatus === 'ended'
                return (
                  <View key={match.id} className="border border-gray-200 rounded-xl p-4 gap-4">
                    <View className="flex-row flex-wrap items-center gap-3">
                      <TextInput
                        value={match.name}
                        onChangeText={t => renameMatch(match.id, t)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-base font-semibold text-black"
                        style={{ minWidth: 140, flexGrow: 1, flexBasis: 140 }}
                      />
                      <View className="bg-gray-100 rounded-full px-2.5 py-1">
                        <Text className="text-gray-600 text-xs font-semibold">{SPORT_LABELS[match.sport]}</Text>
                      </View>
                      <Text className="text-gray-400 text-sm">
                        {feedCount} feed(s) ·{' '}
                        {isEnded
                          ? match.winner
                            ? `${match.winner === 'A' ? nameA : nameB} won`
                            : 'ended'
                          : match.liveCapturerIdentities.length > 0
                          ? 'live'
                          : 'no live feed'}
                      </Text>
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Pressable
                          onPress={() => toggleAudio(match.id)}
                          className="border border-gray-200 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
                        >
                          {match.audioOn ? (
                            <Volume2 size={14} color="#111" />
                          ) : (
                            <VolumeX size={14} color="#9ca3af" />
                          )}
                          <Text className="text-black text-xs font-medium">
                            Court audio {match.audioOn ? 'on' : 'off'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => clearLive(match.id)}
                          className="border border-gray-200 rounded-lg px-3 py-2"
                        >
                          <Text className="text-gray-500 text-xs font-medium">Clear live</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => removeMatch(match.id)}
                          className="border border-gray-200 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
                        >
                          <Trash2 size={14} color="#111" />
                          <Text className="text-black text-xs font-medium">Remove</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Per-match participant counts */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Video size={12} color="#2563eb" />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>Capturer</Text>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#2563eb' }}>{match.liveCapturerIdentities.length}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d5ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Mic size={12} color="#7c3aed" />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>Commentators</Text>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#7c3aed' }}>{match.liveCommentatorIdentities.length}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Eye size={12} color="#059669" />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>Viewers</Text>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#059669' }}>{roster.viewerCount}</Text>
                      </View>
                    </View>

                    {/* YouTube Live button — full-width row */}
                    {!isEnded && (
                      <Pressable
                        onPress={() =>
                          match.ytLiveUrl
                            ? handleYoutubeStop(match.id)
                            : handleYoutubeStart(match.id)
                        }
                        disabled={ytPollingMatchId === match.id}
                        className={`rounded-xl px-4 py-3 flex-row items-center justify-center gap-2 ${
                          match.ytLiveUrl ? 'bg-red-600' : 'bg-gray-900'
                        } ${ytPollingMatchId === match.id ? 'opacity-50' : ''}`}
                      >
                        <Text className="text-white text-xs font-black tracking-widest">YT</Text>
                        <Text className="text-white text-sm font-semibold">
                          {ytPollingMatchId === match.id
                            ? 'Authenticating with YouTube…'
                            : match.ytLiveUrl
                            ? 'Stop YouTube Live'
                            : 'Go Live on YouTube'}
                        </Text>
                      </Pressable>
                    )}

                    {match.ytLiveUrl && (
                      <Pressable
                        onPress={() => Linking.openURL(match.ytLiveUrl!)}
                        className="flex-row items-center gap-2 border border-red-200 bg-red-50 rounded-xl px-4 py-2.5"
                      >
                        <View className="w-2 h-2 rounded-full bg-red-500" />
                        <Text className="text-red-600 text-xs font-semibold flex-1">
                          Live on YouTube — tap to open
                        </Text>
                      </Pressable>
                    )}

                    {!isEnded && match.liveCapturerIdentities.length > 0 && (
                      <View>
                        <Pressable
                          onPress={() => toggleAiDirection(match.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            backgroundColor: aiEnabledMap[match.id] ? '#7c3aed' : '#f3f4f6',
                          }}
                        >
                          <Cpu size={14} color={aiEnabledMap[match.id] ? '#fff' : '#6b7280'} />
                          <Text style={{ color: aiEnabledMap[match.id] ? '#fff' : '#6b7280', fontSize: 13, fontWeight: '700' }}>
                            {aiEnabledMap[match.id] ? '● AI Direction: ON' : 'AI Direction: OFF'}
                          </Text>
                        </Pressable>
                        {aiEnabledMap[match.id] && aiStatusMap[match.id] ? (
                          <Text style={{ color: '#7c3aed', fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                            {aiStatusMap[match.id]}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    {!isEnded && (
                      <View className="border border-blue-100 bg-blue-50/40 rounded-lg px-4 py-3 flex-row flex-wrap items-center gap-3">
                        <Text className="text-gray-600 text-xs" style={{ minWidth: 160, flexGrow: 1, flexBasis: 160 }}>
                          When the match is over, declare the winner — the live feed will stop and viewers will see the result.
                        </Text>
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Pressable
                            onPress={() => declareWinner(match.id, 'A')}
                            className={`rounded-lg px-3 py-2 flex-row items-center gap-1.5 ${match.winner === 'A' ? 'bg-amber-100' : 'bg-gray-100'}`}
                          >
                            <Trophy size={14} color="#b45309" />
                            <Text className="text-black text-xs font-semibold">{nameA} wins</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => declareWinner(match.id, 'B')}
                            className={`rounded-lg px-3 py-2 flex-row items-center gap-1.5 ${match.winner === 'B' ? 'bg-amber-100' : 'bg-gray-100'}`}
                          >
                            <Trophy size={14} color="#b45309" />
                            <Text className="text-black text-xs font-semibold">{nameB} wins</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {isEnded ? (
                      <View className="border border-gray-100 rounded-lg py-6 items-center">
                        <Text className="text-black font-semibold text-base">
                          {match.winner ? `${match.winner === 'A' ? nameA : nameB} won the match` : 'Match ended'}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-1">
                          Live feed stopped. Viewers are seeing the final result.
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View className="border border-gray-200 rounded-xl p-4 gap-3">
                          <View className="gap-2">
                            {match.liveCapturerIdentities.length === 0 ? (
                              <View className="flex-row items-center gap-2">
                                <Video size={14} color="#9ca3af" />
                                <Text className="text-gray-400 text-sm">No capturer assigned</Text>
                              </View>
                            ) : (
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="flex-row gap-2">
                                  {match.liveCapturerIdentities.map((id, index) => {
                                    const isLive = index === 0
                                    const trackRef = cameraTrackRefs.find((t: any) => t.participant.identity === id)
                                    const name = roster.capturers.find(p => p.identity === id)?.name || id
                                    return (
                                      <View key={id} style={{ width: 120 }}>
                                        <Pressable
                                          onPress={() => !isLive && switchLiveCapturer(id, match.id)}
                                          style={{
                                            width: 120,
                                            height: 80,
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            backgroundColor: '#000',
                                            borderWidth: isLive ? 2 : 1,
                                            borderColor: isLive ? '#ef4444' : '#e5e7eb',
                                          }}
                                        >
                                          {trackRef ? (
                                            <VideoTrack trackRef={trackRef} style={{ width: 120, height: 80 }} />
                                          ) : (
                                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>no video</Text>
                                            </View>
                                          )}
                                          {isLive && (
                                            <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: '#ef4444', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
                                              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>LIVE</Text>
                                            </View>
                                          )}
                                        </Pressable>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                                          <Text style={{ color: '#6b7280', fontSize: 11, flex: 1 }} numberOfLines={1}>{name}</Text>
                                          <Pressable onPress={() => unassignCapturerFromMatch(id, match.id)} hitSlop={6}>
                                            <X size={12} color="#9ca3af" />
                                          </Pressable>
                                        </View>
                                      </View>
                                    )
                                  })}
                                </View>
                              </ScrollView>
                            )}
                            {match.liveCapturerIdentities.length > 1 && (
                              <Text className="text-gray-400 text-[10px]">Tap a feed to make it live</Text>
                            )}
                          </View>
                          <View className="gap-2">
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center gap-2">
                                <Mic size={14} color="#111" />
                                <Text className="text-black text-sm font-semibold">
                                  {match.liveCommentatorIdentities.length > 0
                                    ? `${match.liveCommentatorIdentities.length} commentator(s) assigned`
                                    : 'No commentator assigned'}
                                </Text>
                              </View>
                              {match.liveCommentatorIdentities.length > 0 && (
                                <Pressable
                                  onPress={() => toggleCommentaryMute(match.id)}
                                  className="border border-gray-200 rounded-lg px-3 py-1.5 flex-row items-center gap-1.5"
                                >
                                  {match.commentaryMuted ? (
                                    <VolumeX size={14} color="#9ca3af" />
                                  ) : (
                                    <Mic size={14} color="#9ca3af" />
                                  )}
                                  <Text className="text-gray-400 text-xs font-medium">
                                    {match.commentaryMuted ? 'Unmute all' : 'Mute all'}
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                            {match.liveCommentatorIdentities.length > 0 && (
                              <View className="flex-row flex-wrap gap-2">
                                {match.liveCommentatorIdentities.map((id, index) => {
                                  const isOnAir = index === 0
                                  const name = roster.commentators.find(p => p.identity === id)?.name || id
                                  return (
                                    <Pressable
                                      key={id}
                                      onPress={() => !isOnAir && switchLiveCommentator(id, match.id)}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 5,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: isOnAir ? '#7c3aed' : '#e5e7eb',
                                        backgroundColor: isOnAir ? '#faf5ff' : '#f9fafb',
                                        paddingHorizontal: 10,
                                        paddingVertical: 5,
                                      }}
                                    >
                                      <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: isOnAir ? '#7c3aed' : '#d1d5db' }} />
                                      <Mic size={11} color={isOnAir ? '#7c3aed' : '#9ca3af'} />
                                      <Text style={{ fontSize: 12, fontWeight: isOnAir ? '600' : '400', color: isOnAir ? '#7c3aed' : '#6b7280' }} numberOfLines={1}>
                                        {name}
                                      </Text>
                                      {isOnAir && (
                                        <View style={{ backgroundColor: '#7c3aed', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>ON AIR</Text>
                                        </View>
                                      )}
                                      <Pressable onPress={() => unassignCommentatorFromMatch(id, match.id)} hitSlop={6}>
                                        <X size={11} color="#9ca3af" />
                                      </Pressable>
                                    </Pressable>
                                  )
                                })}
                              </View>
                            )}
                            {match.liveCommentatorIdentities.length > 1 && (
                              <Text className="text-gray-400 text-[10px]">Tap a commentator to put them on air</Text>
                            )}
                          </View>
                          <Text className="text-gray-400 text-xs">
                            Assign feeds from the Camera lobby / Commentator lobby above.
                          </Text>
                        </View>

                        {match.sport === 'football' && match.footballScore ? (
                          <FootballScoreboard
                            matchId={match.id}
                            score={match.footballScore}
                            onAddGoal={addGoal}
                            onSubtractGoal={subtractGoal}
                            onSetStatus={setMatchClockStatus}
                            onIncrementMinute={incrementMinute}
                            onToggleVisible={toggleFootballVisible}
                            onReset={resetFootballScore}
                            onRenameTeam={renameFootballTeam}
                          />
                        ) : match.racketScore ? (
                          <RacketScoreboard
                            matchId={match.id}
                            sport={match.sport as 'badminton' | 'pickleball'}
                            score={match.racketScore}
                            onAddPoint={addPoint}
                            onSubtractPoint={subtractPoint}
                            onWinGame={winGame}
                            onSwapServer={swapServer}
                            onToggleVisible={toggleRacketVisible}
                            onReset={resetRacketScore}
                            onRenamePlayer={renameRacketPlayer}
                          />
                        ) : null}
                      </>
                    )}
                  </View>
                )
              })
            )}
          </View>
        )}
      </View>
    </View>
  )
}

type WhipSession = { pc: any; videoSender: any; audioSender: any }

function BroadcasterWhipManager({ matches }: { matches: MatchState[] }) {
  const allTracks = useTracks([Track.Source.Camera, Track.Source.Microphone])
  const sessionsRef = useRef<Map<string, WhipSession>>(new Map())

  const getVideoMST = (capturerIdentities: string[]): any => {
    const primaryId = capturerIdentities[0]
    if (!primaryId) return null
    const ref = allTracks.find(
      t => t.participant.identity === primaryId && t.source === Track.Source.Camera,
    )
    return (ref?.publication?.track as any)?.mediaStreamTrack ?? null
  }

  const getAudioMST = (commentatorIdentities: string[], capturerIdentities: string[]): any => {
    const identity = commentatorIdentities[0] ?? capturerIdentities[0]
    if (!identity) return null
    const ref = allTracks.find(
      t => t.participant.identity === identity && t.source === Track.Source.Microphone,
    )
    return (ref?.publication?.track as any)?.mediaStreamTrack ?? null
  }

  const ytKey = matches.map(m => `${m.id}=${m.ytWhipUrl ?? ''}`).join('|')

  useEffect(() => {
    const desired = new Map(
      matches
        .filter(m => m.ytWhipUrl && m.liveStatus !== 'ended')
        .map(m => [m.id, m]),
    )
    for (const [id, session] of sessionsRef.current.entries()) {
      if (!desired.has(id)) {
        try { session.pc.close() } catch {}
        sessionsRef.current.delete(id)
      }
    }
    for (const [id, match] of desired.entries()) {
      if (!sessionsRef.current.has(id)) {
        void openSession(match)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytKey])

  const assignKey = matches
    .map(m => `${m.id}:${m.liveCapturerIdentities[0] ?? ''}:${m.liveCommentatorIdentities[0] ?? ''}`)
    .join('|')

  useEffect(() => {
    for (const match of matches) {
      const session = sessionsRef.current.get(match.id)
      if (!session) continue
      try {
        session.videoSender.replaceTrack(getVideoMST(match.liveCapturerIdentities))
        session.audioSender.replaceTrack(getAudioMST(match.liveCommentatorIdentities, match.liveCapturerIdentities))
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTracks, assignKey])

  async function openSession(match: MatchState) {
    try {
      const RTCPeerConnection = (globalThis as any).RTCPeerConnection
      const RTCSessionDescription = (globalThis as any).RTCSessionDescription
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      const videoTx = pc.addTransceiver('video', { direction: 'sendonly' })
      const audioTx = pc.addTransceiver('audio', { direction: 'sendonly' })
      const videoMST = getVideoMST(match.liveCapturerIdentities)
      const audioMST = getAudioMST(match.liveCommentatorIdentities, match.liveCapturerIdentities)
      if (videoMST) videoTx.sender.replaceTrack(videoMST)
      if (audioMST) audioTx.sender.replaceTrack(audioMST)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const res = await fetch(match.ytWhipUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })
      if (!res.ok) throw new Error(`WHIP ${res.status}`)
      const answerSdp = await res.text()
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }))
      sessionsRef.current.set(match.id, { pc, videoSender: videoTx.sender, audioSender: audioTx.sender })
    } catch {}
  }

  useEffect(() => () => {
    for (const s of sessionsRef.current.values()) {
      try { s.pc.close() } catch {}
    }
    sessionsRef.current.clear()
  }, [])

  return null
}

function BroadcasterLobbies({
  matches,
  busy,
  onAssignCapturer,
  onAssignCommentator,
  onUnassignCapturer,
  onUnassignCommentator,
  onSwitchLiveCapturer,
  onSwitchLiveCommentator,
  onRosterChange,
  onCameraTracksChange,
  aiEnabledMap,
  onAiSwitch,
  onAiStatusUpdate,
}: {
  matches: MatchState[]
  busy: boolean
  onAssignCapturer: (capturerIdentity: string, matchId: string | null) => void
  onAssignCommentator: (commentatorIdentity: string, matchId: string | null) => void
  onUnassignCapturer: (identity: string, matchId: string) => void
  onUnassignCommentator: (identity: string, matchId: string) => void
  onSwitchLiveCapturer: (identity: string, matchId: string) => void
  onSwitchLiveCommentator: (identity: string, matchId: string) => void
  onRosterChange: (capturers: RosterParticipant[], commentators: RosterParticipant[], viewerCount: number) => void
  onCameraTracksChange: (tracks: any[]) => void
  aiEnabledMap: Record<string, boolean>
  onAiSwitch: (matchId: string, identity: string) => void
  onAiStatusUpdate: (matchId: string, status: string) => void
}) {
  const participants = useRemoteParticipants()
  const cameraTracks = useTracks([Track.Source.Camera])
  const [usageExceeded, setUsageExceeded] = useState(false)

  useEffect(() => { onCameraTracksChange(cameraTracks) }, [cameraTracks])

  const matchesRef = useRef(matches)
  useEffect(() => { matchesRef.current = matches }, [matches])

  const aiEnabledMapRef = useRef(aiEnabledMap)
  useEffect(() => { aiEnabledMapRef.current = aiEnabledMap }, [aiEnabledMap])

  const captureViewRefs = useRef<Map<string, React.RefObject<View | null>>>(new Map())
  const aiIntervalRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const aiConsecutiveWinsRef = useRef<Record<string, Record<string, number>>>({})

  const getOrCreateCaptureRef = (identity: string): React.RefObject<View | null> => {
    if (!captureViewRefs.current.has(identity)) {
      captureViewRefs.current.set(identity, React.createRef<View | null>())
    }
    return captureViewRefs.current.get(identity)!
  }

  const runAiPoll = async (matchId: string) => {
    const match = matchesRef.current.find(m => m.id === matchId)
    if (!match || match.liveCapturerIdentities.length === 0) return
    if (!aiEnabledMapRef.current[matchId]) return

    const formData = new FormData()
    formData.append('sport', match.sport)

    let frameCount = 0
    for (const identity of match.liveCapturerIdentities) {
      const viewRef = captureViewRefs.current.get(identity)
      if (!viewRef?.current) continue
      try {
        const uri = await captureRef(viewRef as any, { format: 'jpg', quality: 0.8 })
        formData.append(identity, { uri, type: 'image/jpeg', name: `${identity}.jpg` } as any)
        frameCount++
      } catch {}
    }

    if (frameCount === 0) {
      onAiStatusUpdate(matchId, 'Waiting for camera frames…')
      return
    }

    try {
      const res = await fetch(`${AI_DIRECTOR_URL}/analyze`, { method: 'POST', body: formData })
      if (!res.ok) {
        onAiStatusUpdate(matchId, 'AI service error — retrying…')
        return
      }
      const { bestCamera, scores } = await res.json() as { bestCamera: string; scores: Record<string, number> }

      const currentCam = match.liveCapturerIdentities[0]
      const allZero = !bestCamera || Object.values(scores).every(s => s === 0)

      if (allZero) {
        onAiStatusUpdate(matchId, 'No ball detected — holding current')
        return
      }

      if (bestCamera === currentCam) {
        aiConsecutiveWinsRef.current[matchId] = {}
        const sc = scores[currentCam]?.toFixed(2) ?? '—'
        onAiStatusUpdate(matchId, `Holding ${currentCam.slice(-6)} (score ${sc})`)
        return
      }

      if (!aiConsecutiveWinsRef.current[matchId]) aiConsecutiveWinsRef.current[matchId] = {}
      const wins = aiConsecutiveWinsRef.current[matchId]
      wins[bestCamera] = (wins[bestCamera] ?? 0) + 1
      const sc = scores[bestCamera]?.toFixed(2) ?? '—'
      onAiStatusUpdate(matchId, `${bestCamera.slice(-6)} winning (${wins[bestCamera]}/2, score ${sc})`)

      if (wins[bestCamera] >= 2) {
        aiConsecutiveWinsRef.current[matchId] = {}
        onAiSwitch(matchId, bestCamera)
        onAiStatusUpdate(matchId, `Switched to ${bestCamera.slice(-6)} (score ${sc})`)
      }
    } catch {
      onAiStatusUpdate(matchId, 'AI service error — retrying…')
    }
  }

  useEffect(() => {
    for (const [matchId, enabled] of Object.entries(aiEnabledMap)) {
      if (enabled && !aiIntervalRefs.current.has(matchId)) {
        aiConsecutiveWinsRef.current[matchId] = {}
        const id = setInterval(() => { void runAiPoll(matchId) }, 2000)
        aiIntervalRefs.current.set(matchId, id)
      } else if (!enabled) {
        const existing = aiIntervalRefs.current.get(matchId)
        if (existing !== undefined) {
          clearInterval(existing)
          aiIntervalRefs.current.delete(matchId)
          aiConsecutiveWinsRef.current[matchId] = {}
        }
      }
    }
    for (const matchId of [...aiIntervalRefs.current.keys()]) {
      if (!aiEnabledMap[matchId]) {
        clearInterval(aiIntervalRefs.current.get(matchId)!)
        aiIntervalRefs.current.delete(matchId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiEnabledMap])

  useEffect(() => {
    return () => {
      for (const id of aiIntervalRefs.current.values()) clearInterval(id)
    }
  }, [])

  useDataChannel((msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload))
      if (payload?.type === 'USAGE_EXCEEDED') setUsageExceeded(true)
    } catch {}
  })

  const allCapturers = participants.filter((p) => parseParticipantRole(p.metadata) === 'capturer')
  const commentators = participants.filter((p) => parseParticipantRole(p.metadata) === 'commentator')
  const viewers = participants.filter((p) => parseParticipantRole(p.metadata) === 'viewer')
  const assignableMatches = matches.filter((m) => m.liveStatus !== 'ended')
  // Only show unassigned capturers in the lobby — assigned ones move to their match card
  const capturers = allCapturers.filter((p) => !matches.some((m) => m.liveCapturerIdentities.includes(p.identity)))

  // Explicitly subscribe to every capturer's camera so thumbnails always render
  useEffect(() => {
    for (const p of capturers) {
      const pub = p.getTrackPublication(Track.Source.Camera)
      if (pub && !pub.isSubscribed) {
        pub.setSubscribed(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants])

  useEffect(() => {
    onRosterChange(
      allCapturers.map((p) => ({ identity: p.identity, name: p.name })),
      commentators.map((p) => ({ identity: p.identity, name: p.name })),
      viewers.length,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants])

  return (
    <View>
      {/* Hidden full-resolution VideoTrack views for AI frame capture */}
      <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        {cameraTracks.map(trackRef => {
          const ref = getOrCreateCaptureRef(trackRef.participant.identity)
          return (
            <View key={trackRef.participant.identity} ref={ref} style={{ width: 640, height: 360 }}>
              <VideoTrack trackRef={trackRef} style={{ width: 640, height: 360 }} />
            </View>
          )
        })}
      </View>
      {usageExceeded && (
        <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color="#dc2626" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 13 }}>Streaming limit reached</Text>
            <Text style={{ color: '#b91c1c', fontSize: 12, marginTop: 2 }}>All capturers and commentators have been disconnected. Upgrade your plan to resume streaming.</Text>
          </View>
        </View>
      )}
      {/* Total participant counts */}
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 }}>
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#2563eb' }}>{allCapturers.length}</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#6b7280', textAlign: 'center', marginTop: 2 }}>Capturers</Text>
        </View>
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d5ff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#7c3aed' }}>{commentators.length}</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#6b7280', textAlign: 'center', marginTop: 2 }}>Commentators</Text>
        </View>
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#059669' }}>{viewers.length}</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#6b7280', textAlign: 'center', marginTop: 2 }}>Viewers</Text>
        </View>
      </View>

    <View className="px-6 mt-6 gap-4">
      <View className="border border-gray-200 rounded-xl p-4">
        <View className="flex-row items-center gap-2 mb-1">
          <Video size={16} color="#111" />
          <Text className="text-black font-semibold text-base">Camera lobby</Text>
        </View>
        <Text className="text-gray-400 text-xs mb-3">Unassigned capturer feeds. Assigned capturers move to their match card.</Text>
        {capturers.length === 0 ? (
          <View className="border border-gray-100 rounded-lg py-4 items-center">
            <Text className="text-gray-400 text-sm">{allCapturers.length > 0 ? 'All capturers assigned to matches.' : 'No capturers connected.'}</Text>
          </View>
        ) : (
          <View className="gap-2">
            {capturers.map((p) => {
              const trackRef = cameraTracks.find((t) => t.participant.identity === p.identity)
              const assignedMatches = matches.filter((m) => m.liveCapturerIdentities.includes(p.identity))
              const aiLocked = assignedMatches.some(m => aiEnabledMap[m.id])
              return (
                <View key={p.identity} className="border border-gray-200 rounded-lg p-3 gap-3">
                  <View className="flex-row items-center gap-3">
                    <View className="w-20 h-14 rounded-md overflow-hidden bg-black items-center justify-center">
                      {trackRef ? (
                        <VideoTrack trackRef={trackRef} style={{ width: 80, height: 56 }} />
                      ) : (
                        <Text className="text-white/40 text-[10px]">no video</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-black font-semibold text-sm">{p.name || p.identity}</Text>
                      <Text className="text-gray-400 text-xs">{p.identity}</Text>
                      {assignedMatches.length > 0 && (
                        <View className="flex-row flex-wrap gap-1 mt-1">
                          {assignedMatches.map(m => (
                            <View key={m.id} style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ color: '#2563eb', fontSize: 10, fontWeight: '600' }}>{m.name}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                  <MatchAssignDropdown
                    matches={assignableMatches}
                    selectedMatchId={null}
                    placeholder="Add to match…"
                    disabled={busy || aiLocked}
                    onSelect={(matchId) => onAssignCapturer(p.identity, matchId)}
                  />
                </View>
              )
            })}
          </View>
        )}
      </View>

      <View className="border border-gray-200 rounded-xl p-4">
        <View className="flex-row items-center gap-2 mb-1">
          <Mic size={16} color="#111" />
          <Text className="text-black font-semibold text-base">Commentator lobby</Text>
        </View>
        <Text className="text-gray-400 text-xs mb-3">Connected commentary feeds (optional). Assign each one to a match.</Text>
        {commentators.length === 0 ? (
          <View className="border border-gray-100 rounded-lg py-4 items-center">
            <Text className="text-gray-400 text-sm">No commentators connected.</Text>
          </View>
        ) : (
          <View className="gap-2">
            {commentators.map((p) => {
              const assignedMatches = matches.filter((m) => m.liveCommentatorIdentities.includes(p.identity))
              return (
                <View key={p.identity} className="border border-gray-200 rounded-lg p-3 gap-3">
                  <View className="flex-1">
                    <Text className="text-black font-semibold text-sm">{p.name || p.identity}</Text>
                    <Text className="text-gray-400 text-xs">{p.identity}</Text>
                    {assignedMatches.length > 0 && (
                      <View className="flex-row flex-wrap gap-1 mt-1">
                        {assignedMatches.map(m => (
                          <View key={m.id} style={{ backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d5ff', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ color: '#7c3aed', fontSize: 10, fontWeight: '600' }}>{m.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <MatchAssignDropdown
                    matches={assignableMatches}
                    selectedMatchId={null}
                    placeholder="Add to match…"
                    disabled={busy}
                    onSelect={(matchId) => onAssignCommentator(p.identity, matchId)}
                  />
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
    </View>
  )
}

function MatchAssignDropdown({
  matches,
  selectedMatchId,
  disabled,
  onSelect,
  placeholder = 'Assign to…',
}: {
  matches: MatchState[]
  selectedMatchId: string | null
  disabled?: boolean
  onSelect: (matchId: string | null) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selectedMatch = matches.find((m) => m.id === selectedMatchId)

  return (
    <View>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen((o) => !o)}
        className={`border border-gray-200 rounded-lg px-3 py-2 flex-row items-center justify-between ${disabled ? 'opacity-50' : 'bg-white'}`}
      >
        <Text className={`text-sm ${selectedMatch ? 'text-black font-semibold' : 'text-gray-400'}`}>
          {selectedMatch ? selectedMatch.name : placeholder}
        </Text>
        <ChevronDown size={14} color="#9ca3af" />
      </Pressable>
      {open && (
        <View className="border border-gray-200 rounded-lg mt-1 overflow-hidden">
          <Pressable
            onPress={() => {
              onSelect(null)
              setOpen(false)
            }}
            className="px-3 py-2.5 border-b border-gray-100"
          >
            <Text className="text-gray-400 text-sm">Assign to…</Text>
          </Pressable>
          {matches.length === 0 ? (
            <View className="px-3 py-2.5">
              <Text className="text-gray-400 text-xs">No matches yet — add one below.</Text>
            </View>
          ) : (
            matches.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  onSelect(m.id)
                  setOpen(false)
                }}
                className={`px-3 py-2.5 ${m.id === selectedMatchId ? 'bg-blue-50' : ''}`}
              >
                <Text className="text-black text-sm">{m.name}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  )
}

function RacketScoreboard({
  matchId,
  sport,
  score,
  onAddPoint,
  onSubtractPoint,
  onWinGame,
  onSwapServer,
  onToggleVisible,
  onReset,
  onRenamePlayer,
}: {
  matchId: string
  sport: 'badminton' | 'pickleball'
  score: RacketScoreState
  onAddPoint: (id: string, side: Side) => void
  onSubtractPoint: (id: string, side: Side) => void
  onWinGame: (id: string, side: Side) => void
  onSwapServer: (id: string) => void
  onToggleVisible: (id: string) => void
  onReset: (id: string, sport: 'badminton' | 'pickleball') => void
  onRenamePlayer: (id: string, side: Side, name: string) => void
}) {
  const unit = sport === 'badminton' ? 'Player' : 'Team'

  return (
    <View className="border border-gray-200 rounded-xl p-4">
      <View className="flex-row flex-wrap items-center justify-between gap-3 mb-3">
        <View>
          <Text className="text-black font-semibold text-base">Scoreboard</Text>
          <Text className="text-gray-400 text-xs mt-0.5">
            Game {score.gameNumber} · server: {score.server === 'A' ? score.nameA : score.nameB}
          </Text>
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <Pressable
            onPress={() => onSwapServer(matchId)}
            className="border border-gray-200 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
          >
            <Repeat size={14} color="#111" />
            <Text className="text-black text-xs font-medium">Swap server</Text>
          </Pressable>
          <Pressable
            onPress={() => onToggleVisible(matchId)}
            className="border border-gray-200 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
          >
            {score.visible ? <EyeOff size={14} color="#111" /> : <Eye size={14} color="#111" />}
            <Text className="text-black text-xs font-medium">{score.visible ? 'Hide' : 'Show'}</Text>
          </Pressable>
          <Pressable
            onPress={() => onReset(matchId, sport)}
            className="border border-gray-200 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
          >
            <RotateCcw size={14} color="#111" />
            <Text className="text-black text-xs font-medium">Reset</Text>
          </Pressable>
        </View>
      </View>

      {score.visible ? (
        <View className="flex-row flex-wrap gap-3">
          {(['A', 'B'] as Side[]).map(side => {
            const name = side === 'A' ? score.nameA : score.nameB
            const points = side === 'A' ? score.pointsA : score.pointsB
            const games = side === 'A' ? score.gamesA : score.gamesB
            const isServer = score.server === side

            return (
              <View
                key={side}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3"
                style={{ minWidth: 220, flexGrow: 1, flexBasis: 220 }}
              >
                <View className="flex-row flex-wrap items-center justify-between bg-gray-100 rounded-lg px-3 py-2 mb-3 gap-2">
                  <TextInput
                    value={name}
                    onChangeText={t => onRenamePlayer(matchId, side, t)}
                    placeholder={`${unit} ${side}`}
                    className="text-black font-medium text-sm"
                    style={{ minWidth: 90, flexGrow: 1, flexBasis: 90 }}
                  />
                  {isServer && (
                    <View className="bg-gray-900 rounded px-2 py-0.5">
                      <Text className="text-white text-[10px] font-bold tracking-wide">SERVE</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-end justify-between mb-3">
                  <Text className="text-black text-4xl font-bold">{points}</Text>
                  <Text className="text-gray-500 text-xs">
                    Games won: <Text className="text-black font-semibold">{games}</Text>
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => onSubtractPoint(matchId, side)}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white"
                  >
                    <Minus size={14} color="#111" />
                  </Pressable>
                  <Pressable
                    onPress={() => onAddPoint(matchId, side)}
                    className="flex-1 bg-gray-900 rounded-lg py-2.5 flex-row items-center justify-center gap-1.5"
                  >
                    <Plus size={14} color="#fff" />
                    <Text className="text-white font-semibold text-sm">Point</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onWinGame(matchId, side)}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white"
                  >
                    <Text className="text-black text-xs font-semibold">Win game</Text>
                  </Pressable>
                </View>
              </View>
            )
          })}
        </View>
      ) : (
        <View className="border border-gray-100 rounded-lg py-6 items-center">
          <Text className="text-gray-400 text-sm">Scoreboard hidden from viewers.</Text>
        </View>
      )}
    </View>
  )
}

const STATUS_LABEL: Record<FootballClockStatus, string> = {
  not_started: 'Not started',
  live: 'Live',
  half_time: 'Half-time',
  ended: 'Ended',
}

function FootballScoreboard({
  matchId,
  score,
  onAddGoal,
  onSubtractGoal,
  onSetStatus,
  onIncrementMinute,
  onToggleVisible,
  onReset,
  onRenameTeam,
}: {
  matchId: string
  score: FootballScoreState
  onAddGoal: (id: string, side: Side) => void
  onSubtractGoal: (id: string, side: Side) => void
  onSetStatus: (id: string, status: FootballClockStatus) => void
  onIncrementMinute: (id: string) => void
  onToggleVisible: (id: string) => void
  onReset: (id: string) => void
  onRenameTeam: (id: string, side: Side, name: string) => void
}) {
  return (
    <View className="border border-gray-200 rounded-xl p-4">
      <View className="flex-row flex-wrap items-center justify-between gap-3 mb-3">
        <View>
          <Text className="text-black font-semibold text-base">Scoreboard</Text>
          <Text className="text-gray-400 text-xs mt-0.5">
            {STATUS_LABEL[score.status]} · {score.minute}'
          </Text>
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <Pressable
            onPress={() => onToggleVisible(matchId)}
            className="border border-gray-200 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
          >
            {score.visible ? <EyeOff size={14} color="#111" /> : <Eye size={14} color="#111" />}
            <Text className="text-black text-xs font-medium">{score.visible ? 'Hide' : 'Show'}</Text>
          </Pressable>
          <Pressable
            onPress={() => onReset(matchId)}
            className="border border-gray-200 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
          >
            <RotateCcw size={14} color="#111" />
            <Text className="text-black text-xs font-medium">Reset</Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-row flex-wrap items-center gap-2 mb-3">
        <Pressable
          onPress={() => onSetStatus(matchId, 'live')}
          className={`rounded-lg px-3 py-2 flex-row items-center gap-1.5 ${score.status === 'live' ? 'bg-emerald-100' : 'bg-gray-100'}`}
        >
          <Play size={14} color="#047857" />
          <Text className="text-black text-xs font-semibold">Kick off / resume</Text>
        </Pressable>
        <Pressable
          onPress={() => onSetStatus(matchId, 'half_time')}
          className={`rounded-lg px-3 py-2 flex-row items-center gap-1.5 ${score.status === 'half_time' ? 'bg-amber-100' : 'bg-gray-100'}`}
        >
          <Pause size={14} color="#b45309" />
          <Text className="text-black text-xs font-semibold">Half-time</Text>
        </Pressable>
        <Pressable
          onPress={() => onSetStatus(matchId, 'ended')}
          className={`rounded-lg px-3 py-2 flex-row items-center gap-1.5 ${score.status === 'ended' ? 'bg-red-100' : 'bg-gray-100'}`}
        >
          <Square size={14} color="#b91c1c" />
          <Text className="text-black text-xs font-semibold">Full-time</Text>
        </Pressable>
        <Pressable
          onPress={() => onIncrementMinute(matchId)}
          className="border border-gray-200 rounded-lg px-3 py-2"
        >
          <Text className="text-black text-xs font-semibold">+1 min</Text>
        </Pressable>
      </View>

      {score.visible ? (
        <View className="flex-row flex-wrap gap-3">
          {(['A', 'B'] as Side[]).map(side => {
            const name = side === 'A' ? score.nameA : score.nameB
            const goals = side === 'A' ? score.goalsA : score.goalsB

            return (
              <View
                key={side}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3"
                style={{ minWidth: 220, flexGrow: 1, flexBasis: 220 }}
              >
                <View className="bg-gray-100 rounded-lg px-3 py-2 mb-3">
                  <TextInput
                    value={name}
                    onChangeText={t => onRenameTeam(matchId, side, t)}
                    placeholder={`Team ${side}`}
                    className="text-black font-medium text-sm"
                  />
                </View>
                <View className="mb-3">
                  <Text className="text-black text-4xl font-bold">{goals}</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">Goals</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => onSubtractGoal(matchId, side)}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white"
                  >
                    <Minus size={14} color="#111" />
                  </Pressable>
                  <Pressable
                    onPress={() => onAddGoal(matchId, side)}
                    className="flex-1 bg-gray-900 rounded-lg py-2.5 flex-row items-center justify-center gap-1.5"
                  >
                    <Plus size={14} color="#fff" />
                    <Text className="text-white font-semibold text-sm">Goal</Text>
                  </Pressable>
                </View>
              </View>
            )
          })}
        </View>
      ) : (
        <View className="border border-gray-100 rounded-lg py-6 items-center">
          <Text className="text-gray-400 text-sm">Scoreboard hidden from viewers.</Text>
        </View>
      )}
    </View>
  )
}


function AdminPanel() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false);


    const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await adminLogin(email, password);
      await SecureStore.setItemAsync("adminId", data.user.id.toString());
      router.replace("/adminDashboard");
    } catch (error: any) {
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError("Unable to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <View className="bg-emerald-900 px-6 pt-6 pb-6">
        <View className="flex-row items-center gap-3 mb-1">
          <View className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 items-center justify-center">
            <ShieldCheck size={20} color="#fb923c" />
          </View>
          <Text className="text-white text-3xl font-black">Admin</Text>
        </View>
        <Text className="text-white/50 text-sm ml-1 mt-1">
          Manage organisers and event configuration — restricted access.
        </Text>
      </View>

      <View className="bg-yellow-400 px-6 py-2 flex-row justify-between items-center">
        <View className="flex-row items-center gap-1.5">
          <Lock size={12} color="#022c22" strokeWidth={2.75} />
          <Text className="text-emerald-950 font-black text-xs tracking-wider">RESTRICTED AREA</Text>
        </View>
        <Text className="text-emerald-950 font-black text-xs">CREDENTIALS REQUIRED</Text>
      </View>

      <View className="px-6 mt-8">
        <View className="bg-slate-800/80 rounded-3xl p-6 border border-white/10">
          <View className="flex-row items-center gap-3 mb-6">
            <View className="w-12 h-12 rounded-full bg-slate-700 border border-white/10 items-center justify-center">
              <Users size={22} color="rgba(255,255,255,0.8)" />
            </View>
            <View>
              <Text className="text-white text-lg font-black">Admin login</Text>
              <Text className="text-white/40 text-xs mt-0.5">
                Restricted area. Enter credentials to continue.
              </Text>
            </View>
          </View>

          {error !== '' && (
            <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 mb-4 flex-row items-center gap-2">
              <AlertTriangle size={14} color="#f87171" />
              <Text className="text-red-400 text-xs font-semibold flex-1">{error}</Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text)
                setError('')
              }}
              className="bg-slate-900 text-white rounded-xl px-4 py-3 border border-white/10 text-sm"
              placeholderTextColor="rgba(255,255,255,0.25)"
              placeholder="admin@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="mb-6">
            <Text className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">
              Password
            </Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  setError('')
                }}
                className="bg-slate-900 text-white rounded-xl px-4 py-3 border border-white/10 text-sm pr-12"
                placeholderTextColor="rgba(255,255,255,0.25)"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-0 bottom-0 items-center justify-center"
              >
                {showPassword ? (
                  <EyeOff size={18} color="rgba(255,255,255,0.35)" />
                ) : (
                  <Eye size={18} color="rgba(255,255,255,0.35)" />
                )}
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleSignIn}
            className="bg-white active:bg-white/80 rounded-2xl py-4 items-center"
          >
            <Text className="text-slate-900 text-base font-black tracking-wide">
              Sign in
            </Text>
          </Pressable>
        </View>
        <View className="flex-row items-start gap-2 mt-4 px-2">
          <ShieldAlert size={14} color="rgba(250,204,21,0.6)" style={{ marginTop: 1 }} />
          <Text className="text-white/25 text-xs leading-relaxed flex-1">
            This area is restricted to authorized admins only. Unauthorized access attempts are logged.
          </Text>
        </View>
      </View>
    </View>
  )
}

export default function Organisers() {
  const [activeTab, setActiveTab] = useState<TabKey>('capturer')
  const [isCapturerLive, setIsCapturerLive] = useState(false)
  const [isCommentatorLive, setIsCommentatorLive] = useState(false)
  const [isBroadcasterJoined, setIsBroadcasterJoined] = useState(false)

  const isAnyLiveOrJoined = isCapturerLive || isCommentatorLive || isBroadcasterJoined

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >

        <View style={{ display: activeTab === 'capturer' ? 'flex' : 'none' }}>
          <CapturerPanel onLiveChange={setIsCapturerLive} />
        </View>
        <View style={{ display: activeTab === 'commentator' ? 'flex' : 'none' }}>
          <CommentatorPanel onLiveChange={setIsCommentatorLive} />
        </View>
        <View style={{ display: activeTab === 'broadcaster' ? 'flex' : 'none' }}>
          <BroadcasterPanel onJoinChange={setIsBroadcasterJoined} />
        </View>
        {activeTab === 'admin' && <AdminPanel />}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-[#0D1220] border-t border-white/10 px-3 pt-2.5 pb-7">
        <View className="flex-row items-center justify-between">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab
            const { Icon } = tab
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  if (isAnyLiveOrJoined && tab.key !== activeTab) return;
                  setActiveTab(tab.key);
                }}
                className={`flex-1 items-center py-1.5 ${isAnyLiveOrJoined && tab.key !== activeTab ? 'opacity-30' : 'active:opacity-60'}`}
              >
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mb-1 ${
                    isActive ? 'bg-orange-500' : 'bg-transparent'
                  }`}
                >
                  <Icon size={18} color={isActive ? '#0A0E16' : 'rgba(255,255,255,0.4)'} />
                </View>
                <Text
                  className={`text-[10px] font-bold tracking-wide ${
                    isActive ? 'text-orange-400' : 'text-white/35'
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}
