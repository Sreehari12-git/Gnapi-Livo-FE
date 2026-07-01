import { View, Text, Pressable, TextInput, ScrollView } from 'react-native'
import { useState } from 'react'
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
} from 'lucide-react-native'

type Sport = 'pickleball' | 'badminton' | 'football'
type Side = 'A' | 'B'

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

type MatchStatus = 'not_started' | 'live' | 'half_time' | 'ended'

interface FootballScoreState {
  nameA: string
  nameB: string
  goalsA: number
  goalsB: number
  status: MatchStatus
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
  id: number
  sport: Sport
  sportMatchNumber: number
  name: string
  audioOn: boolean
  commentaryMuted: boolean
  winner: Side | null
  racketScore?: RacketScoreState
  footballScore?: FootballScoreState
}

const createMatch = (id: number, sport: Sport, sportMatchNumber: number): MatchState => ({
  id,
  sport,
  sportMatchNumber,
  name: `${SPORT_LABELS[sport]} Match ${sportMatchNumber}`,
  audioOn: true,
  commentaryMuted: false,
  winner: null,
  racketScore: sport === 'football' ? undefined : createRacketScore(sport),
  footballScore: sport === 'football' ? createFootballScore() : undefined,
})

export default function BroadcasterDashboard() {
  const router = useRouter()
  const [identity] = useState('bcast-8x585u')
  const [room] = useState('live-switch')
  const [isJoined, setIsJoined] = useState(false)
  const [selectedSport, setSelectedSport] = useState<Sport>('badminton')
  const [matches, setMatches] = useState<MatchState[]>([])
  const [nextId, setNextId] = useState(1)

  const [sportCounters, setSportCounters] = useState<Record<Sport, number>>({
    pickleball: 0,
    badminton: 0,
    football: 0,
  })

  const handleAddMatch = () => {
    const nextSportNumber = sportCounters[selectedSport] + 1
    setSportCounters(prev => ({ ...prev, [selectedSport]: nextSportNumber }))
    setMatches(prev => [...prev, createMatch(nextId, selectedSport, nextSportNumber)])
    setNextId(id => id + 1)
  }

  const removeMatch = (id: number) => {
    setMatches(prev => prev.filter(m => m.id !== id))
  }

  const updateMatch = (id: number, updater: (m: MatchState) => MatchState) => {
    setMatches(prev => prev.map(m => (m.id === id ? updater(m) : m)))
  }

  const updateRacketScore = (id: number, updater: (s: RacketScoreState) => RacketScoreState) => {
    updateMatch(id, m => (m.racketScore ? { ...m, racketScore: updater(m.racketScore) } : m))
  }

  const updateFootballScore = (id: number, updater: (s: FootballScoreState) => FootballScoreState) => {
    updateMatch(id, m => (m.footballScore ? { ...m, footballScore: updater(m.footballScore) } : m))
  }

  const addPoint = (id: number, side: Side) => {
    updateRacketScore(id, s => ({
      ...s,
      pointsA: side === 'A' ? s.pointsA + 1 : s.pointsA,
      pointsB: side === 'B' ? s.pointsB + 1 : s.pointsB,
    }))
  }

  const subtractPoint = (id: number, side: Side) => {
    updateRacketScore(id, s => ({
      ...s,
      pointsA: side === 'A' ? Math.max(0, s.pointsA - 1) : s.pointsA,
      pointsB: side === 'B' ? Math.max(0, s.pointsB - 1) : s.pointsB,
    }))
  }

  const winGame = (id: number, side: Side) => {
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

  const swapServer = (id: number) => {
    updateRacketScore(id, s => ({ ...s, server: s.server === 'A' ? 'B' : 'A' }))
  }

  const toggleRacketVisible = (id: number) => {
    updateRacketScore(id, s => ({ ...s, visible: !s.visible }))
  }

  const resetRacketScore = (id: number, sport: 'badminton' | 'pickleball') => {
    updateRacketScore(id, () => createRacketScore(sport))
  }

  const renameRacketPlayer = (id: number, side: Side, name: string) => {
    updateRacketScore(id, s => ({
      ...s,
      nameA: side === 'A' ? name : s.nameA,
      nameB: side === 'B' ? name : s.nameB,
    }))
  }

  const addGoal = (id: number, side: Side) => {
    updateFootballScore(id, s => ({
      ...s,
      goalsA: side === 'A' ? s.goalsA + 1 : s.goalsA,
      goalsB: side === 'B' ? s.goalsB + 1 : s.goalsB,
    }))
  }

  const subtractGoal = (id: number, side: Side) => {
    updateFootballScore(id, s => ({
      ...s,
      goalsA: side === 'A' ? Math.max(0, s.goalsA - 1) : s.goalsA,
      goalsB: side === 'B' ? Math.max(0, s.goalsB - 1) : s.goalsB,
    }))
  }

  const setMatchStatus = (id: number, status: MatchStatus) => {
    updateFootballScore(id, s => ({ ...s, status }))
  }

  const incrementMinute = (id: number) => {
    updateFootballScore(id, s => ({ ...s, minute: s.minute + 1 }))
  }

  const toggleFootballVisible = (id: number) => {
    updateFootballScore(id, s => ({ ...s, visible: !s.visible }))
  }

  const resetFootballScore = (id: number) => {
    updateFootballScore(id, () => createFootballScore())
  }

  const renameFootballTeam = (id: number, side: Side, name: string) => {
    updateFootballScore(id, s => ({
      ...s,
      nameA: side === 'A' ? name : s.nameA,
      nameB: side === 'B' ? name : s.nameB,
    }))
  }

  const clearLive = (id: number) => {
    updateMatch(id, m => {
      if (m.sport === 'football') {
        return { ...m, winner: null, footballScore: createFootballScore() }
      }
      return { ...m, winner: null, racketScore: createRacketScore(m.sport as 'badminton' | 'pickleball') }
    })
  }

  const declareWinner = (id: number, side: Side) => {
    updateMatch(id, m => ({ ...m, winner: side }))
  }

  const toggleAudio = (id: number) => {
    updateMatch(id, m => ({ ...m, audioOn: !m.audioOn }))
  }

  const toggleCommentaryMute = (id: number) => {
    updateMatch(id, m => ({ ...m, commentaryMuted: !m.commentaryMuted }))
  }

  const renameMatch = (id: number, name: string) => {
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
      {/* <View className="px-6 pt-14 flex-row items-center justify-between">
        <Pressable onPress={() => router.push('/')} className="flex-row items-center gap-2">
          <ChevronLeft size={18} color="#6b7280" />
          <Text className="text-gray-500 text-sm">Back to dashboard</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/broadcaster')} className="flex-row items-center gap-1.5">
          <LogOut size={14} color="#9ca3af" />
          <Text className="text-gray-400 text-sm">Log out</Text>
        </Pressable>
      </View> */}

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
            editable={true}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
          />
        </View>
        <View className="flex-1">
          <Text className="text-gray-500 text-xs mb-1">Room</Text>
          <TextInput
            value={room}
            editable={true}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
          />
        </View>
      </View>

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
                setIsJoined(false)
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
                {matches.length} match(es) · 0 cam · 0 comm · 0 in lobby
              </Text>
            </View>
          </>
        ) : (
          <Pressable
            onPress={() => setIsJoined(true)}
            className="bg-gray-900 rounded-xl px-5 py-2.5"
          >
            <Text className="text-white font-semibold text-sm">Join as Broadcaster</Text>
          </Pressable>
        )}
      </View>

      {isJoined && (
        <View className="px-6 mt-6 gap-4">

          <View className="border border-gray-200 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-1">
              <Video size={16} color="#111" />
              <Text className="text-black font-semibold text-base">Camera lobby</Text>
            </View>
            <Text className="text-gray-400 text-xs mb-3">Unassigned capturer feeds. Assign each one to a match.</Text>
            <View className="border border-gray-100 rounded-lg py-4 items-center">
              <Text className="text-gray-400 text-sm">No unassigned capturers.</Text>
            </View>
          </View>

          <View className="border border-gray-200 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-1">
              <Mic size={16} color="#111" />
              <Text className="text-black font-semibold text-base">Commentator lobby</Text>
            </View>
            <Text className="text-gray-400 text-xs mb-3">Unassigned commentary audio feeds (optional per match).</Text>
            <View className="border border-gray-100 rounded-lg py-4 items-center">
              <Text className="text-gray-400 text-sm">No unassigned commentators.</Text>
            </View>
          </View>

          {matches.length === 0 ? (
            <Text className="text-center text-gray-400 text-sm mt-2">
              No matches yet. Pick a sport above and click <Text className="font-bold text-gray-600">Add match</Text> to create one.
            </Text>
          ) : (
            matches.map(match => {
              const { nameA, nameB } = getNames(match)
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
                      0 feed(s) · {match.winner ? `${match.winner === 'A' ? nameA : nameB} won` : 'no live feed'}
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

                  {match.winner ? (
                    <View className="border border-gray-100 rounded-lg py-6 items-center">
                      <Text className="text-black font-semibold text-base">
                        {match.winner === 'A' ? nameA : nameB} won the match
                      </Text>
                      <Text className="text-gray-400 text-xs mt-1">
                        Live feed stopped. Viewers are seeing the final result.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View className="border border-gray-100 rounded-lg py-4 items-center">
                        <Text className="text-gray-400 text-sm">Assign capturers from the lobby above.</Text>
                      </View>

                      <View className="border border-gray-200 rounded-xl p-4">
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center gap-2">
                            <Mic size={16} color="#111" />
                            <Text className="text-black font-semibold text-base">Commentary</Text>
                            <Text className="text-gray-400 text-xs">optional</Text>
                          </View>
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
                        </View>
                        <View className="border border-gray-100 rounded-lg py-4 items-center">
                          <Text className="text-gray-400 text-sm">
                            No commentator assigned. Assign one from the commentator lobby above.
                          </Text>
                        </View>
                      </View>

                      {match.sport === 'football' && match.footballScore ? (
                        <FootballScoreboard
                          matchId={match.id}
                          score={match.footballScore}
                          onAddGoal={addGoal}
                          onSubtractGoal={subtractGoal}
                          onSetStatus={setMatchStatus}
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
  matchId: number
  sport: 'badminton' | 'pickleball'
  score: RacketScoreState
  onAddPoint: (id: number, side: Side) => void
  onSubtractPoint: (id: number, side: Side) => void
  onWinGame: (id: number, side: Side) => void
  onSwapServer: (id: number) => void
  onToggleVisible: (id: number) => void
  onReset: (id: number, sport: 'badminton' | 'pickleball') => void
  onRenamePlayer: (id: number, side: Side, name: string) => void
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

const STATUS_LABEL: Record<MatchStatus, string> = {
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
  matchId: number
  score: FootballScoreState
  onAddGoal: (id: number, side: Side) => void
  onSubtractGoal: (id: number, side: Side) => void
  onSetStatus: (id: number, status: MatchStatus) => void
  onIncrementMinute: (id: number) => void
  onToggleVisible: (id: number) => void
  onReset: (id: number) => void
  onRenameTeam: (id: number, side: Side, name: string) => void
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

