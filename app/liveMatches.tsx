import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput } from 'react-native'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { Radio, LogOut, Mic, Video, Search, WifiOff } from 'lucide-react-native'
import { getLiveKitToken } from './services/livekit'
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteParticipant,
  DataPacket_Kind,
} from '@livekit/react-native'

interface LiveUpdate {
  capturerIdentity: string
  commentatorIdentity: string | null
}

export default function LiveMatches() {
  const router = useRouter()

  // ── Connection state ─────────────────────────────────────────
  const [eventId, setEventId] = useState('')
  const [identity] = useState(`viewer-${Math.random().toString(36).slice(2, 8)}`)
  const [connecting, setConnecting] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const roomRef = useRef<Room | null>(null)

  // ── Live update from broadcaster ─────────────────────────────
  const [liveUpdate, setLiveUpdate] = useState<LiveUpdate | null>(null)
  const [participants, setParticipants] = useState<string[]>([])

  useEffect(() => {
    return () => { roomRef.current?.disconnect() }
  }, [])

  const joinRoom = async () => {
    const id = eventId.trim()
    if (!id) return
    setConnecting(true)
    setJoinError(null)
    try {
      const roomName = `event-${id}`
      const { token, url } = await getLiveKitToken(identity, roomName, 'viewer')
      const room = new Room()
      roomRef.current = room

      // Listen for data channel messages from broadcaster
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const text = new TextDecoder().decode(payload)
          const msg = JSON.parse(text)
          if (msg.type === 'LIVE_UPDATE') {
            setLiveUpdate({
              capturerIdentity: msg.capturerIdentity,
              commentatorIdentity: msg.commentatorIdentity ?? null,
            })
          }
        } catch {
          // ignore malformed messages
        }
      })

      room.on(RoomEvent.ParticipantConnected, () => refreshParticipants(room))
      room.on(RoomEvent.ParticipantDisconnected, () => refreshParticipants(room))

      await room.connect(url, token)
      refreshParticipants(room)
      setIsJoined(true)
    } catch (e: any) {
      setJoinError(e?.message ?? 'Failed to connect to the room')
    } finally {
      setConnecting(false)
    }
  }

  const refreshParticipants = (room: Room) => {
    const ids: string[] = []
    room.remoteParticipants.forEach((p) => ids.push(p.identity))
    setParticipants(ids)
  }

  const leaveRoom = async () => {
    await roomRef.current?.disconnect()
    roomRef.current = null
    setIsJoined(false)
    setLiveUpdate(null)
    setParticipants([])
  }

  return (
    <ScrollView
      className="flex-1 bg-[#0A0E16]"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-6 pt-14">
        <View className="self-start flex-row items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 mb-5">
          <Radio size={13} color="#fb923c" />
          <Text className="text-orange-500 font-black text-xs tracking-widest">
            LIVE VIEWER
          </Text>
        </View>

        <Text className="text-white text-4xl font-black">Match Viewer</Text>
        <Text className="text-white/50 text-sm mt-2 leading-relaxed">
          Join an event room to watch live with commentary.
        </Text>
      </View>

      {/* Join form */}
      {!isJoined ? (
        <View className="mx-6 mt-8 gap-3">
          <Text className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">
            Event ID
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-white/[0.06] rounded-2xl border border-white/10 px-4 flex-row items-center">
              <Search size={16} color="rgba(255,255,255,0.3)" />
              <TextInput
                value={eventId}
                onChangeText={setEventId}
                onSubmitEditing={joinRoom}
                placeholder="Enter Event ID"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                editable={!connecting}
                className="flex-1 text-white py-4 pl-2.5 text-base font-semibold"
              />
            </View>
            <Pressable
              onPress={joinRoom}
              disabled={!eventId.trim() || connecting}
              className="bg-orange-500 active:bg-orange-600 rounded-2xl w-14 items-center justify-center disabled:opacity-30"
            >
              {connecting
                ? <ActivityIndicator color="#0A0E16" />
                : <Radio size={20} color="#0A0E16" />
              }
            </Pressable>
          </View>
          {joinError && (
            <Text className="text-red-400 text-xs font-medium">{joinError}</Text>
          )}
        </View>
      ) : (
        <>
          {/* Connected header */}
          <View className="mx-6 mt-8 flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center gap-2 mb-1">
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-emerald-400 text-xs font-bold">Connected</Text>
              </View>
              <Text className="text-white font-bold text-base">Room: event-{eventId.trim()}</Text>
              <Text className="text-white/40 text-xs mt-0.5">{participants.length} participant(s) in room</Text>
            </View>
            <Pressable
              onPress={leaveRoom}
              className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 active:bg-white/10"
            >
              <WifiOff size={14} color="rgba(255,255,255,0.7)" />
              <Text className="text-white/70 text-sm font-bold">Leave</Text>
            </Pressable>
          </View>

          {/* Live update card */}
          <View className="mx-6 mt-6">
            {liveUpdate ? (
              <View className="bg-white/[0.07] rounded-3xl p-5 border border-orange-500/20">
                {/* Live badge */}
                <View className="flex-row items-center gap-2 mb-4">
                  <View className="flex-row items-center gap-1.5 bg-red-500/20 border border-red-500/40 rounded-full px-3 py-1">
                    <View className="w-2 h-2 rounded-full bg-red-500" />
                    <Text className="text-red-400 text-xs font-black tracking-widest">LIVE</Text>
                  </View>
                  <Text className="text-white/40 text-xs">Broadcaster is streaming</Text>
                </View>

                {/* Capturer */}
                <View className="bg-white/[0.05] rounded-2xl p-4 border border-white/8 mb-3">
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <Video size={14} color="#fb923c" />
                    <Text className="text-orange-400 text-xs font-extrabold tracking-[2px] uppercase">
                      Video Feed
                    </Text>
                  </View>
                  <Text className="text-white font-bold text-base">{liveUpdate.capturerIdentity}</Text>
                  <Text className="text-white/40 text-xs mt-0.5">Publishing video + audio</Text>
                </View>

                {/* Commentator */}
                {liveUpdate.commentatorIdentity ? (
                  <View className="bg-white/[0.05] rounded-2xl p-4 border border-white/8">
                    <View className="flex-row items-center gap-2 mb-1.5">
                      <Mic size={14} color="#c084fc" />
                      <Text className="text-purple-400 text-xs font-extrabold tracking-[2px] uppercase">
                        Commentary
                      </Text>
                    </View>
                    <Text className="text-white font-bold text-base">{liveUpdate.commentatorIdentity}</Text>
                    <Text className="text-white/40 text-xs mt-0.5">Commentary audio active</Text>
                  </View>
                ) : (
                  <View className="bg-white/[0.03] rounded-2xl p-4 items-center border border-white/5">
                    <Text className="text-white/30 text-xs">No commentary assigned</Text>
                  </View>
                )}
              </View>
            ) : (
              /* Waiting state */
              <View className="bg-white/[0.04] rounded-3xl p-8 items-center border border-white/5">
                <ActivityIndicator color="rgba(255,255,255,0.3)" style={{ marginBottom: 16 }} />
                <Text className="text-white/50 text-sm text-center font-semibold">
                  Waiting for broadcaster…
                </Text>
                <Text className="text-white/25 text-xs text-center mt-2 leading-relaxed">
                  The broadcaster will select a capturer and commentator and send a live update to this room.
                </Text>
              </View>
            )}
          </View>

          {/* Participants list */}
          {participants.length > 0 && (
            <View className="mx-6 mt-6">
              <Text className="text-white/40 text-xs font-extrabold tracking-[2px] uppercase mb-3">
                In This Room
              </Text>
              <View className="gap-2">
                {participants.map((p) => (
                  <View key={p} className="flex-row items-center gap-3 bg-white/[0.04] rounded-2xl px-4 py-3 border border-white/8">
                    <View className={`w-2 h-2 rounded-full ${
                      p.startsWith('capturer-') ? 'bg-orange-500' :
                      p.startsWith('commentator-') ? 'bg-purple-500' :
                      p.startsWith('broadcaster-') ? 'bg-yellow-400' :
                      'bg-white/30'
                    }`} />
                    <Text className="text-white/70 text-sm font-bold flex-1">{p}</Text>
                    <Text className="text-white/30 text-[10px] font-bold uppercase">
                      {p.startsWith('capturer-') ? 'capturer' :
                       p.startsWith('commentator-') ? 'commentator' :
                       p.startsWith('broadcaster-') ? 'broadcaster' : 'viewer'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}
