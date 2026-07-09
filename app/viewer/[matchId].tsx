import { View, Text, Pressable, ScrollView, Animated } from 'react-native'
import { useEffect, useState, useRef } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Radio, LogOut, Mic, AlertTriangle, ChevronLeft } from 'lucide-react-native'
import { LiveKitRoom, VideoTrack, useDataChannel, useRemoteParticipants, useTracks } from '@livekit/react-native'
import { Track } from 'livekit-client'
import { fetchLiveKitToken } from '../services/livekit'
import { getMatch, type Match } from '../services/match'

export default function ViewerMatch() {
  const router = useRouter()
  const { matchId, eventId } = useLocalSearchParams<{ matchId: string; eventId: string }>()
  const [identity] = useState(() => `viewer-${Math.random().toString(36).slice(2, 8)}`)
  const [connection, setConnection] = useState<{ token: string; url: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!matchId || !eventId) return
    setError('')
    setConnecting(true)
    fetchLiveKitToken(identity, eventId, 'viewer')
      .then(setConnection)
      .catch((err: any) => {
        if (err?.code === 'USAGE_LIMIT_EXCEEDED') {
          setError('Streaming is currently unavailable. The organiser has reached their usage limit.')
        } else {
          setError(err.response?.data?.message ?? 'Could not join this event.')
        }
      })
      .finally(() => setConnecting(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, eventId])

  if (!matchId || !eventId) {
    return (
      <View className="flex-1 bg-emerald-950 items-center justify-center px-6">
        <Text className="text-white/60 text-sm">Missing match or event.</Text>
      </View>
    )
  }

  if (!connection) {
    return (
      <View className="flex-1 bg-emerald-950 px-6 pt-20">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2 mb-6 self-start">
          <ChevronLeft size={18} color="rgba(255,255,255,0.6)" />
          <Text className="text-white/60 text-sm font-medium">Back</Text>
        </Pressable>
        {connecting ? (
          <Text className="text-white/60 text-sm">Connecting…</Text>
        ) : (
          <View className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 flex-row items-center gap-2">
            <AlertTriangle size={14} color="#f87171" />
            <Text className="text-red-400 text-xs font-semibold flex-1">{error || 'Could not connect.'}</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <LiveKitRoom
      serverUrl={connection.url}
      token={connection.token}
      connect
      connectOptions={{ autoSubscribe: false }}
      onDisconnected={() => setConnection(null)}
      onError={(err) => setError(err.message)}
    >
      <ViewerLiveView matchId={matchId} onLeave={() => router.back()} />
    </LiveKitRoom>
  )
}

function ViewerLiveView({ matchId, onLeave }: { matchId: string; onLeave: () => void }) {
  const participants = useRemoteParticipants()
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone])
  const [match, setMatch] = useState<Match | null>(null)
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  useEffect(() => {
    getMatch(matchId).then(setMatch).catch(() => {})
  }, [matchId])

  useDataChannel((msg) => {
    try {
      const payload = JSON.parse(new TextDecoder().decode(msg.payload))
      if (payload?.type === 'MATCH_LIVE_UPDATE' && payload.matchId === matchId) {
        setMatch((prev) =>
          prev
            ? {
                ...prev,
                liveCapturerIdentity: payload.liveCapturerIdentity ?? null,
                liveCommentatorIdentity: payload.liveCommentatorIdentity ?? null,
              }
            : prev,
        )
      }
    } catch {}
  })

  useEffect(() => {
    const desiredCapturer = match?.liveCapturerIdentity ?? null
    const desiredCommentator = match?.liveCommentatorIdentity ?? null

    participants.forEach((p) => {
      const isCapturer = p.identity === desiredCapturer
      const wantsMic = isCapturer || p.identity === desiredCommentator

      const cameraPub = p.getTrackPublication(Track.Source.Camera)
      if (cameraPub && cameraPub.isSubscribed !== isCapturer) {
        cameraPub.setSubscribed(isCapturer)
      }

      const micPub = p.getTrackPublication(Track.Source.Microphone)
      if (micPub && micPub.isSubscribed !== wantsMic) {
        micPub.setSubscribed(wantsMic)
      }
    })
  }, [match?.liveCapturerIdentity, match?.liveCommentatorIdentity, participants])

  const videoTrackRef = tracks.find(
    (t) => t.source === Track.Source.Camera && t.participant.identity === match?.liveCapturerIdentity
  )
  const isLive = !!match?.liveCapturerIdentity

  if (!isLive) {
    return (
      <View className="flex-1 bg-black">
        {/* Back button */}
        <Pressable
          onPress={onLeave}
          className="absolute top-14 left-6 z-10 flex-row items-center gap-2 active:opacity-60"
        >
          <ChevronLeft size={18} color="rgba(255,255,255,0.4)" />
          <Text className="text-white/40 text-sm font-medium">Back</Text>
        </Pressable>

        {/* Centered waiting indicator */}
        <View className="flex-1 items-center justify-center gap-5">
          <Animated.View
            style={{ opacity: pulseAnim }}
            className="w-16 h-16 rounded-full bg-white/10 items-center justify-center"
          >
            <Mic size={28} color="rgba(255,255,255,0.5)" />
          </Animated.View>
          <View className="items-center gap-1.5">
            <Text className="text-white/80 text-base font-bold">
              {match?.name ?? 'Match'}
            </Text>
            <Text className="text-white/35 text-sm">
              Waiting for stream to begin…
            </Text>
          </View>
        </View>

        {/* Leave button at bottom */}
        <Pressable
          onPress={onLeave}
          className="absolute bottom-12 self-center flex-row items-center gap-2 px-5 py-3 rounded-full border border-white/15 active:bg-white/10"
        >
          <LogOut size={14} color="rgba(255,255,255,0.6)" />
          <Text className="text-white/60 text-sm font-semibold">Leave</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-emerald-950"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6 pt-14">
        <Pressable onPress={onLeave} className="flex-row items-center gap-2 mb-5 self-start">
          <ChevronLeft size={18} color="rgba(255,255,255,0.6)" />
          <Text className="text-white/60 text-sm font-medium">Back to matches</Text>
        </Pressable>

        <View className="self-start flex-row items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/60 border border-yellow-400/40 mb-5">
          <Radio size={13} color="#facc15" />
          <Text className="text-yellow-400 font-black text-xs tracking-widest">LIVE</Text>
        </View>

        <Text className="text-white text-4xl font-black">{match?.name ?? 'Match'}</Text>
        <Text className="text-emerald-200/70 text-sm mt-2 capitalize">{match?.sport ?? ''}</Text>
      </View>

      <View className="px-6 mt-8 flex-row items-end justify-between">
        <Text className="text-white text-lg font-black">On air</Text>
        <Pressable
          onPress={onLeave}
          className="flex-row items-center gap-1.5 px-4 py-2 rounded-lg border border-white/15 active:bg-white/10"
        >
          <LogOut size={14} color="#ffffff" />
          <Text className="text-white text-sm font-bold">Leave</Text>
        </Pressable>
      </View>

      <View className="px-6 mt-4">
        {videoTrackRef ? (
          <View className="rounded-2xl overflow-hidden border border-white/10 bg-black" style={{ aspectRatio: 16 / 9 }}>
            <VideoTrack trackRef={videoTrackRef} style={{ flex: 1 }} />
          </View>
        ) : (
          <View className="bg-black rounded-2xl border border-white/10 py-10 items-center justify-center" style={{ aspectRatio: 16 / 9 }}>
            <Animated.View style={{ opacity: pulseAnim }}>
              <Mic size={24} color="rgba(255,255,255,0.4)" />
            </Animated.View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
