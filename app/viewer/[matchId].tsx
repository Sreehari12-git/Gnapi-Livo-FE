import { View, Text, Pressable, ScrollView } from 'react-native'
import { useEffect, useState } from 'react'
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
      .catch((err: any) => setError(err.response?.data?.message ?? 'Could not join this event.'))
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
          <Text className="text-yellow-400 font-black text-xs tracking-widest">
            {isLive ? 'LIVE' : 'WAITING'}
          </Text>
        </View>

        <Text className="text-white text-4xl font-black">{match?.name ?? 'Match'}</Text>
        <Text className="text-emerald-200/70 text-sm mt-2 capitalize">{match?.sport ?? ''}</Text>
      </View>

      <View className="px-6 mt-8 flex-row items-end justify-between">
        <Text className="text-white text-lg font-black">{isLive ? 'On air' : 'No live feed'}</Text>

        <Pressable
          onPress={onLeave}
          className="flex-row items-center gap-1.5 px-4 py-2 rounded-lg border border-white/15 active:bg-white/10"
        >
          <LogOut size={14} color="#ffffff" />
          <Text className="text-white text-sm font-bold">Leave</Text>
        </Pressable>
      </View>

      <View className="px-6 mt-4">
        {isLive && videoTrackRef ? (
          <View className="rounded-2xl overflow-hidden border border-white/10 bg-black" style={{ aspectRatio: 16 / 9 }}>
            <VideoTrack trackRef={videoTrackRef} style={{ flex: 1 }} />
          </View>
        ) : (
          <View className="bg-black/20 rounded-2xl border border-white/10 border-dashed py-10 items-center justify-center">
            <View className="flex-row items-center gap-2">
              <Mic size={16} color="rgba(255,255,255,0.5)" />
              <Text className="text-white/50 text-sm">
                Waiting for the broadcaster to start this match…
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
