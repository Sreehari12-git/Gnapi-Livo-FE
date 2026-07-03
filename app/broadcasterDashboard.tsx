import { View, Text, Pressable, TextInput, ScrollView } from 'react-native'
import { useEffect, useState } from 'react'
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
import { LiveKitRoom, useRemoteParticipants, useTracks, VideoTrack } from '@livekit/react-native'
import { Track } from 'livekit-client'
import { fetchLiveKitToken, parseParticipantRole } from './services/livekit'
import {
  createMatch,
  listMatches,
  updateMatch as updateMatchApi,
  deleteMatch as deleteMatchApi,
  setMatchLiveSelection,
} from './services/match'
import EventIdGate from './Eventidgate'

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
  liveCapturerIdentity: string | null
  liveCommentatorIdentity: string | null
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
  const [roster, setRoster] = useState<{ capturers: RosterParticipant[]; commentators: RosterParticipant[] }>({
    capturers: [],
    commentators: [],
  })

  const [sportCounters, setSportCounters] = useState<Record<Sport, number>>({
    pickleball: 0,
    badminton: 0,
    football: 0,
  })

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
          liveCapturerIdentity: sm.liveCapturerIdentity,
          liveCommentatorIdentity: sm.liveCommentatorIdentity,
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
          liveCapturerIdentity: created.liveCapturerIdentity,
          liveCommentatorIdentity: created.liveCommentatorIdentity,
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
    payload: { liveCapturerIdentity?: string | null; liveCommentatorIdentity?: string | null },
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
      applyLiveSelection(matchId, { liveCapturerIdentity: capturerIdentity })
      return
    }
    const current = matches.find(m => m.liveCapturerIdentity === capturerIdentity)
    if (current) applyLiveSelection(current.id, { liveCapturerIdentity: null })
  }

  const assignCommentatorToMatch = (commentatorIdentity: string, matchId: string | null) => {
    if (matchId) {
      applyLiveSelection(matchId, { liveCommentatorIdentity: commentatorIdentity })
      return
    }
    const current = matches.find(m => m.liveCommentatorIdentity === commentatorIdentity)
    if (current) applyLiveSelection(current.id, { liveCommentatorIdentity: null })
  }

  const clearLive = async (id: string) => {
    updateMatch(id, m => {
      if (m.sport === 'football') {
        return { ...m, winner: null, footballScore: createFootballScore() }
      }
      return { ...m, winner: null, racketScore: createRacketScore(m.sport as 'badminton' | 'pickleball') }
    })
    await applyLiveSelection(id, { liveCapturerIdentity: null, liveCommentatorIdentity: null })
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
        liveCapturerIdentity: updated.liveCapturerIdentity,
        liveCommentatorIdentity: updated.liveCommentatorIdentity,
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
            onRosterChange={(capturers, commentators) => setRoster({ capturers, commentators })}
          />
        </LiveKitRoom>
      )}

      {isJoined && (
        <View className="px-6 mt-6 gap-4">

          {matches.length === 0 ? (
            <Text className="text-center text-gray-400 text-sm mt-2">
              No matches yet. Pick a sport above and click <Text className="font-bold text-gray-600">Add match</Text> to create one.
            </Text>
          ) : (
            matches.map(match => {
              const { nameA, nameB } = getNames(match)
              const feedCount = (match.liveCapturerIdentity ? 1 : 0) + (match.liveCommentatorIdentity ? 1 : 0)
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
                        : match.liveCapturerIdentity
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
                            {match.liveCapturerIdentity
                              ? `Camera live: ${roster.capturers.find(p => p.identity === match.liveCapturerIdentity)?.name || match.liveCapturerIdentity}`
                              : 'No capturer assigned'}
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <Mic size={14} color="#111" />
                            <Text className="text-black text-sm font-semibold">
                              {match.liveCommentatorIdentity
                                ? `Commentary live: ${roster.commentators.find(p => p.identity === match.liveCommentatorIdentity)?.name || match.liveCommentatorIdentity}`
                                : 'No commentator assigned'}
                            </Text>
                          </View>
                          {match.liveCommentatorIdentity && (
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
  onRosterChange: (capturers: RosterParticipant[], commentators: RosterParticipant[]) => void
}) {
  const participants = useRemoteParticipants()
  const cameraTracks = useTracks([Track.Source.Camera])

  const capturers = participants.filter((p) => parseParticipantRole(p.metadata) === 'capturer')
  const commentators = participants.filter((p) => parseParticipantRole(p.metadata) === 'commentator')
  const assignableMatches = matches.filter((m) => m.liveStatus !== 'ended')

  useEffect(() => {
    onRosterChange(
      capturers.map((p) => ({ identity: p.identity, name: p.name })),
      commentators.map((p) => ({ identity: p.identity, name: p.name })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants])

  return (
    <View className="px-6 mt-6 gap-4">
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
              const assignedMatch = matches.find((m) => m.liveCapturerIdentity === p.identity)
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
              const assignedMatch = matches.find((m) => m.liveCommentatorIdentity === p.identity)
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
