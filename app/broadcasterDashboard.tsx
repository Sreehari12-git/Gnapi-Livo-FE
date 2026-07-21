import { View, Text, Pressable, TextInput, ScrollView, Linking } from 'react-native'
import { useEffect, useRef, useState, useCallback } from 'react'
import ViewShot, { captureRef } from 'react-native-view-shot'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  LogOut,
  Video,
  Mic,
  Plus,
  Volume2,
  VolumeX,
  Trash2,
  Minus,
  Repeat,
  EyeOff,
  Eye,
  RotateCcw,
  Trophy,
  Play,
  Pause,
  Square,
  Radio,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react-native'
import * as WebBrowser from 'expo-web-browser'
import { LiveKitRoom, useRemoteParticipants, useTracks, VideoTrack } from '@livekit/react-native'
import { Track } from 'livekit-client'
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

const DETECTOR_URL = 'http://192.168.1.100:8000' // update to your objdetector backend IP
const ANALYSIS_INTERVAL_MS = 1500
const DETECTOR_SCORE_THRESHOLD = 0.1

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

export default function BroadcasterDashboard() {
  const router = useRouter()
  const [eventId, setEventId] = useState<string | null>(null)
  const [identity, setIdentity] = useState('bcast-8x585u')
  const [connection, setConnection] = useState<{ token: string; url: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [joinError, setJoinError] = useState('')
  const isJoined = connection !== null
  const [selectedSport, setSelectedSport] = useState<Sport>('badminton')
  const [matches, setMatches] = useState<MatchState[]>([])
  const [assigningMatchId, setAssigningMatchId] = useState<string | null>(null)
  const [roster, setRoster] = useState<{ capturers: RosterParticipant[]; commentators: RosterParticipant[]; viewerCount: number }>({
    capturers: [],
    commentators: [],
    viewerCount: 0,
  })

  const [sportCounters, setSportCounters] = useState<Record<Sport, number>>({
    pickleball: 0,
    badminton: 0,
    football: 0,
  })
  const [ytPollingMatchId, setYtPollingMatchId] = useState<string | null>(null)
  const ytPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
        subtitle="Enter the event ID to manage matches and go live."
        accentIcon={<Radio size={20} color="#60a5fa" />}
        accentBg="bg-blue-500/20"
        accentBorder="border-blue-500/40"
        onSubmit={(id) => setEventId(id)}
      />
    )
  }

  const handleAddMatch = async () => {
    const nextSportNumber = sportCounters[selectedSport] + 1
    const name = `${SPORT_LABELS[selectedSport]} Match ${nextSportNumber}`
    try {
      const created = await createMatch({ eventId, sport: selectedSport, name })
      setSportCounters(prev => ({ ...prev, [selectedSport]: nextSportNumber }))
      setMatches(prev => [
        ...prev,
        {
          id: created.id,
          sport: selectedSport,
          name: created.name,
          liveStatus: created.liveStatus as MatchLiveStatus,
          liveCapturerIdentities: created.liveCapturerIdentities ?? [],
          liveCommentatorIdentities: created.liveCommentatorIdentities ?? [],
          ytWhipUrl: created.ytWhipUrl,
          ytLiveUrl: created.ytLiveUrl,
          audioOn: true,
          commentaryMuted: false,
          winner: null,
          racketScore: selectedSport === 'football' ? undefined : createRacketScore(selectedSport),
          footballScore: selectedSport === 'football' ? createFootballScore() : undefined,
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
      applyLiveSelection(matchId, { liveCapturerIdentities: [...(matches.find(m => m.id === matchId)?.liveCapturerIdentities || []), capturerIdentity] })
      return
    }
    const current = matches.find(m => m.liveCapturerIdentities?.includes(capturerIdentity))
    if (current) applyLiveSelection(current.id, { liveCapturerIdentities: current.liveCapturerIdentities.filter(id => id !== capturerIdentity) })
  }

  const assignCommentatorToMatch = (commentatorIdentity: string, matchId: string | null) => {
    if (matchId) {
      applyLiveSelection(matchId, { liveCommentatorIdentities: [...(matches.find(m => m.id === matchId)?.liveCommentatorIdentities || []), commentatorIdentity] })
      return
    }
    const current = matches.find(m => m.liveCommentatorIdentities?.includes(commentatorIdentity))
    if (current) applyLiveSelection(current.id, { liveCommentatorIdentities: current.liveCommentatorIdentities.filter(id => id !== commentatorIdentity) })
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

  const toggleAudio = (id: string) => {
    updateMatch(id, m => ({ ...m, audioOn: !m.audioOn }))
  }

  const toggleCommentaryMute = (id: string) => {
    updateMatch(id, m => ({ ...m, commentaryMuted: !m.commentaryMuted }))
  }

  const renameMatch = (id: string, name: string) => {
    updateMatch(id, m => ({ ...m, name }))
  }

  const handleYoutubeStart = async (matchId: string) => {
    try {
      setYtPollingMatchId(matchId)
      const authUrl = await getYoutubeAuthUrl(matchId)
      await WebBrowser.openBrowserAsync(authUrl)
      // Poll for ytLiveUrl after browser is dismissed
      let attempts = 0
      ytPollRef.current = setInterval(async () => {
        attempts++
        try {
          const updated = await getMatch(matchId)
          if (updated.ytLiveUrl) {
            updateMatch(matchId, m => ({ ...m, ytWhipUrl: updated.ytWhipUrl, ytLiveUrl: updated.ytLiveUrl }))
            clearInterval(ytPollRef.current!)
            ytPollRef.current = null
            setYtPollingMatchId(null)
          }
        } catch (pollErr: any) {
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
      updateMatch(matchId, m => ({ ...m, ytWhipUrl: updated.ytWhipUrl, ytLiveUrl: updated.ytLiveUrl }))
    } catch (err: any) {
      setJoinError(err.response?.data?.message ?? 'Could not stop YouTube stream.')
    }
  }

  const autoSwitch = useCallback(async (matchId: string, capturerIdentity: string) => {
    try {
      await setMatchLiveSelection(matchId, { liveCapturerIdentities: [...(matches.find(m => m.id === matchId)?.liveCapturerIdentities || []), capturerIdentity] })
      updateMatch(matchId, m => ({ ...m, liveCapturerIdentities: [...(m.liveCapturerIdentities || []), capturerIdentity] }))
    } catch {}
  }, [])

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
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 48 }}>
      <View className="px-6 mt-8">
        <Text className="text-black text-3xl font-bold">Broadcaster</Text>
        <Text className="text-gray-500 text-sm mt-1">
          Group capturers into matches, pick which feed goes live per match, and control each match's scoreboard.
        </Text>
      </View>

      <View className="px-6 mt-6 flex-row gap-3">
        <View className="flex-1">
          <Text className="text-gray-500 text-xs mb-1">Identity</Text>
          <TextInput
            value={identity}
            onChangeText={setIdentity}
            editable={!isJoined}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
          />
        </View>
        <View className="flex-1">
          <Text className="text-gray-500 text-xs mb-1">Event</Text>
          <View className="border border-gray-200 rounded-lg px-3 py-2">
            <Text className="text-sm text-gray-800 font-semibold">{eventId}</Text>
          </View>
        </View>
      </View>

      {joinError !== '' && (
        <View className="mx-6 mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex-row items-center gap-2">
          <AlertTriangle size={14} color="#dc2626" />
          <Text className="text-red-600 text-xs font-semibold flex-1">{joinError}</Text>
        </View>
      )}

      <View className="px-6 mt-4">
        <Text className="text-gray-500 text-xs mb-1">Sport</Text>
        <View className="flex-row gap-2">
          {(Object.keys(SPORT_LABELS) as Sport[]).map(sport => {
            const isActive = selectedSport === sport
            return (
              <Pressable
                key={sport}
                onPress={() => setSelectedSport(sport)}
                className={`flex-1 rounded-lg px-3 py-2.5 items-center border ${
                  isActive ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  {SPORT_LABELS[sport]}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Text className="text-gray-400 text-xs mt-1">
          New matches added below will use the {SPORT_LABELS[selectedSport]} scoreboard. This will be{' '}
          {SPORT_LABELS[selectedSport]} Match {sportCounters[selectedSport] + 1}.
        </Text>
      </View>

      <View className="px-6 mt-4 flex-row items-center gap-3">
        {isJoined ? (
          <>
            <Pressable
              onPress={() => {
                setConnection(null)
                setMatches([])
                setSportCounters({ pickleball: 0, badminton: 0, football: 0 })
              }}
              className="bg-red-600 rounded-xl px-5 py-2.5"
            >
              <Text className="text-white font-semibold text-sm">Disconnect</Text>
            </Pressable>

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
        ) : (
          <Pressable
            disabled={connecting}
            onPress={async () => {
              setJoinError('')
              setConnecting(true)
              try {
                const result = await fetchLiveKitToken(identity, eventId, 'broadcaster')
                setConnection(result)
              } catch (err: any) {
                setJoinError(err.response?.data?.message ?? 'Could not join as broadcaster.')
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
          onDisconnected={() => setConnection(null)}
          onError={(err) => setJoinError(err.message)}
        >
          <BroadcasterLobbies
            matches={matches}
            busy={assigningMatchId !== null}
            onAssignCapturer={assignCapturerToMatch}
            onAssignCommentator={assignCommentatorToMatch}
            onRosterChange={(capturers, commentators, viewerCount) => setRoster({ capturers, commentators, viewerCount })}
          />
          {/* Manages one WHIP → YouTube connection per match that has ytWhipUrl set */}
          <BroadcasterWhipManager matches={matches} />
          {/* Auto-switches live capturer based on ball detection */}
          <AutoDirector matches={matches} onSwitch={autoSwitch} />
        </LiveKitRoom>
      )}

      {isJoined && (
        <View className="px-6 mt-4 gap-4">

          {matches.length === 0 ? (
            <Text className="text-center text-gray-400 text-sm mt-2">
              No matches yet. Pick a sport above and click <Text className="font-bold text-gray-600">Add match</Text> to create one.
            </Text>
          ) : (
            matches.map(match => {
              const { nameA, nameB } = getNames(match)
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
                      {isEnded
                        ? match.winner
                          ? `${match.winner === 'A' ? nameA : nameB} won`
                          : 'ended'
                        : (match.liveCapturerIdentities?.[0] ?? null)
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

                  {/* Live participant counts for this match */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <MatchStatChip label="Capturer" icon={<Video size={12} color="#2563eb" />} count={(match.liveCapturerIdentities && match.liveCapturerIdentities.length > 0) ? 1 : 0} color="#2563eb" />
                    <MatchStatChip label="Commentator" icon={<Mic size={12} color="#7c3aed" />} count={(match.liveCommentatorIdentities && match.liveCommentatorIdentities.length > 0) ? 1 : 0} color="#7c3aed" />
                    <MatchStatChip label="Viewers" icon={<Eye size={12} color="#059669" />} count={(match.liveCapturerIdentities && match.liveCapturerIdentities.length > 0) ? roster.viewerCount : 0} color="#059669" />
                  </View>

                  {/* YouTube Live — full-width row so it's always visible on phone screens */}
                  {!isEnded && (
                    <Pressable
                      onPress={() =>
                        match.ytLiveUrl
                          ? handleYoutubeStop(match.id)
                          : handleYoutubeStart(match.id)
                      }
                      disabled={ytPollingMatchId === match.id}
                      className={`rounded-xl px-4 py-3 flex-row items-center justify-center gap-2 ${
                        match.ytLiveUrl
                          ? 'bg-red-600'
                          : 'bg-gray-900'
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
                      <View className="border border-gray-200 rounded-xl p-4 gap-2">
                        <View className="flex-row items-center gap-2">
                          <Video size={14} color="#111" />
                          <Text className="text-black text-sm font-semibold">
                            {(match.liveCapturerIdentities && match.liveCapturerIdentities.length > 0) ? `Camera live: ${match.liveCapturerIdentities.length}`
                              : 'No capturer assigned'}
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <Mic size={14} color="#111" />
                            <Text className="text-black text-sm font-semibold">
                              {(match.liveCommentatorIdentities?.[0])
                                ? `Commentary live: ${roster.commentators.find(p => p.identity === match.liveCommentatorIdentities?.[0])?.name || match.liveCommentatorIdentities?.[0]}`
                                : 'No commentator assigned'}
                            </Text>
                          </View>
                          {(match.liveCommentatorIdentities?.[0] ?? null) && (
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
                                {match.commentaryMuted ? 'Unmute' : 'Mute'}
                              </Text>
                            </Pressable>
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

    </ScrollView>
  )
}

type WhipSession = {
  pc: any
  videoSender: any
  audioSender: any
}

/**
 * Invisible component (renders null) that lives inside LiveKitRoom.
 * For every match that has ytWhipUrl set, it opens one WebRTC WHIP connection
 * to YouTube and forwards the capturer's video + commentator's (or capturer's) audio.
 * Uses replaceTrack() when the assigned capturer/commentator changes.
 * Closes the connection when ytWhipUrl is cleared (match ended or YT stopped).
 */
function BroadcasterWhipManager({ matches }: { matches: MatchState[] }) {
  const allTracks = useTracks([Track.Source.Camera, Track.Source.Microphone])
  const sessionsRef = useRef<Map<string, WhipSession>>(new Map())

  const getVideoMST = (capturerIdentity: string | null): any => {
    if (!capturerIdentity) return null
    const ref = allTracks.find(
      t => t.participant.identity === capturerIdentity && t.source === Track.Source.Camera,
    )
    return (ref?.publication?.track as any)?.mediaStreamTrack ?? null
  }

  const getAudioMST = (commentatorIdentity: string | null, capturerIdentity: string | null): any => {
    const identity = commentatorIdentity || capturerIdentity
    if (!identity) return null
    const ref = allTracks.find(
      t => t.participant.identity === identity && t.source === Track.Source.Microphone,
    )
    return (ref?.publication?.track as any)?.mediaStreamTrack ?? null
  }

  // Derived key — changes when any match gains/loses a ytWhipUrl
  const ytKey = matches.map(m => `${m.id}=${m.ytWhipUrl ?? ''}`).join('|')

  // Open / close WHIP sessions as ytWhipUrl appears or disappears per match
  useEffect(() => {
    const desired = new Map(
      matches
        .filter(m => m.ytWhipUrl && m.liveStatus !== 'ended')
        .map(m => [m.id, m]),
    )

    // Close sessions that are no longer needed
    for (const [id, session] of sessionsRef.current.entries()) {
      if (!desired.has(id)) {
        try { session.pc.close() } catch {}
        sessionsRef.current.delete(id)
      }
    }

    // Open sessions for newly active matches
    for (const [id, match] of desired.entries()) {
      if (!sessionsRef.current.has(id)) {
        void openSession(match)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytKey])

  // Replace tracks whenever the capturer/commentator assignment or the available tracks change
  const assignKey = matches
    .map(m => `${m.id}:${m.liveCapturerIdentities?.join(",") ?? ""}:${m.liveCommentatorIdentities?.join(",") ?? ""}`)
    .join('|')

  useEffect(() => {
    for (const match of matches) {
      const session = sessionsRef.current.get(match.id)
      if (!session) continue
      try {
        session.videoSender.replaceTrack(getVideoMST(match.liveCapturerIdentities?.[0] ?? null))
        session.audioSender.replaceTrack(getAudioMST(match.liveCommentatorIdentities?.[0] ?? null, match.liveCapturerIdentities?.[0] ?? null))
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTracks, assignKey])

  async function openSession(match: MatchState) {
    try {
      const RTCPeerConnection = (globalThis as any).RTCPeerConnection
      const RTCSessionDescription = (globalThis as any).RTCSessionDescription

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })

      // sendonly transceivers — no track initially = black screen / silent audio
      const videoTx = pc.addTransceiver('video', { direction: 'sendonly' })
      const audioTx = pc.addTransceiver('audio', { direction: 'sendonly' })

      // Wire up tracks if capturer/commentator already assigned when stream starts
      const videoMST = getVideoMST(match.liveCapturerIdentities?.[0] ?? null)
      const audioMST = getAudioMST(match.liveCommentatorIdentities?.[0] ?? null, match.liveCapturerIdentities?.[0] ?? null)
      if (videoMST) videoTx.sender.replaceTrack(videoMST)
      if (audioMST) audioTx.sender.replaceTrack(audioMST)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // WHIP handshake: POST SDP offer, receive SDP answer from YouTube
      const res = await fetch(match.ytWhipUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })
      if (!res.ok) throw new Error(`WHIP ${res.status}`)
      const answerSdp = await res.text()
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }))

      sessionsRef.current.set(match.id, {
        pc,
        videoSender: videoTx.sender,
        audioSender: audioTx.sender,
      })
    } catch (err) {
      // Session will be retried next time ytKey changes (e.g. user clicks YT button again)
    }
  }

  // Cleanup all connections when broadcaster disconnects
  useEffect(() => () => {
    for (const s of sessionsRef.current.values()) {
      try { s.pc.close() } catch {}
    }
    sessionsRef.current.clear()
  }, [])

  return null
}

function AutoDirector({
  matches,
  onSwitch,
}: {
  matches: MatchState[]
  onSwitch: (matchId: string, capturerIdentity: string) => void
}) {
  const participants = useRemoteParticipants()
  const cameraTracks = useTracks([Track.Source.Camera])
  const capturers = participants.filter(p => parseParticipantRole(p.metadata) === 'capturer')

  const viewShotRefs = useRef<Map<string, any>>(new Map())
  const lastWinnerRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(async () => {
      const activeMatches = matches.filter(m => m.liveStatus !== 'ended')
      if (activeMatches.length === 0 || capturers.length < 2) return

      const form = new FormData()
      let frameCount = 0

      for (const capturer of capturers) {
        const ref = viewShotRefs.current.get(capturer.identity)
        if (!ref) continue
        try {
          const uri = await captureRef(ref, { format: 'jpg', quality: 0.5 })
          form.append(capturer.identity, { uri, type: 'image/jpeg', name: 'frame.jpg' } as any)
          frameCount++
        } catch {}
      }

      if (frameCount < 2) return

      form.append('sport', activeMatches[0].sport)

      try {
        const res = await fetch(`${DETECTOR_URL}/analyze`, { method: 'POST', body: form })
        if (!res.ok) return
        const data = await res.json()

        const winner: string | null = data.bestCamera
        const score: number = winner ? (data.scores[winner] ?? 0) : 0

        if (!winner || score < DETECTOR_SCORE_THRESHOLD) {
          lastWinnerRef.current = null
          return
        }

        // Only switch if same capturer wins 2 cycles in a row (prevents flickering)
        if (winner === lastWinnerRef.current) {
          for (const match of activeMatches) {
            if (!(match.liveCapturerIdentities?.includes(winner))) {
              onSwitch(match.id, winner)
            }
          }
        }

        lastWinnerRef.current = winner
      } catch {}
    }, ANALYSIS_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [capturers, matches, onSwitch])

  // Hidden off-screen VideoTrack views — rendered so native video is active, but invisible to user
  return (
    <View style={{ position: 'absolute', left: -9999, top: 0 }}>
      {capturers.map(capturer => {
        const trackRef = cameraTracks.find(t => t.participant.identity === capturer.identity)
        if (!trackRef) return null
        return (
          <ViewShot
            key={capturer.identity}
            ref={(ref: any) => {
              if (ref) viewShotRefs.current.set(capturer.identity, ref)
              else viewShotRefs.current.delete(capturer.identity)
            }}
            style={{ width: 160, height: 90 }}
          >
            <VideoTrack trackRef={trackRef} style={{ width: 160, height: 90 }} />
          </ViewShot>
        )
      })}
    </View>
  )
}

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '900', color }}>{count}</Text>
      <Text style={{ fontSize: 10, fontWeight: '600', color: '#6b7280', textAlign: 'center', marginTop: 2 }}>{label}</Text>
    </View>
  )
}

function MatchStatChip({ label, icon, count, color }: { label: string; icon: React.ReactNode; count: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
      {icon}
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '900', color }}>{count}</Text>
    </View>
  )
}


function BroadcasterLobbies({
  matches,
  busy,
  onAssignCapturer,
  onAssignCommentator,
  onRosterChange,
}: {
  matches: MatchState[]
  busy: boolean
  onAssignCapturer: (capturerIdentity: string, matchId: string | null) => void
  onAssignCommentator: (commentatorIdentity: string, matchId: string | null) => void
  onRosterChange: (capturers: RosterParticipant[], commentators: RosterParticipant[], viewerCount: number) => void
}) {
  const participants = useRemoteParticipants()
  const cameraTracks = useTracks([Track.Source.Camera])

  const capturers = participants.filter((p) => parseParticipantRole(p.metadata) === 'capturer')
  const commentators = participants.filter((p) => parseParticipantRole(p.metadata) === 'commentator')
  const viewers = participants.filter((p) => parseParticipantRole(p.metadata) === 'viewer')
  const assignableMatches = matches.filter((m) => m.liveStatus !== 'ended')

  useEffect(() => {
    onRosterChange(
      capturers.map((p) => ({ identity: p.identity, name: p.name })),
      commentators.map((p) => ({ identity: p.identity, name: p.name })),
      viewers.length,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants])

  return (
    <View style={{ paddingHorizontal: 24, marginTop: 24, gap: 16 }}>
      {/* ── Total active counts ── */}
      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 12 }}>
        <StatPill label="Capturers" count={capturers.length} color="#2563eb" />
        <StatPill label="Commentators" count={commentators.length} color="#7c3aed" />
        <StatPill label="Viewers" count={viewers.length} color="#059669" />
      </View>

      <View className="border border-gray-200 rounded-xl p-4">
        <View className="flex-row items-center gap-2 mb-1">
          <Video size={16} color="#111" />
          <Text className="text-black font-semibold text-base">Camera lobby</Text>
        </View>
        <Text className="text-gray-400 text-xs mb-3">Connected capturer feeds. Assign each one to a match.</Text>
        {capturers.length === 0 ? (
          <View className="border border-gray-100 rounded-lg py-4 items-center">
            <Text className="text-gray-400 text-sm">No capturers connected.</Text>
          </View>
        ) : (
          <View className="gap-2">
            {capturers.map((p) => {
              const trackRef = cameraTracks.find((t) => t.participant.identity === p.identity)
              const assignedMatch = matches.find((m) => m.liveCapturerIdentities?.includes(p.identity))
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
                    </View>
                  </View>
                  <MatchAssignDropdown
                    matches={assignableMatches}
                    selectedMatchId={assignedMatch?.id ?? null}
                    disabled={busy}
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
              const assignedMatch = matches.find((m) => m.liveCommentatorIdentities?.includes(p.identity))
              return (
                <View key={p.identity} className="border border-gray-200 rounded-lg p-3 gap-3">
                  <View className="flex-1">
                    <Text className="text-black font-semibold text-sm">{p.name || p.identity}</Text>
                    <Text className="text-gray-400 text-xs">{p.identity}</Text>
                  </View>
                  <MatchAssignDropdown
                    matches={assignableMatches}
                    selectedMatchId={assignedMatch?.id ?? null}
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
  )
}

function MatchAssignDropdown({
  matches,
  selectedMatchId,
  disabled,
  onSelect,
}: {
  matches: MatchState[]
  selectedMatchId: string | null
  disabled?: boolean
  onSelect: (matchId: string | null) => void
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
          {selectedMatch ? selectedMatch.name : 'Assign to…'}
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

const CLOCK_STATUS_LABEL: Record<FootballClockStatus, string> = {
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
            {CLOCK_STATUS_LABEL[score.status]} · {score.minute}'
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
