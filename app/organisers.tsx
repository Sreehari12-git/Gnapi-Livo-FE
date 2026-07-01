import { View, Text, Pressable, TextInput, ScrollView } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
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
} from 'lucide-react-native'
import { adminLogin } from './services/auth'
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

function CapturerPanel() {
  const [eventId, setEventId] = useState<string | null>(null)
  const [identity, setIdentity] = useState('cam-aldmmy')
  const [room, setRoom] = useState('live-switch')
  const [isLive, setIsLive] = useState(false)
  const [camera, setCamera] = useState<'front' | 'back'>('front')

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

        <View className="flex-row items-center gap-3 flex-wrap">
          <Pressable
            onPress={() => setIsLive(!isLive)}
            className={`flex-row items-center gap-2 px-6 py-3 rounded-xl ${isLive ? 'bg-red-500 active:bg-red-600' : 'bg-white active:bg-white/80'}`}
          >
            {isLive ? (
              <Square size={14} color="#ffffff" fill="#ffffff" />
            ) : (
              <Circle size={14} color="#dc2626" fill="#dc2626" />
            )}
            <Text className={`font-black text-sm ${isLive ? 'text-white' : 'text-slate-900'}`}>
              {isLive ? 'Stop' : 'Go Live'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCamera(c => c === 'front' ? 'back' : 'front')}
            className="flex-row items-center gap-2 px-4 py-3 rounded-xl border border-white/15 bg-slate-800 active:bg-slate-700"
          >
            <RefreshCw size={15} color="rgba(255,255,255,0.8)" />
            <Text className="text-white/80 font-semibold text-sm">
              Switch to {camera === 'front' ? 'back' : 'front'} camera
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
          {!isLive ? (
            <View className="flex-1 items-center justify-center gap-3">
              <Camera size={44} color="rgba(255,255,255,0.25)" />
              <Text className="text-white/30 text-sm">Camera preview will appear here</Text>
              <Text className="text-white/20 text-xs">Tap Go Live to start streaming</Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center gap-2">
              <View className="flex-row items-center gap-2 bg-red-500/20 border border-red-500/40 px-4 py-2 rounded-full">
                <View className="w-2 h-2 rounded-full bg-red-500" />
                <Text className="text-red-400 font-bold text-sm">LIVE · {camera} camera</Text>
              </View>
              <Text className="text-white/20 text-xs mt-2">Streaming to room: {room}</Text>
            </View>
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

function CommentatorPanel() {
  const [eventId, setEventId] = useState<string | null>(null)
  const [identity, setIdentity] = useState('comm-jc2o4g')
  const [displayName, setDisplayName] = useState('Commentator')
  const [room, setRoom] = useState('live-switch')
  const [isLive, setIsLive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [micLevel, setMicLevel] = useState(0)

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
            {isLive ? (isMuted ? 'MUTED' : 'ON AIR') : 'IDLE'}
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

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => {
              setIsLive(!isLive)
              setIsMuted(false)
              setMicLevel(isLive ? 0 : 72)
            }}
            className={`flex-row items-center gap-2 px-6 py-3 rounded-xl ${isLive ? 'bg-red-500 active:bg-red-600' : 'bg-white active:bg-white/80'}`}
          >
            {isLive ? (
              <Square size={14} color="#ffffff" fill="#ffffff" />
            ) : (
              <Circle size={14} color="#dc2626" fill="#dc2626" />
            )}
            <Text className={`font-black text-sm ${isLive ? 'text-white' : 'text-slate-900'}`}>
              {isLive ? 'Stop' : 'Go Live'}
            </Text>
          </Pressable>

          {isLive && (
            <Pressable
              onPress={() => {
                setIsMuted(!isMuted)
                setMicLevel(isMuted ? 72 : 0)
              }}
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
          )}

          <View className="flex-row items-center gap-2 px-3 py-2 rounded-full bg-slate-800 border border-white/10">
            <View className={`w-2 h-2 rounded-full ${
              isLive && !isMuted ? 'bg-red-500' :
              isLive && isMuted  ? 'bg-orange-400' :
              'bg-slate-500'
            }`} />
            <Text className="text-white/40 text-xs">
              {isLive ? (isMuted ? 'muted' : 'on air') : 'idle'}
            </Text>
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
              <Text className="text-white/40 text-sm">{micLevel}%</Text>
            )}
          </View>
          <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <View
              className={`h-2 rounded-full ${
                isMuted ? 'bg-orange-400' :
                micLevel > 80 ? 'bg-red-500' :
                micLevel > 40 ? 'bg-yellow-400' :
                'bg-emerald-500'
              }`}
              style={{ width: `${micLevel}%` }}
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
              {isLive && isMuted && <MicOff size={13} color="#fb923c" />}
              {isLive && !isMuted && (
                <Circle size={9} color="#f87171" fill="#f87171" />
              )}
              {!isLive && (
                <Circle size={9} color="rgba(255,255,255,0.4)" fill="rgba(255,255,255,0.4)" />
              )}
              <Text className={`font-bold text-sm ${
                isLive && !isMuted ? 'text-red-400' :
                isLive && isMuted  ? 'text-orange-400' :
                'text-white/40'
              }`}>
                {isLive ? (isMuted ? 'Muted' : 'On Air') : 'Idle'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}


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


function BroadcasterPanel() {
  const [eventId, setEventId] = useState<string | null>(null)

  const [identity, setIdentity] = useState('bcast-8x585u')
  const [room, setRoom] = useState('live-switch')
  const [isJoined, setIsJoined] = useState(false)
  const [selectedSport, setSelectedSport] = useState<Sport>('badminton')
  const [matches, setMatches] = useState<MatchState[]>([])
  const [nextId, setNextId] = useState(1)

  const [sportCounters, setSportCounters] = useState<Record<Sport, number>>({
    pickleball: 0,
    badminton: 0,
    football: 0,
  })

  if (!eventId) {
    return (
      <EventIdGate
        title="Broadcaster"
        subtitle="Enter the event ID to open director controls."
        accentIcon={<Radio size={20} color="#facc15" />}
        accentBg="bg-yellow-400/20"
        accentBorder="border-yellow-400/40"
        onSubmit={(id) => {
          setEventId(id)
          setRoom(id)
        }}
      />
    )
  }

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
          <View className="w-10 h-10 rounded-xl bg-yellow-400/20 border border-yellow-400/40 items-center justify-center">
            <Radio size={20} color="#facc15" />
          </View>
          <Text className="text-white text-3xl font-black">Broadcaster</Text>
        </View>
        <Text className="text-white/50 text-sm ml-1 mt-1">
          Group capturers into matches, pick which feed goes live per match, and control each match's scoreboard.
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
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
            />
          </View>
          <View className="flex-1">
            <Text className="text-gray-500 text-xs mb-1">Room</Text>
            <TextInput
              value={room}
              onChangeText={setRoom}
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
          <View className="px-6 mt-6 pb-6 gap-4">

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
      </View>
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

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >

        <View style={{ display: activeTab === 'capturer' ? 'flex' : 'none' }}>
          <CapturerPanel />
        </View>
        <View style={{ display: activeTab === 'commentator' ? 'flex' : 'none' }}>
          <CommentatorPanel />
        </View>
        <View style={{ display: activeTab === 'broadcaster' ? 'flex' : 'none' }}>
          <BroadcasterPanel />
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
                onPress={() => setActiveTab(tab.key)}
                className="flex-1 items-center py-1.5 active:opacity-60"
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
